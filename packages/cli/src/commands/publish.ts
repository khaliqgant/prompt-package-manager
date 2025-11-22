/**
 * Publish command implementation
 */

import { Command } from 'commander';
import { readFile, stat, mkdir, rm } from 'fs/promises';
import { join, basename } from 'path';
import { createReadStream } from 'fs';
import * as tar from 'tar';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { telemetry } from '../core/telemetry';
import type { PackageManifest, PackageFileMetadata, MultiPackageManifest, Manifest } from '../types/registry';
import { CLIError } from '../core/errors';
import {
  marketplaceToManifest,
  validateMarketplaceJson,
  type MarketplaceJson,
} from '../core/marketplace-converter';
import { validateManifestSchema } from '../core/schema-validator';
import { extractLicenseInfo, validateLicenseInfo } from '../utils/license-extractor';
import { extractSnippet, validateSnippet } from '../utils/snippet-extractor';
import { executePrepublishOnly } from '../utils/script-executor';
import { validatePackageFiles } from '../utils/format-file-validator';

interface PublishOptions {
  access?: 'public' | 'private';
  tag?: string;
  dryRun?: boolean;
  package?: string; // Filter to specific package name in multi-package repos
  collection?: string; // Filter to specific collection name in multi-collection repos
}

interface CollectionManifest {
  id: string;
  name: string;
  description: string;
  version?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  packages: Array<{
    packageId: string;
    version?: string;
    required?: boolean;
    reason?: string;
  }>;
}

/**
 * Try to find and load manifest files
 * Checks for:
 * 1. prpm.json (native format) - returns single manifest or array of packages and collections
 * 2. .claude/marketplace.json (Claude format) - returns all plugins as separate manifests
 * 3. .claude-plugin/marketplace.json (Claude format - alternative location) - returns all plugins
 */
async function findAndLoadManifests(): Promise<{ manifests: PackageManifest[]; collections: CollectionManifest[]; source: string }> {
  // Try prpm.json first (native format)
  const prpmJsonPath = join(process.cwd(), 'prpm.json');
  let prpmJsonExists = false;
  let prpmJsonError: Error | null = null;

  try {
    const content = await readFile(prpmJsonPath, 'utf-8');
    prpmJsonExists = true; // Mark file as found after successful read
    const manifest = JSON.parse(content) as Manifest;

    // Extract collections if present
    const collections: CollectionManifest[] = [];
    if ('collections' in manifest && Array.isArray((manifest as any).collections)) {
      const rawCollections = (manifest as any).collections;
      collections.push(...rawCollections);
    }

    // Check if this is a multi-package manifest
    if ('packages' in manifest && Array.isArray(manifest.packages)) {
      const multiManifest = manifest as MultiPackageManifest;

      // Validate each package in the array
      const validatedManifests = multiManifest.packages.map((pkg, idx) => {
        // Inherit top-level fields if not specified in package - using explicit undefined checks
        const packageWithDefaults: PackageManifest = {
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          format: pkg.format,
          files: pkg.files,
          author: pkg.author ?? multiManifest.author,
          license: pkg.license ?? multiManifest.license,
          repository: pkg.repository ?? multiManifest.repository,
          homepage: pkg.homepage ?? multiManifest.homepage,
          documentation: pkg.documentation ?? multiManifest.documentation,
          organization: pkg.organization ?? multiManifest.organization,
          private: pkg.private ?? multiManifest.private,
          tags: pkg.tags ?? multiManifest.tags,
          keywords: pkg.keywords ?? multiManifest.keywords,
          subtype: pkg.subtype,
          dependencies: pkg.dependencies,
          peerDependencies: pkg.peerDependencies,
          engines: pkg.engines,
          main: pkg.main,
        };
        const label = pkg.name || `package #${idx + 1}`;
        return validateManifest(packageWithDefaults, label);
      });

      return { manifests: validatedManifests, collections, source: 'prpm.json (multi-package)' };
    }

    // Collections-only manifest (no packages)
    if (collections.length > 0) {
      return { manifests: [], collections, source: 'prpm.json (collections-only)' };
    }

    // Single package manifest
    const validated = validateManifest(manifest as PackageManifest, (manifest as PackageManifest).name);
    return { manifests: [validated], collections, source: 'prpm.json' };
  } catch (error) {
    // Store error for later
    prpmJsonError = error as Error;

    // If it's a validation or parsing error, throw it immediately (don't try marketplace.json)
    if (prpmJsonExists && error instanceof Error && (
      error.message.includes('Invalid JSON') ||
      error.message.includes('Manifest validation failed') ||
      error.message.includes('Claude skill') ||
      error.message.includes('SKILL.md')
    )) {
      throw error;
    }
    // Otherwise, prpm.json not found or other error, try marketplace.json
  }

  // Try .claude/marketplace.json (Claude format)
  const marketplaceJsonPath = join(process.cwd(), '.claude', 'marketplace.json');
  try {
    const content = await readFile(marketplaceJsonPath, 'utf-8');
    const marketplaceData = JSON.parse(content) as MarketplaceJson;

    if (!validateMarketplaceJson(marketplaceData)) {
      throw new Error('Invalid marketplace.json format');
    }

    // Convert each plugin in marketplace.json to a separate PRPM manifest
    const manifests: PackageManifest[] = [];
    for (let i = 0; i < marketplaceData.plugins.length; i++) {
      const manifest = marketplaceToManifest(marketplaceData, i);
      const validated = validateManifest(manifest, manifest.name);
      manifests.push(validated);
    }

    return { manifests, collections: [], source: '.claude/marketplace.json' };
  } catch (error) {
    // marketplace.json not found or invalid at .claude path, try .claude-plugin
  }

  // Try .claude-plugin/marketplace.json (alternative Claude format)
  const marketplaceJsonPluginPath = join(process.cwd(), '.claude-plugin', 'marketplace.json');
  try {
    const content = await readFile(marketplaceJsonPluginPath, 'utf-8');
    const marketplaceData = JSON.parse(content) as MarketplaceJson;

    if (!validateMarketplaceJson(marketplaceData)) {
      throw new Error('Invalid marketplace.json format');
    }

    // Convert each plugin in marketplace.json to a separate PRPM manifest
    const manifests: PackageManifest[] = [];
    for (let i = 0; i < marketplaceData.plugins.length; i++) {
      const manifest = marketplaceToManifest(marketplaceData, i);
      const validated = validateManifest(manifest, manifest.name);
      manifests.push(validated);
    }

    return { manifests, collections: [], source: '.claude-plugin/marketplace.json' };
  } catch (error) {
    // marketplace.json not found or invalid
  }

  // No manifest file found
  throw new Error(
    'No manifest file found. Expected either:\n' +
    '  - prpm.json in the current directory, or\n' +
    '  - .claude/marketplace.json (Claude format), or\n' +
    '  - .claude-plugin/marketplace.json (Claude format)'
  );
}

/**
 * Validate package manifest
 */
function validateManifest(manifest: PackageManifest, contextLabel?: string): PackageManifest {
  const context = contextLabel || manifest.name || 'manifest';
  const prefix = `[${context}] `;

  // Set default subtype to 'rule' if not provided
  if (!manifest.subtype) {
    manifest.subtype = 'rule';
  }

  // First, validate against JSON schema
  const schemaValidation = validateManifestSchema(manifest);
  if (!schemaValidation.valid) {
    const errorMessages = schemaValidation.errors?.join('\n  - ') || 'Unknown validation error';
    throw new Error(`${prefix}Manifest validation failed:\n  - ${errorMessages}`);
  }

  // Additional custom validations (beyond what JSON schema can express)

  // Check if using enhanced format (file objects)
  const hasEnhancedFormat = manifest.files.some(f => typeof f === 'object');

  if (hasEnhancedFormat) {
    // Check if files have multiple distinct formats
    const fileFormats = new Set(
      (manifest.files as PackageFileMetadata[])
        .filter(f => typeof f === 'object')
        .map(f => f.format)
    );

    // Only suggest "collection" if there are multiple distinct formats
    if (fileFormats.size > 1 && manifest.subtype !== 'collection') {
      console.warn(`${prefix}⚠️  Package contains multiple file formats. Consider setting subtype to "collection" for clarity.`);
    }
  }

  // Enforce SKILL.md filename for Claude skills
  if (manifest.format === 'claude' && manifest.subtype === 'skill') {
    const filePaths = normalizeFilePaths(manifest.files);
    const hasSkillMd = filePaths.some(path => path.endsWith('/SKILL.md') || path === 'SKILL.md');

    if (!hasSkillMd) {
      throw new Error(
        `${prefix}Claude skills must contain a SKILL.md file.\n` +
        'According to Claude documentation at https://docs.claude.com/en/docs/claude-code/skills,\n' +
        'skills must have a file named SKILL.md in their directory.\n' +
        'Please rename your skill file to SKILL.md (all caps) and update your prpm.json files array.'
      );
    }

    // Validate skill name length (max 64 characters)
    if (manifest.name.length > 64) {
      throw new Error(
        `${prefix}Claude skill name "${manifest.name}" exceeds 64 character limit (${manifest.name.length} characters).\n` +
        'According to Claude documentation, skill names must be max 64 characters.\n' +
        'Please shorten your package name.'
      );
    }

    // Validate skill name format (lowercase, numbers, hyphens only)
    if (!/^[a-z0-9-]+$/.test(manifest.name)) {
      throw new Error(
        `${prefix}Claude skill name "${manifest.name}" contains invalid characters.\n` +
        'According to Claude documentation, skill names must use lowercase letters, numbers, and hyphens only.\n' +
        'Please update your package name.'
      );
    }

    // Validate description length (max 1024 characters)
    if (manifest.description.length > 1024) {
      throw new Error(
        `${prefix}Claude skill description exceeds 1024 character limit (${manifest.description.length} characters).\n` +
        'According to Claude documentation, skill descriptions must be max 1024 characters.\n' +
        'Please shorten your description.'
      );
    }

    // Warn if description is approaching the limit (80% = 819 chars)
    if (manifest.description.length > 819) {
      console.warn(
        `${prefix}⚠️  Warning: Skill description is ${manifest.description.length}/1024 characters (${Math.round(manifest.description.length / 1024 * 100)}% of limit).\n` +
        '   Consider keeping it concise for better discoverability.'
      );
    }

    // Warn if description is too short (less than 100 chars)
    if (manifest.description.length < 100) {
      console.warn(
        `${prefix}⚠️  Warning: Skill description is only ${manifest.description.length} characters.\n` +
        '   Claude uses descriptions for skill discovery - consider adding more detail about:\n' +
        '   - What the skill does\n' +
        '   - When Claude should use it\n' +
        '   - What problems it solves'
      );
    }
  }

  return manifest;
}

/**
 * Normalize files array to string paths
 * Converts both simple and enhanced formats to string array
 */
function normalizeFilePaths(files: string[] | PackageFileMetadata[]): string[] {
  return files.map(file => {
    if (typeof file === 'string') {
      return file;
    } else {
      return file.path;
    }
  });
}

/**
 * Predict what the scoped package name will be after publishing
 * This matches the server-side logic in packages.ts
 */
function predictScopedPackageName(
  manifestName: string,
  username: string,
  organization?: string
): string {
  const usernameLowercase = username.toLowerCase();

  // If organization is specified, use @org-name/
  if (organization) {
    const orgNameLowercase = organization.toLowerCase();
    const expectedPrefix = `@${orgNameLowercase}/`;
    if (!manifestName.startsWith(expectedPrefix)) {
      return `${expectedPrefix}${manifestName}`;
    }
    return manifestName;
  }

  // If package name doesn't already have a scope, add @username/
  if (!manifestName.startsWith('@')) {
    return `@${usernameLowercase}/${manifestName}`;
  }

  // Package already has a scope, return as-is
  return manifestName;
}

/**
 * Create tarball from current directory
 */
async function createTarball(manifest: PackageManifest): Promise<Buffer> {
  const tmpDir = join(tmpdir(), `prpm-${randomBytes(8).toString('hex')}`);
  const tarballPath = join(tmpDir, 'package.tar.gz');

  try {
    // Create temp directory
    await mkdir(tmpDir, { recursive: true });

    // Get files to include - normalize to string paths
    const filePaths = normalizeFilePaths(manifest.files);

    // Add standard files if not already included
    const standardFiles = ['prpm.json', 'README.md', 'LICENSE'];
    for (const file of standardFiles) {
      if (!filePaths.includes(file)) {
        filePaths.push(file);
      }
    }

    // Check which files exist
    const existingFiles: string[] = [];
    for (const file of filePaths) {
      try {
        await stat(file);
        existingFiles.push(file);
      } catch {
        // File doesn't exist, skip
      }
    }

    if (existingFiles.length === 0) {
      throw new Error('No package files found to include in tarball');
    }

    // Create tarball
    await tar.create(
      {
        gzip: true,
        file: tarballPath,
        cwd: process.cwd(),
      },
      existingFiles
    );

    // Read tarball into buffer
    const tarballBuffer = await readFile(tarballPath);

    // Check size (max 10MB)
    const sizeMB = tarballBuffer.length / (1024 * 1024);
    if (sizeMB > 10) {
      throw new Error(`Package size (${sizeMB.toFixed(2)}MB) exceeds 10MB limit`);
    }

    return tarballBuffer;
  } catch (error) {
    throw error;
  } finally {
    // Clean up temp directory
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Publish a package to the registry
 */
export async function handlePublish(options: PublishOptions): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let packageName: string | undefined;
  let version: string | undefined;

  try {
    const config = await getConfig();

    // Check if logged in
    if (!config.token) {
      throw new CLIError('❌ Not logged in. Run "prpm login" first.', 1);
    }

    console.log('📦 Publishing package...\n');

    // Read and validate manifests
    console.log('🔍 Validating package manifest(s)...');
    const { manifests, collections, source } = await findAndLoadManifests();

    // Execute prepublishOnly script if defined (for multi-package manifests)
    // This runs before any packages are published
    if (source === 'prpm.json (multi-package)' || source === 'prpm.json') {
      try {
        // Re-read the raw prpm.json to check for scripts
        const prpmJsonPath = join(process.cwd(), 'prpm.json');
        const prpmContent = await readFile(prpmJsonPath, 'utf-8');
        const prpmManifest = JSON.parse(prpmContent);

        if (prpmManifest.scripts) {
          await executePrepublishOnly(prpmManifest.scripts);
        }
      } catch (error) {
        // If script execution fails, abort publish
        if (error instanceof Error && error.message.includes('script')) {
          throw error;
        }
        // Ignore other errors (e.g., file not found - shouldn't happen at this point)
      }
    }

    if (manifests.length > 1 || collections.length > 0) {
      if (manifests.length > 0) {
        console.log(`   Found ${manifests.length} package(s) in ${source}`);
        if (options.package) {
          console.log(`   Filtering to package: ${options.package}`);
        }
      }
      if (collections.length > 0) {
        console.log(`   Found ${collections.length} collection(s) in ${source}`);
        if (options.collection) {
          console.log(`   Filtering to collection: ${options.collection}`);
        }
      }
      console.log('   Will publish each separately\n');
    }

    // Filter to specific package if requested
    let filteredManifests = manifests;
    if (options.package) {
      filteredManifests = manifests.filter(m => m.name === options.package);
      if (filteredManifests.length === 0) {
        throw new Error(`Package "${options.package}" not found in manifest. Available packages: ${manifests.map(m => m.name).join(', ')}`);
      }
      console.log(`   ✓ Found package "${options.package}"\n`);
    }

    // Get user info to check for organizations (once for all packages)
    console.log('🔍 Checking authentication...');
    const client = getRegistryClient(config);
    let userInfo: any;

    try {
      userInfo = await client.whoami();
    } catch (err) {
      console.log('   Could not fetch user organizations, publishing as personal packages');
    }
    console.log('');

    // Check for duplicate package names (only in filtered set)
    if (filteredManifests.length > 1) {
      const nameMap = new Map<string, number>();
      const duplicates: string[] = [];

      filteredManifests.forEach((manifest, index) => {
        const existingIndex = nameMap.get(manifest.name);
        if (existingIndex !== undefined) {
          duplicates.push(`  - "${manifest.name}" appears in positions ${existingIndex + 1} and ${index + 1}`);
        } else {
          nameMap.set(manifest.name, index);
        }
      });

      if (duplicates.length > 0) {
        console.error('❌ Duplicate package names detected:\n');
        duplicates.forEach(dup => console.error(dup));
        console.error('\n⚠️  Each package must have a unique name.');
        console.error('   Package names are globally unique per author/organization.');
        console.error('   If you want to publish the same package for different formats,');
        console.error('   use different names (e.g., "react-rules-cursor" vs "react-rules-claude").\n');
        throw new Error('Cannot publish packages with duplicate names');
      }
    }

    // Track published packages and collections
    const publishedPackages: Array<{ name: string; version: string; url: string }> = [];
    const failedPackages: Array<{ name: string; error: string }> = [];
    const publishedCollections: Array<{ id: string; name: string; version: string }> = [];
    const failedCollections: Array<{ id: string; error: string }> = [];

    // Batch configuration
    const BATCH_SIZE = parseInt(process.env.PRPM_BATCH_SIZE || '5');
    // Use 0ms delay in tests or dry run mode
    const BATCH_DELAY_MS = options.dryRun || process.env.NODE_ENV === 'test'
      ? 0
      : parseInt(process.env.PRPM_BATCH_DELAY_MS || '2000');
    const MAX_RETRIES = parseInt(process.env.PRPM_MAX_RETRIES || '3');
    const RETRY_DELAY_MS = options.dryRun || process.env.NODE_ENV === 'test'
      ? 0
      : parseInt(process.env.PRPM_RETRY_DELAY_MS || '5000');

    // Helper to delay between batches
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper to check if error is retriable
    const isRetriableError = (error: string): boolean => {
      return error.includes('Service Unavailable') ||
             error.includes('at capacity') ||
             error.includes('503') ||
             error.includes('ECONNRESET') ||
             error.includes('ETIMEDOUT');
    };

    // Show batch info if publishing multiple packages (only if delays are enabled)
    if (filteredManifests.length > 1 && BATCH_DELAY_MS > 0) {
      console.log(`📦 Publishing ${filteredManifests.length} packages in batches of ${BATCH_SIZE}`);
      console.log(`⏱️  ${BATCH_DELAY_MS}ms delay between batches, ${RETRY_DELAY_MS}ms retry delay`);
      console.log('');
    }

    // Publish each manifest (filtered set) in batches
    for (let i = 0; i < filteredManifests.length; i++) {
      const manifest = filteredManifests[i];
      packageName = manifest.name;
      version = manifest.version;

      // Add batch delay between packages (but not before first package or in dry run/test mode)
      if (i > 0 && i % BATCH_SIZE === 0 && BATCH_DELAY_MS > 0) {
        console.log(`⏸️  Batch delay (${BATCH_DELAY_MS}ms) before next ${Math.min(BATCH_SIZE, filteredManifests.length - i)} packages...`);
        await delay(BATCH_DELAY_MS);
      }

      if (filteredManifests.length > 1) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📦 Publishing package ${i + 1} of ${filteredManifests.length}`);
        console.log(`${'='.repeat(60)}\n`);
      }

      // Retry logic wrapper
      let lastError: Error | null = null;
      let retryCount = 0;
      let publishSuccess = false;

      while (retryCount <= MAX_RETRIES && !publishSuccess) {
        try {
          if (retryCount > 0 && RETRY_DELAY_MS > 0) {
            console.log(`   🔄 Retry ${retryCount}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
            await delay(RETRY_DELAY_MS);
          } else if (retryCount > 0) {
            console.log(`   🔄 Retry ${retryCount}/${MAX_RETRIES}...`);
          }

          // Debug: Log access override logic only if DEBUG env var is set
          if (process.env.DEBUG) {
            console.log(`\n🔍 Before access override:`);
            console.log(`   - manifest.private: ${manifest.private}`);
          console.log(`   - options.access: ${options.access}`);
        }

        // Determine access level:
        // 1. If --access flag is provided, it overrides manifest setting
        // 2. Otherwise, use manifest setting (defaults to false/public if not specified)
        let isPrivate: boolean;
        if (options.access !== undefined) {
          // CLI flag explicitly provided - use it
          isPrivate = options.access === 'private';
          if (process.env.DEBUG) {
            console.log(`   - Using CLI flag override: ${options.access}`);
          }
        } else {
          // No CLI flag - use manifest setting
          isPrivate = manifest.private || false;
          if (process.env.DEBUG) {
            console.log(`   - Using manifest setting: ${isPrivate}`);
          }
        }

        if (process.env.DEBUG) {
          console.log(`   - calculated isPrivate: ${isPrivate}`);
        }

        // Update manifest with final private setting
        manifest.private = isPrivate;

        if (process.env.DEBUG) {
          console.log(`   - final manifest.private: ${manifest.private}`);
          console.log('');
        }

        let selectedOrgId: string | undefined;
        let selectedOrgName: string | undefined;

        // Check if organization is specified in manifest
        if (manifest.organization && userInfo) {
          const orgFromManifest = userInfo.organizations?.find(
            (org: any) => org.name === manifest.organization || org.id === manifest.organization
          );

          if (!orgFromManifest) {
            throw new Error(`Organization "${manifest.organization}" not found or you are not a member`);
          }

          // Check if user has publishing rights
          if (!['owner', 'admin', 'maintainer'].includes(orgFromManifest.role)) {
            throw new Error(
              `You do not have permission to publish to organization "${orgFromManifest.name}". ` +
              `Your role: ${orgFromManifest.role}. Required: owner, admin, or maintainer`
            );
          }

          selectedOrgId = orgFromManifest.id;
          selectedOrgName = orgFromManifest.name;
        }

        // Predict what the scoped package name will be
        const scopedPackageName = predictScopedPackageName(
          manifest.name,
          userInfo?.username || config.username || 'unknown',
          selectedOrgName || manifest.organization
        );

        console.log(`   Source: ${source}`);
        console.log(`   Package: ${scopedPackageName}@${manifest.version}`);
        console.log(`   Format: ${manifest.format} | Subtype: ${manifest.subtype}`);
        console.log(`   Description: ${manifest.description}`);
        console.log(`   Access: ${manifest.private ? 'private' : 'public'}`);
        if (selectedOrgId && userInfo) {
          const selectedOrg = userInfo.organizations.find((org: any) => org.id === selectedOrgId);
          console.log(`   Publishing to: ${selectedOrg?.name || 'organization'}`);
        }
        console.log('');

        // Validate package files against format schema
        console.log('🔍 Validating package files...');
        const fileValidation = await validatePackageFiles(manifest);

        if (fileValidation.errors.length > 0) {
          console.log('   ❌ Format validation errors:');
          fileValidation.errors.forEach(err => {
            console.log(`      - ${err}`);
          });
          console.log('');
          throw new Error('Package files do not match the specified format. Please fix the errors above.');
        }

        if (fileValidation.warnings.length > 0) {
          console.log('   ⚠️  Format validation warnings:');
          fileValidation.warnings.forEach(warn => {
            console.log(`      - ${warn}`);
          });
          console.log('');
        } else {
          console.log('   ✓ All files valid');
          console.log('');
        }

        // Extract license information
        console.log('📄 Extracting license information...');
        const licenseInfo = await extractLicenseInfo(manifest.repository);

        // Update manifest with license information from LICENSE file if found
        // Only set fields that aren't already manually specified in prpm.json
        if (licenseInfo.type && !manifest.license) {
          manifest.license = licenseInfo.type;
        }
        if (licenseInfo.text && !manifest.license_text) {
          manifest.license_text = licenseInfo.text;
        }
        if (licenseInfo.url && !manifest.license_url) {
          manifest.license_url = licenseInfo.url || undefined;
        }

        // Validate and warn about license (optional - will extract if present)
        validateLicenseInfo(licenseInfo, scopedPackageName);
        console.log('');

        // Extract content snippet
        console.log('📝 Extracting content snippet...');
        const snippet = await extractSnippet(manifest);
        if (snippet) {
          manifest.snippet = snippet;
        }
        validateSnippet(snippet, scopedPackageName);
        console.log('');

        // Create tarball
        console.log('📦 Creating package tarball...');
        const tarball = await createTarball(manifest);

        // Display size in KB or MB depending on size
        const sizeInBytes = tarball.length;
        const sizeInKB = sizeInBytes / 1024;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        let sizeDisplay: string;
        if (sizeInMB >= 1) {
          sizeDisplay = `${sizeInMB.toFixed(2)}MB`;
        } else {
          sizeDisplay = `${sizeInKB.toFixed(2)}KB`;
        }

        console.log(`   Size: ${sizeDisplay}`);
        console.log('');

        if (options.dryRun) {
          console.log('✅ Dry run successful! Package is ready to publish.');
          publishedPackages.push({
            name: scopedPackageName,
            version: manifest.version,
            url: ''
          });
          continue;
        }

        // Publish to registry
        console.log('🚀 Publishing to registry...');
        if (selectedOrgId) {
          console.log(`   Publishing as organization: ${userInfo.organizations.find((org: any) => org.id === selectedOrgId)?.name}`);
          console.log(`   Organization ID: ${selectedOrgId}`);
        }
        const result = await client.publish(manifest, tarball, selectedOrgId ? { orgId: selectedOrgId } : undefined);

        // Determine the webapp URL based on registry URL
        let webappUrl: string;
        const registryUrl = config.registryUrl || 'https://registry.prpm.dev';
        if (registryUrl.includes('localhost') || registryUrl.includes('127.0.0.1')) {
          // Local development - webapp is on port 5173
          webappUrl = 'http://localhost:5173';
        } else if (registryUrl.includes('registry.prpm.dev')) {
          // Production - webapp is on prpm.dev
          webappUrl = 'https://prpm.dev';
        } else {
          // Default to registry URL for unknown environments
          webappUrl = registryUrl;
        }

        // Use the name returned from the API (which includes auto-prefixed scope)
        const packageSlug = result.name.startsWith('@') ? result.name.slice(1) : result.name;
        const packagePath = packageSlug
          .split('/')
          .map(segment => encodeURIComponent(segment))
          .join('/');
        const packageUrl = `${webappUrl}/packages/${packagePath}`;

        console.log('');
        console.log('✅ Package published successfully!');
        console.log('');
        console.log(`   Package: ${result.name}@${result.version}`);
        console.log(`   Install: prpm install ${result.name}`);
        console.log('');

        publishedPackages.push({
          name: result.name, // Use scoped name from server
          version: result.version,
          url: packageUrl
        });

        // Mark as successful to exit retry loop
        publishSuccess = true;

      } catch (err) {
        const pkgError = err instanceof Error ? err.message : String(err);
        lastError = err instanceof Error ? err : new Error(String(err));

        // Try to use scoped name if we have user info, otherwise fall back to manifest name
        const displayName = userInfo
          ? predictScopedPackageName(
              manifest.name,
              userInfo.username,
              manifest.organization
            )
          : manifest.name;

        // Check if error is retriable
        if (isRetriableError(pkgError) && retryCount < MAX_RETRIES) {
          console.error(`\n⚠️  Temporary error publishing ${displayName}: ${pkgError}`);
          console.error(`   Will retry (${retryCount + 1}/${MAX_RETRIES})...\n`);
          retryCount++;
        } else {
          // Non-retriable error or max retries exceeded
          if (retryCount >= MAX_RETRIES) {
            console.error(`\n❌ Failed to publish ${displayName} after ${MAX_RETRIES} retries: ${pkgError}\n`);
          } else {
            console.error(`\n❌ Failed to publish ${displayName}: ${pkgError}\n`);
          }
          failedPackages.push({
            name: displayName,
            error: pkgError
          });
          break; // Exit retry loop
        }
      }
    } // End of retry while loop

    }

    // Publish collections if present
    if (collections.length > 0) {
      // Filter to specific collection if requested
      let filteredCollections = collections;
      if (options.collection) {
        filteredCollections = collections.filter(c => c.id === options.collection);
        if (filteredCollections.length === 0) {
          throw new Error(`Collection "${options.collection}" not found in manifest. Available collections: ${collections.map(c => c.id).join(', ')}`);
        }
        console.log(`   ✓ Found collection "${options.collection}"\n`);
      }

      for (const collection of filteredCollections) {
        if (filteredCollections.length > 1) {
          console.log(`\n${'='.repeat(60)}`);
          console.log(`📚 Publishing collection`);
          console.log(`${'='.repeat(60)}\n`);
        }

        try {
          console.log(`📚 Publishing collection "${collection.name}"...`);
          console.log(`   ID: ${collection.id}`);
          console.log(`   Packages: ${collection.packages.length}`);
          console.log('');

          if (options.dryRun) {
            console.log('✅ Dry run successful! Collection is ready to publish.');
            publishedCollections.push({
              id: collection.id,
              name: collection.name,
              version: collection.version || '1.0.0'
            });
            continue;
          }

          // Import and call the collection publish logic
          const { handleCollectionPublish } = await import('./collections.js');

          // Create a temporary manifest object for the collection
          const collectionData = {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            version: collection.version,
            category: collection.category,
            tags: collection.tags,
            icon: collection.icon,
            packages: collection.packages.map(pkg => ({
              packageId: pkg.packageId,
              version: pkg.version,
              required: pkg.required !== false,
              reason: pkg.reason,
            })),
          };

          const result = await client.createCollection(collectionData);

          console.log(`✅ Collection published successfully!`);
          console.log(`   Scope: ${result.scope}`);
          console.log(`   Name: ${result.name_slug}`);
          console.log(`   Version: ${result.version || '1.0.0'}`);
          console.log('');
          console.log(`💡 Install: prpm install collections/${result.name_slug}`);
          console.log('');

          publishedCollections.push({
            id: collection.id,
            name: collection.name,
            version: result.version || '1.0.0'
          });
        } catch (err) {
          const collError = err instanceof Error ? err.message : String(err);
          console.error(`\n❌ Failed to publish collection ${collection.id}: ${collError}\n`);
          failedCollections.push({
            id: collection.id,
            error: collError
          });
        }
      }

      // Add collection results to summary
      if (publishedCollections.length > 0) {
        console.log(`✅ Successfully published ${publishedCollections.length} collection(s):`);
        publishedCollections.forEach(coll => {
          console.log(`   - ${coll.name} (${coll.id}) v${coll.version}`);
        });
        console.log('');
      }

      if (failedCollections.length > 0) {
        console.log(`❌ Failed to publish ${failedCollections.length} collection(s):`);
        failedCollections.forEach(coll => {
          console.log(`   - ${coll.id}: ${coll.error}`);
        });
        console.log('');
      }
    }

    // Print summary if multiple packages
    if (manifests.length > 1) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Publishing Summary`);
      console.log(`${'='.repeat(60)}\n`);

      if (publishedPackages.length > 0) {
        console.log(`✅ Successfully published ${publishedPackages.length} package(s):`);
        publishedPackages.forEach(pkg => {
          console.log(`   - ${pkg.name}@${pkg.version}`);
          if (pkg.url) {
            console.log(`     ${pkg.url}`);
          }
        });
        console.log('');
      }

      if (failedPackages.length > 0) {
        console.log(`❌ Failed to publish ${failedPackages.length} package(s):`);
        failedPackages.forEach(pkg => {
          console.log(`   - ${pkg.name}: ${pkg.error}`);
        });
        console.log('');

        // Provide hints for common permission errors
        if (failedPackages.some(pkg => pkg.error.includes('Forbidden'))) {
          console.log('💡 Forbidden errors usually mean:');
          console.log('   - The package already exists and you don\'t have permission to update it');
          console.log('   - The package belongs to an organization and you\'re not a member with publish rights');
          console.log('   - Try: prpm whoami  (to check your organization memberships)');
          console.log('');
        }
      }
    }

    // Success if we published any packages OR collections
    success = publishedPackages.length > 0 || publishedCollections.length > 0;

    if (failedPackages.length > 0 && publishedPackages.length === 0 && publishedCollections.length === 0) {
      // Use the first failed package's error for telemetry
      const firstError = failedPackages[0]?.error || 'Unknown error';
      throw new CLIError(firstError, 1);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    if (err instanceof CLIError) {
      throw err;
    }
    let errorMsg = `\n❌ Failed to publish package: ${error}\n`;

    // Provide helpful hints based on error type
    if (error.includes('Manifest validation failed')) {
      errorMsg += '\n💡 Common validation issues:\n';
      errorMsg += '   - Missing required fields (name, version, description, format)\n';
      errorMsg += '   - Invalid format or subtype values\n';
      errorMsg += '   - Description too short (min 10 chars) or too long (max 500 chars)\n';
      errorMsg += '   - Package name must be lowercase with hyphens only\n';
      errorMsg += '\n💡 For Claude skills specifically:\n';
      errorMsg += '   - Add "subtype": "skill" to your prpm.json\n';
      errorMsg += '   - Ensure files include a SKILL.md file\n';
      errorMsg += '   - Package name must be max 64 characters\n';
      errorMsg += '\n💡 View the schema: prpm schema\n';
    } else if (error.includes('SKILL.md')) {
      errorMsg += '\n💡 Claude skills require:\n';
      errorMsg += '   - A file named SKILL.md (all caps) in your package\n';
      errorMsg += '   - "format": "claude" and "subtype": "skill" in prpm.json\n';
    } else if (error.includes('No manifest file found')) {
      errorMsg += '\n💡 Create a manifest file:\n';
      errorMsg += '   - Run: prpm init\n';
      errorMsg += '   - Or create prpm.json manually\n';
    }

    throw new CLIError(errorMsg, 1);
  } finally {
    // Track telemetry
    await telemetry.track({
      command: 'publish',
      success,
      error,
      duration: Date.now() - startTime,
      data: {
        packageName,
        version,
        dryRun: options.dryRun,
      },
    });
    await telemetry.shutdown();
  }
}

/**
 * Create the publish command
 */
export function createPublishCommand(): Command {
  return new Command('publish')
    .description('Publish packages and collections to the registry')
    .option('--access <type>', 'Package access (public or private) - overrides manifest setting')
    .option('--tag <tag>', 'NPM-style tag (e.g., latest, beta)', 'latest')
    .option('--dry-run', 'Validate package without publishing')
    .option('--package <name>', 'Publish only a specific package from multi-package manifest')
    .option('--collection <id>', 'Publish only a specific collection from manifest')
    .action(async (options: PublishOptions) => {
      await handlePublish(options);
    });
}
