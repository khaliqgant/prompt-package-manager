/**
 * Canonical Package Storage
 * Handles dual storage: canonical JSON + legacy tarball fallback
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import { config } from '../config.js';
import { s3Client } from './s3.js';
import { getTarballContent } from './s3.js';
import {
  type CanonicalPackage,
  fromCursor,
  fromClaude,
  fromContinue,
  fromWindsurf,
  fromCopilot,
  fromKiro,
  fromKiroAgent,
  fromRuler,
  fromAgentsMd,
  fromGemini,
} from '@pr-pm/converters';

/**
 * Check if canonical package exists in S3
 */
async function canonicalExists(
  packageName: string,
  version: string
): Promise<boolean> {
  try {
    const key = `packages/${packageName}/${version}/canonical.json`;
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload canonical package to S3
 * New packages should use this format
 */
export async function uploadCanonicalPackage(
  server: FastifyInstance,
  packageName: string,
  version: string,
  canonicalPackage: CanonicalPackage
): Promise<{ url: string; hash: string; size: number }> {
  const key = `packages/${packageName}/${version}/canonical.json`;
  const content = JSON.stringify(canonicalPackage, null, 2);
  const buffer = Buffer.from(content, 'utf-8');
  const hash = createHash('sha256').update(buffer).digest('hex');

  server.log.info(
    {
      packageName,
      version,
      key,
      bucket: config.s3.bucket,
      endpoint: config.s3.endpoint,
      size: buffer.length,
      hash: hash.substring(0, 8),
      format: canonicalPackage.format,
      hasMetadata: !!canonicalPackage.metadata,
    },
    '📤 Uploading canonical package to S3...'
  );

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/json',
        Metadata: {
          packageName,
          version,
          hash,
          format: 'canonical',
        },
      })
    );

    // Generate storage URL
    let url: string;
    if (config.s3.endpoint && config.s3.endpoint !== 'https://s3.amazonaws.com') {
      url = `${config.s3.endpoint}/${config.s3.bucket}/${key}`;
    } else {
      url = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
    }

    server.log.info(
      {
        packageName,
        version,
        key,
        url,
        size: buffer.length,
        hash: hash.substring(0, 8),
      },
      '✅ Successfully uploaded canonical package to S3'
    );

    return { url, hash, size: buffer.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    server.log.error(
      {
        error: errorMessage,
        errorStack,
        packageName,
        version,
        key,
        bucket: config.s3.bucket,
        endpoint: config.s3.endpoint,
        region: config.s3.region,
        hasCredentials: !!(config.s3.accessKeyId && config.s3.secretAccessKey),
        credentialsLength: config.s3.accessKeyId?.length,
      },
      '❌ FAILED to upload canonical package to S3'
    );
    throw new Error(`Failed to upload canonical package: ${errorMessage}`);
  }
}

/**
 * Get canonical package from S3
 * Tries canonical first, falls back to tarball extraction + conversion
 */
export async function getCanonicalPackage(
  server: FastifyInstance,
  packageId: string,
  packageName: string,
  version: string
): Promise<CanonicalPackage> {
  // Try canonical format first
  const hasCanonical = await canonicalExists(packageName, version);

  if (hasCanonical) {
    server.log.debug(
      { packageName, version },
      'Reading canonical package from S3'
    );
    return await readCanonicalFromS3(server, packageName, version);
  }

  // Fallback to legacy tarball extraction + conversion
  server.log.info(
    { packageName, version },
    'Canonical not found, falling back to tarball extraction'
  );

  return await extractCanonicalFromTarball(
    server,
    packageId,
    packageName,
    version
  );
}

/**
 * Read canonical package directly from S3
 */
async function readCanonicalFromS3(
  server: FastifyInstance,
  packageName: string,
  version: string
): Promise<CanonicalPackage> {
  const key = `packages/${packageName}/${version}/canonical.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    // Convert stream to string
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks).toString('utf-8');

    return JSON.parse(content) as CanonicalPackage;
  } catch (error: unknown) {
    server.log.error(
      {
        error: String(error),
        packageName,
        version,
        key,
      },
      'Failed to read canonical package from S3'
    );
    throw new Error('Failed to read canonical package from storage');
  }
}

/**
 * Extract canonical package from legacy tarball
 * Lazy migration: converts and optionally caches the result
 */
async function extractCanonicalFromTarball(
  server: FastifyInstance,
  packageId: string,
  packageName: string,
  version: string
): Promise<CanonicalPackage> {
  try {
    // Get tarball content
    const content = await getTarballContent(server, packageId, version, packageName);

    // Detect format and convert to canonical
    const canonical = await convertToCanonical(
      server,
      content,
      packageName,
      version
    );

    // TODO: Optionally cache the canonical version for future requests
    // This would be the "lazy migration" - store canonical after first access
    // await uploadCanonicalPackage(server, packageName, version, canonical);

    return canonical;
  } catch (error: unknown) {
    server.log.error(
      {
        error: String(error),
        packageName,
        version,
      },
      'Failed to extract canonical from tarball'
    );
    throw new Error('Failed to extract package content from storage');
  }
}

/**
 * Convert source content to canonical format
 * Detects format and uses appropriate converter
 */
async function convertToCanonical(
  server: FastifyInstance,
  content: string,
  packageName: string,
  version: string
): Promise<CanonicalPackage> {
  // Detect format from content
  const format = detectFormat(content);

  server.log.debug(
    { packageName, version, format },
    'Converting to canonical format'
  );

  // Extract scope from package name (@scope/package-name)
  // Note: In migration flow, we treat scope as author (could be user or org)
  // The publish flow has more context to distinguish between them
  const scopeMatch = packageName.match(/^@([^/]+)\//);
  const scope = scopeMatch ? scopeMatch[1] : 'unknown';

  // Prepare metadata for converters
  const metadata = {
    id: packageName,
    name: packageName,
    version,
    author: scope, // Use scope as author (may be user or org name)
    // organization not available in migration context
  };

  let canonicalPkg: CanonicalPackage;

  try {
    switch (format) {
      case 'cursor':
        canonicalPkg = fromCursor(content, metadata);
        break;
      case 'claude':
        canonicalPkg = fromClaude(content, metadata);
        break;
      case 'continue':
        canonicalPkg = fromContinue(content, metadata);
        break;
      case 'windsurf':
        canonicalPkg = fromWindsurf(content, metadata);
        break;
      case 'copilot':
        canonicalPkg = fromCopilot(content, metadata);
        break;
      case 'kiro':
        // Kiro returns CanonicalPackage directly
        canonicalPkg = fromKiro(content, metadata);
        break;
      case 'ruler':
        {
          // Ruler returns ConversionResult with JSON content
          const result = fromRuler(content);
          if (!result.content) {
            throw new Error('Ruler conversion produced empty content');
          }
          canonicalPkg = JSON.parse(result.content) as CanonicalPackage;
        }
        break;
      default:
        // Generic markdown fallback
        canonicalPkg = fromCursor(content, metadata);
    }

    return canonicalPkg;
  } catch (error: unknown) {
    server.log.error(
      {
        error: String(error),
        packageName,
        version,
        format,
      },
      'Failed to convert to canonical format'
    );
    throw new Error(`Failed to convert ${format} to canonical format`);
  }
}

/**
 * Detect format from content
 * Simple heuristics - can be improved
 */
function detectFormat(content: string): string {
  // Claude format (frontmatter with name, description)
  if (/^---\s*\nname:/.test(content)) {
    return 'claude';
  }

  // Continue format (YAML frontmatter with globs/alwaysApply)
  if (/^---\s*\n.*(?:globs|alwaysApply):/.test(content)) {
    return 'continue';
  }

  // Windsurf format (plain markdown, no frontmatter, typically shorter)
  if (!/^---/.test(content) && content.length < 15000) {
    return 'windsurf';
  }

  // Kiro agent format (JSON with prompt/tools/mcpServers)
  if (content.trim().startsWith('{')) {
    try {
      const json = JSON.parse(content);
      if (json.prompt || json.tools || json.mcpServers) {
        return 'kiro';
      }
    } catch {
      // Not JSON
    }
  }

  // Ruler format (plain markdown with HTML comments)
  if (/<!--\s*Package:/.test(content)) {
    return 'ruler';
  }

  // Default to Cursor format
  return 'cursor';
}

/**
 * Check if package has canonical storage
 * Used to determine if migration is needed
 */
export async function hasCanonicalStorage(
  packageName: string,
  version: string
): Promise<boolean> {
  return await canonicalExists(packageName, version);
}
