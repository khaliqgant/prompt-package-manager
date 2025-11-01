/**
 * S3 Storage Helper
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { createHash } from 'crypto';

const s3Client = new S3Client({
  region: config.s3.region,
  endpoint: config.s3.endpoint !== 'https://s3.amazonaws.com' ? config.s3.endpoint : undefined,
  credentials: config.s3.accessKeyId
    ? {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      }
    : undefined,
    forcePathStyle: config.s3.endpoint !== 'https://s3.amazonaws.com',
});

/**
 * Upload package tarball to S3
 * Uses package name (e.g., @author/package-name) for S3 path instead of UUID
 * for human-readable, browseable storage structure
 */
export async function uploadPackage(
  server: FastifyInstance,
  packageName: string,
  version: string,
  tarball: Buffer,
  options?: {
    packageId?: string; // UUID, kept for metadata only
  }
): Promise<{ url: string; hash: string; size: number }> {
  // Use package name for S3 key path (author-based structure)
  const key = `packages/${packageName}/${version}/package.tar.gz`;
  const hash = createHash('sha256').update(tarball).digest('hex');

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
        Body: tarball,
        ContentType: 'application/gzip',
        Metadata: {
          packageId: options?.packageId || packageName,
          packageName,
          version,
          hash,
        },
      })
    );

    // Generate storage URL (use endpoint for MinIO, otherwise AWS S3)
    let url: string;
    if (config.s3.endpoint && config.s3.endpoint !== 'https://s3.amazonaws.com') {
      // MinIO or custom S3-compatible endpoint - use path-style URL
      url = `${config.s3.endpoint}/${config.s3.bucket}/${key}`;
    } else {
      // AWS S3 - use virtual-hosted-style URL
      url = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;
    }

    server.log.info({
      packageName,
      packageId: options?.packageId,
      version,
      key
    }, 'Uploaded package to storage');

    return {
      url,
      hash,
      size: tarball.length,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    server.log.error({
      error: errorMessage,
      errorStack: error instanceof Error ? error.stack : undefined,
      packageName,
      packageId: options?.packageId,
      key,
      bucket: config.s3.bucket,
      region: config.s3.region,
      endpoint: config.s3.endpoint
    }, 'Failed to upload package to S3');
    throw new Error(`Failed to upload package to storage: ${errorMessage}`);
  }
}

/**
 * Check if an object exists in S3
 */
async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get presigned URL for package download
 * Prioritizes author-based paths (standard), falls back to UUID paths (deprecated)
 */
export async function getDownloadUrl(
  server: FastifyInstance,
  packageId: string,
  version: string,
  options?: {
    packageName?: string;
    expiresIn?: number;
  }
): Promise<string> {
  const expiresIn = options?.expiresIn || 3600;

  let key: string;
  let usingDeprecatedUuidPath = false;

  // Try author-based path first (standard): packages/{@scope/name}/{version}/package.tar.gz
  if (options?.packageName) {
    const authorKey = `packages/${options.packageName}/${version}/package.tar.gz`;
    const authorPathExists = await objectExists(config.s3.bucket, authorKey);

    if (authorPathExists) {
      key = authorKey;
      server.log.debug({
        packageId,
        packageName: options.packageName,
        version,
        key
      }, 'Using author-based S3 path');
    } else {
      // Fallback to deprecated UUID-based structure: packages/{uuid}/{version}/package.tar.gz
      const uuidKey = `packages/${packageId}/${version}/package.tar.gz`;
      const uuidPathExists = await objectExists(config.s3.bucket, uuidKey);

      if (uuidPathExists) {
        key = uuidKey;
        usingDeprecatedUuidPath = true;
        server.log.warn({
          packageId,
          packageName: options.packageName,
          version,
          uuidKey
        }, 'Using deprecated UUID-based S3 path - should migrate to author-based path');
      } else {
        // Neither path exists - use author path and let it fail with proper error
        key = authorKey;
      }
    }
  } else {
    // No package name provided, use UUID path (deprecated)
    key = `packages/${packageId}/${version}/package.tar.gz`;
    usingDeprecatedUuidPath = true;
    server.log.warn({
      packageId,
      version,
      key
    }, 'No package name provided - using deprecated UUID-based path');
  }

  try {
    server.log.info({
      packageId,
      packageName: options?.packageName,
      version,
      key,
      usingDeprecatedUuidPath,
      bucket: config.s3.bucket,
      hasCredentials: !!(config.s3.accessKeyId && config.s3.secretAccessKey)
    }, 'Generating presigned download URL');

    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    server.log.info({
      url: url.substring(0, 100) + '...',
      usingDeprecatedUuidPath
    }, 'Generated presigned URL');
    return url;
  } catch (error: unknown) {
    server.log.error({
      error: String(error),
      packageId,
      packageName: options?.packageName,
      version,
      key,
      usingDeprecatedUuidPath,
      bucket: config.s3.bucket,
      hasAccessKey: !!config.s3.accessKeyId,
      hasSecretKey: !!config.s3.secretAccessKey
    }, 'Failed to generate download URL');
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Delete package from S3
 * Supports both UUID-based and author-based paths
 */
export async function deletePackage(
  server: FastifyInstance,
  packageId: string,
  version: string,
  options?: {
    packageName?: string;
  }
): Promise<void> {
  // Try author-based path first if package name is provided
  let key = `packages/${packageId}/${version}/package.tar.gz`;

  if (options?.packageName) {
    const authorKey = `packages/${options.packageName}/${version}/package.tar.gz`;
    const authorPathExists = await objectExists(config.s3.bucket, authorKey);

    if (authorPathExists) {
      key = authorKey;
    }
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: key,
      })
    );

    server.log.info({
      packageId,
      packageName: options?.packageName,
      version,
      key
    }, 'Deleted package from S3');
  } catch (error: unknown) {
    server.log.error({
      error: String(error),
      packageId,
      packageName: options?.packageName,
      key
    }, 'Failed to delete package from S3');
    throw new Error('Failed to delete package from storage');
  }
}

/**
 * Download tarball from S3 and extract prompt content
 */
export async function getTarballContent(
  server: FastifyInstance,
  packageId: string,
  version: string,
  packageName: string
): Promise<string> {
  const key = `packages/${packageName}/${version}/package.tar.gz`;

  try {
    server.log.info({ packageName, version, key }, 'Fetching tarball from S3');

    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    const tarballBuffer = Buffer.concat(chunks);

    server.log.info({ packageName, version, size: tarballBuffer.length }, 'Downloaded tarball from S3');

    // Extract and return the content
    return await extractPromptContent(tarballBuffer, packageName);
  } catch (error: unknown) {
    server.log.error({
      error: String(error),
      packageName,
      version,
      key
    }, 'Failed to fetch tarball from S3');
    throw new Error(`Failed to fetch package content from storage: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract prompt content from tarball
 * Uses tar-stream for better compatibility
 */
async function extractPromptContent(tarballBuffer: Buffer, packageName: string): Promise<string> {
  const zlib = await import('zlib');
  // @ts-expect-error - tar-stream doesn't have TypeScript declarations
  const tarStream = await import('tar-stream');
  const { Readable } = await import('stream');

  return new Promise((resolve, reject) => {
    // Decompress gzip first
    zlib.gunzip(tarballBuffer, (err: Error | null, result: Buffer) => {
      if (err) {
        reject(new Error(`Failed to decompress tarball: ${err.message}`));
        return;
      }

      // Check if this is a tar archive
      const isTar = result.length > 257 && result.toString('utf-8', 257, 262) === 'ustar';

      if (!isTar) {
        // Not a tar archive, treat as single gzipped file
        const content = result.toString('utf-8');
        if (content.trim().length > 0) {
          resolve(content);
        } else {
          reject(new Error(`Empty content in tarball for ${packageName}`));
        }
        return;
      }

      // Extract using tar-stream
      const extract = tarStream.extract();
      const contentFiles: Array<{ name: string; content: string }> = [];

      // Files to exclude (metadata files)
      const excludeFiles = ['prpm.json', 'package.json', 'LICENSE', 'LICENSE.txt', 'LICENSE.md'];

      extract.on('entry', (header: any, stream: any, next: any) => {
        const fileName = header.name;
        const baseName = fileName.split('/').pop() || '';

        // Skip directories and excluded files
        if (header.type !== 'file' || excludeFiles.includes(baseName)) {
          stream.on('end', next);
          stream.resume();
          return;
        }

        // Only process text files (.md, .txt, or files without extension)
        const ext = baseName.split('.').pop()?.toLowerCase();
        const isTextFile = !ext || ext === 'md' || ext === 'txt' || ext === 'markdown';

        if (isTextFile) {
          let content = '';
          stream.on('data', (chunk: Buffer) => {
            content += chunk.toString('utf-8');
          });
          stream.on('end', () => {
            if (content.trim().length > 0) {
              contentFiles.push({ name: fileName, content });
            }
            next();
          });
        } else {
          stream.on('end', next);
          stream.resume();
        }
      });

      extract.on('finish', () => {
        if (contentFiles.length === 0) {
          reject(new Error(`No content files found in tarball for ${packageName}`));
          return;
        }

        // Prioritize certain files if multiple exist
        const priorityFile = contentFiles.find(f => {
          const lower = f.name.toLowerCase();
          return lower.includes('skill.md') ||
                 lower.includes('cursor') ||
                 lower.includes('claude') ||
                 lower.endsWith('/skill.md') ||
                 lower === 'skill.md';
        });

        if (priorityFile) {
          resolve(priorityFile.content);
        } else {
          // Return the first file's content
          resolve(contentFiles[0].content);
        }
      });

      extract.on('error', (err: Error) => {
        reject(new Error(`Failed to extract tarball: ${err.message}`));
      });

      // Pipe the decompressed buffer through tar-stream
      Readable.from(result).pipe(extract);
    });
  });
}
