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
import type { PackageManifest, PackageFileMetadata } from '../types/registry';
import {
  marketplaceToManifest,
  validateMarketplaceJson,
  type MarketplaceJson,
} from '../core/marketplace-converter';
import { validateManifestSchema } from '../core/schema-validator';

interface PublishOptions {
  access?: 'public' | 'private';
  tag?: string;
  dryRun?: boolean;
}

/**
 * Try to find and load a manifest file
 * Checks for:
 * 1. prpm.json (native format)
 * 2. .claude/marketplace.json (Claude format)
 */
async function findAndLoadManifest(): Promise<{ manifest: PackageManifest; source: string }> {
  // Try prpm.json first (native format)
  const prpmJsonPath = join(process.cwd(), 'prpm.json');
  try {
    const content = await readFile(prpmJsonPath, 'utf-8');
    const manifest = JSON.parse(content);
    const validated = validateManifest(manifest);
    return { manifest: validated, source: 'prpm.json' };
  } catch (error) {
    // prpm.json not found or invalid, try marketplace.json
  }

  // Try .claude/marketplace.json (Claude format)
  const marketplaceJsonPath = join(process.cwd(), '.claude', 'marketplace.json');
  try {
    const content = await readFile(marketplaceJsonPath, 'utf-8');
    const marketplaceData = JSON.parse(content);

    if (!validateMarketplaceJson(marketplaceData)) {
      throw new Error('Invalid marketplace.json format');
    }

    // Convert marketplace.json to PRPM manifest
    const manifest = marketplaceToManifest(marketplaceData as MarketplaceJson);

    // Validate the converted manifest
    const validated = validateManifest(manifest);

    return { manifest: validated, source: '.claude/marketplace.json' };
  } catch (error) {
    // marketplace.json not found or invalid
  }

  // Neither file found
  throw new Error(
    'No manifest file found. Expected either:\n' +
    '  - prpm.json in the current directory, or\n' +
    '  - .claude/marketplace.json (Claude format)'
  );
}

/**
 * Validate package manifest
 */
function validateManifest(manifest: PackageManifest): PackageManifest {
  // First, validate against JSON schema
  const schemaValidation = validateManifestSchema(manifest);
  if (!schemaValidation.valid) {
    const errorMessages = schemaValidation.errors?.join('\n  - ') || 'Unknown validation error';
    throw new Error(`Manifest validation failed:\n  - ${errorMessages}`);
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
      console.warn('⚠️  Package contains multiple file formats. Consider setting subtype to "collection" for clarity.');
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
      console.error('❌ Not logged in. Run "prpm login" first.');
      process.exit(1);
    }

    console.log('📦 Publishing package...\n');

    // Read and validate manifest
    console.log('🔍 Validating package manifest...');
    const { manifest, source } = await findAndLoadManifest();
    packageName = manifest.name;
    version = manifest.version;

    console.log(`   Source: ${source}`);
    console.log(`   Package: ${manifest.name}@${manifest.version}`);
    console.log(`   Format: ${manifest.format} | Subtype: ${manifest.subtype || 'rule'}`);
    console.log(`   Description: ${manifest.description}`);
    console.log('');

    // Create tarball
    console.log('📦 Creating package tarball...');
    const tarball = await createTarball(manifest);
    const sizeMB = (tarball.length / (1024 * 1024)).toFixed(2);
    console.log(`   Size: ${sizeMB}MB`);
    console.log('');

    if (options.dryRun) {
      console.log('✅ Dry run successful! Package is ready to publish.');
      console.log('   Run without --dry-run to publish.');
      success = true;
      return;
    }

    // Publish to registry
    console.log('🚀 Publishing to registry...');
    const client = getRegistryClient(config);
    const result = await client.publish(manifest, tarball);

    console.log('');
    console.log('✅ Package published successfully!');
    console.log('');
    console.log(`   Package: ${manifest.name}@${result.version}`);
    console.log(`   Install: prpm install ${manifest.name}`);
    console.log(`   View: ${config.registryUrl}/packages/${result.package_id}`);
    console.log('');

    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Failed to publish package: ${error}\n`);
    process.exit(1);
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
    .description('Publish a package to the registry')
    .option('--access <type>', 'Package access (public or private)', 'public')
    .option('--tag <tag>', 'NPM-style tag (e.g., latest, beta)', 'latest')
    .option('--dry-run', 'Validate package without publishing')
    .action(handlePublish);
}
