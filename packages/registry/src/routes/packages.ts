/**
 * Package management routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../db/index.js';
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../cache/redis.js';
import { Package, PackageVersion, PackageInfo } from '../types.js';
import { toError } from '../types/errors.js';
import { config } from '../config.js';
import { optionalAuth } from '../middleware/auth.js';
import type { AIMetadataResult } from '../scoring/ai-evaluator.js';
import type {
  ListPackagesQuery,
  PackageParams,
  PackageVersionParams,
  TrendingQuery,
  ResolveQuery,
} from '../types/requests.js';
import { EmbeddingGenerationService } from '../services/embedding-generation.js';

// Reusable enum constants for schema validation
const FORMAT_ENUM = ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'agents.md', 'generic', 'mcp'] as const;
const SUBTYPE_ENUM = ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection', 'chatmode', 'hook'] as const;

// Columns to select for list results (excludes full_content to reduce payload size)
const LIST_COLUMNS = `
  p.id, p.name, p.display_name, p.description, p.author_id, p.org_id,
  p.format, p.subtype, p.tags, p.keywords, p.category,
  p.visibility, p.featured, p.verified, p.official,
  p.total_downloads, p.weekly_downloads, p.monthly_downloads, p.version_count,
  p.downloads_last_7_days, p.trending_score,
  p.rating_average, p.rating_count, p.quality_score,
  p.install_count, p.view_count,
  p.license, p.license_text, p.license_url,
  p.snippet, p.repository_url, p.homepage_url, p.documentation_url,
  p.created_at, p.updated_at, p.last_published_at,
  p.deprecated, p.deprecated_reason
`.trim();

export async function packageRoutes(server: FastifyInstance) {
  // List packages with pagination
  server.get('/', {
    schema: {
      tags: ['packages'],
      description: 'List all packages with pagination and filtering',
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          format: { type: 'string', enum: FORMAT_ENUM },
          subtype: { type: 'string', enum: SUBTYPE_ENUM },
          category: { type: 'string' },
          featured: { type: 'boolean' },
          verified: { type: 'boolean' },
          sort: { type: 'string', enum: ['downloads', 'created', 'updated', 'quality', 'rating'], default: 'downloads' },
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          offset: { type: 'number', default: 0, minimum: 0 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: ListPackagesQuery }>, reply: FastifyReply) => {
    const { search, format, subtype, category, featured, verified, sort = 'downloads', limit = 20, offset = 0 } = request.query;

    server.log.info({
      action: 'list_packages',
      filters: { search, format, subtype, category, featured, verified },
      sort,
      pagination: { limit, offset }
    }, '📦 Listing packages');

    // Build cache key
    const cacheKey = `packages:list:${JSON.stringify(request.query)}`;

    // Check cache
    const cached = await cacheGet(server, cacheKey);
    if (cached) {
      server.log.info({ cacheKey }, '⚡ Cache hit');
      return cached;
    }

    // Build WHERE clause
    const conditions: string[] = ["visibility = 'public'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (format) {
      conditions.push(`format = $${paramIndex++}`);
      params.push(format);
    }

    if (subtype) {
      conditions.push(`subtype = $${paramIndex++}`);
      params.push(subtype);
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (featured !== undefined) {
      conditions.push(`featured = $${paramIndex++}`);
      params.push(featured);
    }

    if (verified !== undefined) {
      conditions.push(`verified = $${paramIndex++}`);
      params.push(verified);
    }

    if (search) {
      conditions.push(`(
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ websearch_to_tsquery('english', $${paramIndex}) OR
        name ILIKE $${paramIndex + 1} OR
        $${paramIndex + 2} = ANY(tags)
      )`);
      params.push(search, `%${search}%`, search.toLowerCase());
      paramIndex += 3;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause - SECURITY: Use allowlist to prevent SQL injection
    const ALLOWED_SORT_COLUMNS: Record<string, string> = {
      'downloads': 'p.total_downloads DESC',
      'created': 'p.created_at DESC',
      'updated': 'p.updated_at DESC',
      'quality': 'p.quality_score DESC NULLS LAST',
      'rating': 'p.rating_average DESC NULLS LAST',
    };

    const orderByClause = ALLOWED_SORT_COLUMNS[sort] || ALLOWED_SORT_COLUMNS['downloads'];

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      server,
      `SELECT COUNT(*) as count FROM packages ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get packages (select only needed columns for list view)
    // SECURITY: Prefix table name safely - whereClause already built with parameterized queries
    const whereClauseWithPrefix = whereClause.replace(/(\w+)\s*=/g, 'p.$1 =').replace(/(\w+)\s+ILIKE/g, 'p.$1 ILIKE');

    const result = await query<Package>(
      server,
      `SELECT
         p.id, p.name, p.description, p.author_id, p.format, p.subtype,
         p.category, p.tags, p.keywords, p.version_count,
         p.total_downloads, p.weekly_downloads, p.monthly_downloads,
         p.rating_average, p.rating_count, p.snippet, p.quality_score,
         p.verified, p.featured, p.official, p.created_at, p.updated_at,
         p.last_published_at, p.install_count, p.view_count, p.license, p.license_url,
         u.username as author_username
       FROM packages p
       LEFT JOIN users u ON p.author_id = u.id
       ${whereClauseWithPrefix}
       ORDER BY ${orderByClause}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const response = {
      packages: result.rows,
      total,
      offset,
      limit,
    };

    // Cache for 5 minutes
    await cacheSet(server, cacheKey, response, 300);

    return response;
  });

  // Get package by ID
  server.get('/:packageName', {
    onRequest: [optionalAuth],
    schema: {
      tags: ['packages'],
      description: 'Get package details by ID',
      params: {
        type: 'object',
        properties: {
          packageId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageName: rawPackageName } = request.params as { packageName: string };
    const userId = request.user?.user_id;

    // Decode URL-encoded package name (handles slashes in scoped packages)
    const packageName = decodeURIComponent(rawPackageName);

    // Debug logging
    server.log.debug({
      packageName,
      userId: userId || 'unauthenticated',
      hasUser: !!request.user,
    }, 'GET package request');

    // Check cache (skip cache for authenticated requests to private packages)
    const cacheKey = `package:${packageName}`;
    if (!userId) {
      const cached = await cacheGet<PackageInfo>(server, cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get package - include private packages if user is authenticated and has access
    let pkg: Package | null = null;

    if (userId) {
      // For authenticated users, check if they have access to private packages
      server.log.debug({ packageName, userId }, 'Checking private package access');
      pkg = await queryOne<Package>(
        server,
        `SELECT p.* FROM packages p
         LEFT JOIN organization_members om ON p.org_id = om.org_id AND om.user_id = $2
         WHERE p.name = $1
         AND (p.visibility = 'public'
              OR (p.visibility = 'private'
                  AND p.org_id IS NOT NULL
                  AND om.user_id IS NOT NULL))`,
        [packageName, userId]
      );
      server.log.debug({ packageName, userId, found: !!pkg }, 'Private package query result');
    } else {
      // For unauthenticated users, only show public packages
      pkg = await queryOne<Package>(
        server,
        `SELECT * FROM packages WHERE name = $1 AND visibility = 'public'`,
        [packageName]
      );
    }

    if (!pkg) {
      server.log.debug({ packageName, userId: userId || 'none' }, 'Package not found');
      return reply.status(404).send({ error: 'Package not found' });
    }

    // Get versions
    const versionsResult = await query<PackageVersion>(
      server,
      `SELECT * FROM package_versions
       WHERE package_id = $1
       ORDER BY published_at DESC`,
      [pkg.id]
    );

    // Transform tarball URLs to registry download URLs
    // Trust X-Forwarded-Proto header from reverse proxy for correct protocol
    const protocol = (request.headers['x-forwarded-proto'] as string) || request.protocol;
    const host = request.headers.host || `localhost:${config.port}`;
    const baseUrl = `${protocol}://${host}`;

    const transformedVersions = versionsResult.rows.map(version => {
      if (version.tarball_url) {
        // Replace storage URL with registry download URL
        // URL-encode package name to handle slashes in scoped packages
        const encodedPackageName = encodeURIComponent(packageName);
        return {
          ...version,
          tarball_url: `${baseUrl}/api/v1/packages/${encodedPackageName}/${version.version}.tar.gz`
        };
      }
      return version;
    });

    const packageInfo: PackageInfo = {
      ...pkg,
      versions: transformedVersions,
      latest_version: transformedVersions[0],
    };

    // Only cache public packages (private packages should not be cached)
    if (pkg.visibility === 'public') {
      await cacheSet(server, cacheKey, packageInfo, 300);
    }

    return packageInfo;
  });

  // Get package by ID (for fast UUID lookups)
  server.get('/by-id/:packageId', {
    onRequest: [optionalAuth],
    schema: {
      tags: ['packages'],
      description: 'Get package details by ID (fast UUID lookup)',
      params: {
        type: 'object',
        properties: {
          packageId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageId } = request.params as { packageId: string };
    const userId = request.user?.user_id;

    // Debug logging
    server.log.debug({
      packageId,
      userId: userId || 'unauthenticated',
      hasUser: !!request.user,
    }, 'GET package by ID request');

    // Check cache (skip cache for authenticated requests to private packages)
    const cacheKey = `package:id:${packageId}`;
    if (!userId) {
      const cached = await cacheGet<PackageInfo>(server, cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get package - include private packages if user is authenticated and has access
    let pkg: Package | null = null;

    if (userId) {
      // For authenticated users, check if they have access to private packages
      server.log.debug({ packageId, userId }, 'Checking private package access');
      pkg = await queryOne<Package>(
        server,
        `SELECT p.*, u.username as author_username FROM packages p
         LEFT JOIN users u ON p.author_id = u.id
         LEFT JOIN organization_members om ON p.org_id = om.org_id AND om.user_id = $2
         WHERE p.id = $1
         AND (p.visibility = 'public'
              OR (p.visibility = 'private'
                  AND p.org_id IS NOT NULL
                  AND om.user_id IS NOT NULL))`,
        [packageId, userId]
      );
      server.log.debug({ packageId, userId, found: !!pkg }, 'Private package query result');
    } else {
      // For unauthenticated users, only show public packages
      pkg = await queryOne<Package>(
        server,
        `SELECT p.*, u.username as author_username FROM packages p
         LEFT JOIN users u ON p.author_id = u.id
         WHERE p.id = $1 AND p.visibility = 'public'`,
        [packageId]
      );
    }

    if (!pkg) {
      server.log.debug({ packageId, userId: userId || 'none' }, 'Package not found');
      return reply.status(404).send({ error: 'Package not found' });
    }

    // Get versions
    const versionsResult = await query<PackageVersion>(
      server,
      `SELECT * FROM package_versions
       WHERE package_id = $1
       ORDER BY published_at DESC`,
      [pkg.id]
    );

    // Transform tarball URLs to registry download URLs
    const protocol = (request.headers['x-forwarded-proto'] as string) || request.protocol;
    const host = request.headers.host || `localhost:${config.port}`;
    const baseUrl = `${protocol}://${host}`;

    const transformedVersions = versionsResult.rows.map(version => {
      if (version.tarball_url) {
        // URL-encode package name to handle slashes in scoped packages
        const encodedPackageName = encodeURIComponent(pkg.name);
        return {
          ...version,
          tarball_url: `${baseUrl}/api/v1/packages/${encodedPackageName}/${version.version}.tar.gz`
        };
      }
      return version;
    });

    const packageInfo: PackageInfo = {
      ...pkg,
      versions: transformedVersions,
      latest_version: transformedVersions[0],
    };

    // Only cache public packages (private packages should not be cached)
    if (pkg.visibility === 'public') {
      await cacheSet(server, cacheKey, packageInfo, 300);
    }

    return packageInfo;
  });

  // Get specific package version
  server.get('/:packageName/:version', {
    onRequest: [optionalAuth],
    schema: {
      tags: ['packages'],
      description: 'Get specific package version',
      params: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
          version: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageName: rawPackageName, version: versionParam } = request.params as { packageName: string; version: string };
    const userId = request.user?.user_id;

    // Decode URL-encoded package name (handles slashes in scoped packages)
    const packageName = decodeURIComponent(rawPackageName);

    // Check if this is a tarball download request (.tar.gz)
    if (versionParam.endsWith('.tar.gz')) {
      const version = versionParam.replace(/\.tar\.gz$/, '');

      // Check if packageName is a UUID (for tarball downloads by ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packageName);

      // Get package version with content - include private packages if user has access
      let pkgVersion: PackageVersion | null = null;

      if (userId) {
        // For authenticated users, check if they have access to private packages
        pkgVersion = await queryOne<PackageVersion>(
          server,
          isUUID
            ? `SELECT pv.*, p.name as package_name FROM package_versions pv
               JOIN packages p ON p.id = pv.package_id
               LEFT JOIN organization_members om ON p.org_id = om.org_id AND om.user_id = $3
               WHERE p.id = $1 AND pv.version = $2
               AND (p.visibility = 'public'
                    OR (p.visibility = 'private'
                        AND p.org_id IS NOT NULL
                        AND om.user_id IS NOT NULL))`
            : `SELECT pv.*, p.name as package_name FROM package_versions pv
               JOIN packages p ON p.id = pv.package_id
               LEFT JOIN organization_members om ON p.org_id = om.org_id AND om.user_id = $3
               WHERE p.name = $1 AND pv.version = $2
               AND (p.visibility = 'public'
                    OR (p.visibility = 'private'
                        AND p.org_id IS NOT NULL
                        AND om.user_id IS NOT NULL))`,
          [packageName, version, userId]
        );
      } else {
        // For unauthenticated users, only show public packages
        pkgVersion = await queryOne<PackageVersion>(
          server,
          isUUID
            ? `SELECT pv.*, p.name as package_name FROM package_versions pv
               JOIN packages p ON p.id = pv.package_id
               WHERE p.id = $1 AND pv.version = $2 AND p.visibility = 'public'`
            : `SELECT pv.*, p.name as package_name FROM package_versions pv
               JOIN packages p ON p.id = pv.package_id
               WHERE p.name = $1 AND pv.version = $2 AND p.visibility = 'public'`,
          [packageName, version]
        );
      }

      if (!pkgVersion) {
        return reply.status(404).send({ error: 'Package version not found' });
      }

      // For seeded packages with content in metadata, serve as gzipped content
      if (pkgVersion.metadata && typeof pkgVersion.metadata === 'object' && 'content' in pkgVersion.metadata) {
        let content = (pkgVersion.metadata as { content: string }).content;

        // If content is empty or just "---", try to fetch from repository URL
        if (!content || content.trim() === '' || content.trim() === '---') {
          const metadata = pkgVersion.metadata as { sourceUrl?: string; content?: string };
          if (metadata.sourceUrl) {
            try {
              // Convert GitHub blob URL to raw URL
              let rawUrl = metadata.sourceUrl;
              if (rawUrl.includes('github.com') && rawUrl.includes('/blob/')) {
                rawUrl = rawUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
              }

              const response = await fetch(rawUrl);
              if (response.ok) {
                content = await response.text();
              } else {
                server.log.warn(`Failed to fetch content from ${rawUrl}: ${response.status}`);
              }
            } catch (error) {
              server.log.error({ error, sourceUrl: metadata.sourceUrl }, 'Error fetching content from GitHub');
            }
          }
        }

        // If we have valid content, serve it as gzipped
        if (content && content.trim() !== '' && content.trim() !== '---') {
          const zlib = await import('zlib');
          const gzipped = zlib.gzipSync(Buffer.from(content, 'utf-8'));

          const pkgName = (pkgVersion as any).package_name || packageName;
          reply.header('Content-Type', 'application/gzip');
          reply.header('Content-Disposition', `attachment; filename="${pkgName.replace(/[^a-z0-9-]/gi, '-')}-${version}.tar.gz"`);
          return reply.send(gzipped);
        }

        // If no valid content and no sourceUrl, fall through to check tarball_url
        // (Don't return 404 yet - the package might have a tarball in S3)
      }

      // For published packages with tarball_url, generate presigned download URL
      if (pkgVersion.tarball_url) {
        try {
          // Use package_id (UUID) for S3 key - this matches how uploadPackage stores files
          // Also pass package name to support legacy author-based paths
          const { getDownloadUrl } = await import('../storage/s3.js');
          const pkgName = (pkgVersion as any).package_name || packageName;
          const downloadUrl = await getDownloadUrl(server, pkgVersion.package_id, version, {
            packageName: pkgName
          });

          // Redirect to the presigned URL
          return reply.redirect(302, downloadUrl);
        } catch (error) {
          server.log.error({
            error,
            packageId: pkgVersion.package_id,
            version,
            packageName: (pkgVersion as any).package_name || packageName,
            tarballUrl: pkgVersion.tarball_url
          }, 'Failed to generate download URL - S3 file may be missing');

          return reply.status(404).send({
            error: 'Package file not found in storage',
            message: 'This package may need to be re-published. Please contact support or try again later.'
          });
        }
      }

      return reply.status(404).send({
        error: 'Package tarball not available',
        message: 'No package content or tarball URL found for this version.'
      });
    }

    // Regular version info request
    const version = versionParam;

    // Check cache (skip cache for authenticated requests to private packages)
    const cacheKey = `package:${packageName}:${version}`;
    if (!userId) {
      const cached = await cacheGet<PackageVersion>(server, cacheKey);
      if (cached) {
        return cached;
      }
    }

    let pkgVersion: PackageVersion | null = null;

    if (userId) {
      // For authenticated users, check if they have access to private packages
      pkgVersion = await queryOne<PackageVersion>(
        server,
        `SELECT pv.*, p.visibility FROM package_versions pv
         JOIN packages p ON p.id = pv.package_id
         LEFT JOIN organization_members om ON p.org_id = om.org_id AND om.user_id = $3
         WHERE p.name = $1 AND pv.version = $2
         AND (p.visibility = 'public'
              OR (p.visibility = 'private'
                  AND p.org_id IS NOT NULL
                  AND om.user_id IS NOT NULL))`,
        [packageName, version, userId]
      );
    } else {
      // For unauthenticated users, only show public packages
      pkgVersion = await queryOne<PackageVersion>(
        server,
        `SELECT pv.* FROM package_versions pv
         JOIN packages p ON p.id = pv.package_id
         WHERE p.name = $1 AND pv.version = $2 AND p.visibility = 'public'`,
        [packageName, version]
      );
    }

    if (!pkgVersion) {
      return reply.status(404).send({ error: 'Package version not found' });
    }

    // Transform tarball URL to registry download URL (same as package list endpoint)
    if (pkgVersion.tarball_url) {
      // Trust X-Forwarded-Proto header from reverse proxy for correct protocol
      const protocol = (request.headers['x-forwarded-proto'] as string) || request.protocol;
      const host = request.headers.host || `localhost:${config.port}`;
      const baseUrl = `${protocol}://${host}`;
      const encodedPackageName = encodeURIComponent(packageName);
      pkgVersion.tarball_url = `${baseUrl}/api/v1/packages/${encodedPackageName}/${pkgVersion.version}.tar.gz`;
    }

    // Only cache public packages (private packages should not be cached)
    if ((pkgVersion as any).visibility === 'public') {
      await cacheSet(server, cacheKey, pkgVersion, 3600);
    }

    return pkgVersion;
  });

  // Publish package (authenticated)
  server.post('/', {
    onRequest: [server.authenticate],
    // No schema - multipart doesn't set request.body for validation
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.user_id;

    // Check if this is multipart or JSON
    const isMultipart = request.headers['content-type']?.includes('multipart/form-data');

    let manifest: Record<string, unknown>;
    let tarballBuffer: Buffer;

    if (isMultipart) {
      // Handle multipart upload (from CLI)
      let manifestStr: string | undefined;
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'manifest') {
          manifestStr = part.value as string;
        } else if (part.type === 'file' && part.fieldname === 'tarball') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          tarballBuffer = Buffer.concat(chunks);
        }
      }

      if (!manifestStr) {
        return reply.status(400).send({ error: 'Missing manifest field' });
      }

      try {
        manifest = JSON.parse(manifestStr);
      } catch {
        return reply.status(400).send({ error: 'Invalid manifest JSON' });
      }

      if (!tarballBuffer!) {
        return reply.status(400).send({ error: 'Missing tarball file' });
      }
    } else {
      // Handle JSON upload (legacy)
      const body = request.body as {
        manifest: Record<string, unknown>;
        tarball: string;
        readme?: string;
      };

      manifest = body.manifest;
      const tarballBase64 = body.tarball;

      if (!manifest || !tarballBase64) {
        return reply.status(400).send({ error: 'Missing manifest or tarball' });
      }

      tarballBuffer = Buffer.from(tarballBase64, 'base64');
    }

    try {
      // 1. Validate manifest
      let packageName = manifest.name as string;
      const version = manifest.version as string;
      const displayName = manifest.displayName as string | undefined;
      const description = manifest.description as string;
      const format = manifest.format as string;
      const subtype = (manifest.subtype as string) || 'rule';
      const organization = manifest.organization as string | undefined;
      const license = manifest.license as string | undefined;
      const tags = (manifest.tags as string[]) || [];
      const keywords = (manifest.keywords as string[]) || [];
      const language = manifest.language as string | undefined;
      const framework = manifest.framework as string | undefined;
      const isPrivate = manifest.private === true; // Explicitly extract private field

      if (!packageName || !version || !description || !format) {
        return reply.status(400).send({
          error: 'Invalid manifest',
          message: 'Missing required fields: name, version, description, or format'
        });
      }

      // Fetch user info for scoping and validation
      const user = await queryOne<{ username: string }>(
        server,
        'SELECT username FROM users WHERE id = $1',
        [userId]
      );

      if (!user) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Could not fetch user information'
        });
      }

      const usernameLowercase = user.username.toLowerCase();

      // Auto-prefix package name with scope and validate ownership
      // If organization is specified, use @org-name/, otherwise use @username/
      if (organization) {
        // Organization packages: @org-name/package
        const orgNameLowercase = organization.toLowerCase();
        const expectedPrefix = `@${orgNameLowercase}/`;
        if (!packageName.startsWith(expectedPrefix)) {
          // Auto-prefix the package name
          packageName = `${expectedPrefix}${packageName}`;
          server.log.info({ originalName: manifest.name, newName: packageName }, 'Auto-prefixed package name with organization');
        }
      } else if (!packageName.startsWith('@')) {
        // Author packages: @username/package (if not already scoped)
        packageName = `@${usernameLowercase}/${packageName}`;
        server.log.info({ originalName: manifest.name, newName: packageName }, 'Auto-prefixed package name with author username');
      } else {
        // Package already has a scope - validate the user owns this scope
        // Extract scope from package name (e.g., "@alice/package" -> "alice")
        const scopeMatch = packageName.match(/^@([a-z0-9-]+)\//);
        if (scopeMatch) {
          const scopeUsername = scopeMatch[1];
          if (scopeUsername !== usernameLowercase) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: `You cannot publish packages under @${scopeUsername}/ scope. You can only publish under @${usernameLowercase}/ or specify an organization you belong to.`
            });
          }
        }
      }

      // Validate package name format
      if (!/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(packageName)) {
        return reply.status(400).send({
          error: 'Invalid package name',
          message: 'Package name must be lowercase alphanumeric with hyphens only'
        });
      }

      // Validate semver version
      if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version)) {
        return reply.status(400).send({
          error: 'Invalid version',
          message: 'Version must be valid semver (e.g., 1.0.0)'
        });
      }

      // Lookup organization if specified (case-insensitive)
      let orgId: string | undefined;
      let orgVerified: boolean = false;
      if (organization) {
        const org = await queryOne<{ id: string; verified: boolean }>(
          server,
          'SELECT id, is_verified as verified FROM organizations WHERE LOWER(name) = LOWER($1)',
          [organization]
        );

        if (!org) {
          return reply.status(404).send({
            error: 'Organization not found',
            message: `Organization '${organization}' does not exist`
          });
        }

        orgId = org.id;
        orgVerified = org.verified || false;

        // Verify user has permission to publish to this org
        const orgMembership = await queryOne<{ role: string }>(
          server,
          `SELECT role FROM organization_members
           WHERE org_id = $1 AND user_id = $2`,
          [orgId, userId]
        );

        if (!orgMembership) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `You are not a member of the '${organization}' organization`,
          });
        }

        if (!['owner', 'admin', 'maintainer'].includes(orgMembership.role)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `You do not have permission to publish packages for the '${organization}' organization. Required role: owner, admin, or maintainer. Your role: ${orgMembership.role}`,
          });
        }

        // Check if trying to publish private package with unverified organization
        if (isPrivate && !orgVerified) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: `Cannot publish private packages for unverified organization '${organization}'. Only verified organizations can publish private packages. Please contact support to verify your organization.`,
          });
        }
      }

      // 2. Check if package exists and user has permission
      let pkg = await queryOne<Package>(
        server,
        'SELECT * FROM packages WHERE name = $1',
        [packageName]
      );

      if (pkg) {
        // Package exists - check ownership
        // Allow if: user is author, user is admin, OR package belongs to org and user is org member with publish rights
        let hasPermission = false;

        if (pkg.author_id === userId || request.user.is_admin) {
          hasPermission = true;
        } else if (pkg.org_id) {
          // Package belongs to an organization - check if user is a member with publish rights
          const orgMembership = await queryOne<{ role: string }>(
            server,
            `SELECT role FROM organization_members
             WHERE org_id = $1 AND user_id = $2`,
            [pkg.org_id, userId]
          );

          if (orgMembership && ['owner', 'admin', 'maintainer'].includes(orgMembership.role)) {
            hasPermission = true;
          }
        }

        if (!hasPermission) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to publish to this package'
          });
        }

        // Check if version already exists
        const existingVersion = await queryOne(
          server,
          'SELECT version FROM package_versions WHERE package_id = $1 AND version = $2',
          [pkg.id, version]
        );

        if (existingVersion) {
          return reply.status(409).send({
            error: 'Version already exists',
            message: `Version ${version} of ${packageName} already exists. Use a new version number.`
          });
        }
      } else {
        // New package - create it
        // Determine visibility: private field in manifest maps to visibility in database
        const visibility = isPrivate ? 'private' : 'public';

        server.log.debug({
          packageName,
          manifestPrivate: isPrivate,
          calculatedVisibility: visibility,
        }, '📝 Creating new package with visibility');

        pkg = await queryOne<Package>(
          server,
          `INSERT INTO packages (
            name, display_name, description, author_id, org_id, format, subtype,
            license, tags, keywords, language, framework, visibility, last_published_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
           RETURNING *`,
          [
            packageName,
            displayName || null,
            description,
            userId,                 // Always record the author (person who published)
            orgId || null,          // Set org_id if publishing to org (org takes precedence for ownership)
            format,
            subtype,
            license || null,
            tags,
            keywords,
            language || null,
            framework || null,
            visibility,
          ]
        );

        if (!pkg) {
          throw new Error('Failed to create package record');
        }

        server.log.info({ packageName, userId }, 'Created new package');
      }

      // 3. Extract file metadata and content from tarball
      interface FileMetadata {
        path: string;
        size: number;
        type: 'file' | 'directory' | 'symlink';
      }

      const files: FileMetadata[] = [];
      let fullContent = '';

      try {
        // @ts-ignore - tar-stream doesn't have types
        const tar = await import('tar-stream');
        const zlib = await import('zlib');
        const { Readable } = await import('stream');

        const extract = tar.extract();

        extract.on('entry', (header: any, stream: any, next: any) => {
          // Record file metadata
          files.push({
            path: header.name,
            size: header.size || 0,
            type: header.type === 'directory' ? 'directory' : header.type === 'symlink' ? 'symlink' : 'file'
          });

          // Collect file content for full_content column
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            if (header.type === 'file') {
              const content = Buffer.concat(chunks).toString('utf-8');
              fullContent += `\n\n=== ${header.name} ===\n${content}`;
            }
            next();
          });
          stream.resume();
        });

        // Decompress and extract tarball to get file list and content
        await new Promise((resolve, reject) => {
          extract.on('finish', resolve);
          extract.on('error', reject);
          Readable.from(tarballBuffer)
            .pipe(zlib.createGunzip())
            .pipe(extract);
        });

        server.log.info({ packageName, fileCount: files.length, contentLength: fullContent.length }, 'Extracted file metadata and content from tarball');
      } catch (error) {
        server.log.warn({ packageName, error }, 'Failed to extract file metadata from tarball');
        // Continue with publish even if file extraction fails
      }

      // 4. Upload tarball to S3 using package name for human-readable paths
      const { uploadPackage } = await import('../storage/s3.js');
      const { url: tarballUrl, hash: tarballHash, size } = await uploadPackage(
        server,
        packageName,  // Use package name for S3 path (e.g., @author/package)
        version,
        tarballBuffer,
        { packageId: pkg.id }  // Pass UUID for metadata
      );

      // 5. Create package version record with file metadata
      const packageVersion = await queryOne(
        server,
        `INSERT INTO package_versions (
          package_id, version, tarball_url, content_hash, file_size,
          published_at, metadata
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        RETURNING *`,
        [
          pkg.id,
          version,
          tarballUrl,
          tarballHash,
          size,
          JSON.stringify({ manifest, readme: undefined, files })
        ]
      );

      // Update package updated_at, last_published_at, and full_content (always use latest version content)
      await query(
        server,
        'UPDATE packages SET last_published_at = NOW(), updated_at = NOW(), full_content = $2 WHERE id = $1',
        [pkg.id, fullContent || null]
      );

      // 6. Calculate quality score and extract metadata (async, don't block response)
      server.log.info({ packageId: pkg.id }, '🎯 Starting quality score calculation and metadata extraction');
      // Use the already-extracted content to avoid re-processing the tarball
      const packageContentForScoring = fullContent;
      (async () => {
        try {
          const { updatePackageQualityScore } = await import('../scoring/quality-scorer.js');
          const { getDetailedAIEvaluation, extractMetadataWithAI, generateDisplayName } = await import('../scoring/ai-evaluator.js');

          if (packageContentForScoring) {
            // Get AI evaluation for explanation
            const evaluation = await getDetailedAIEvaluation(packageContentForScoring, server);
            const explanation = `${evaluation.reasoning}\n\nStrengths: ${evaluation.strengths.join(', ')}\n\nWeaknesses: ${evaluation.weaknesses.join(', ') || 'None identified'}`;

            // Calculate quality score with the extracted content
            const qualityScore = await updatePackageQualityScore(server, pkg.id, packageContentForScoring);

            // Get current package data to check what metadata needs extraction
            const currentPkg = await queryOne<{
              category: string | null;
              display_name: string | null;
            }>(
              server,
              'SELECT category, display_name FROM packages WHERE id = $1',
              [pkg.id]
            );

            // Generate display name if not provided
            let generatedDisplayName: string | undefined;
            if (!displayName && !currentPkg?.display_name) {
              generatedDisplayName = await generateDisplayName(
                packageName,
                description,
                packageContentForScoring,
                server
              );
            }

            // Extract metadata if not already provided
            const needsMetadata = !language || !framework || !currentPkg?.category;
            let extractedMetadata: AIMetadataResult = {};
            if (needsMetadata) {
              extractedMetadata = await extractMetadataWithAI(
                packageContentForScoring,
                {
                  language: language || undefined,
                  framework: framework || undefined,
                  category: currentPkg?.category || undefined,
                  tags,
                  description,
                },
                server
              );
            }

            // Build update query dynamically based on what needs updating
            const updates: string[] = ['quality_explanation = $1'];
            const params: any[] = [explanation];
            let paramIndex = 2;

            if (generatedDisplayName) {
              updates.push(`display_name = $${paramIndex++}`);
              params.push(generatedDisplayName);
            }
            if (!language && extractedMetadata.language) {
              updates.push(`language = $${paramIndex++}`);
              params.push(extractedMetadata.language);
            }
            if (!framework && extractedMetadata.framework) {
              updates.push(`framework = $${paramIndex++}`);
              params.push(extractedMetadata.framework);
            }
            if (!currentPkg?.category && extractedMetadata.category) {
              updates.push(`category = $${paramIndex++}`);
              params.push(extractedMetadata.category);
            }

            params.push(pkg.id);

            // Update with explanation and extracted metadata
            await query(
              server,
              `UPDATE packages SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
              params
            );

            server.log.info(
              {
                packageId: pkg.id,
                qualityScore,
                explanationLength: explanation.length,
                extractedMetadata,
                generatedDisplayName,
              },
              '✅ Quality score, explanation, metadata, and display name updated'
            );
          }
        } catch (error) {
          server.log.error(
            { packageId: pkg.id, error: String(error) },
            '⚠️  Failed to calculate quality score or extract metadata (non-blocking)'
          );
        }
      })();

      // 6. Invalidate caches
      await cacheDelete(server, `package:${packageName}`);
      await cacheDelete(server, `package:${packageName}:${version}`);
      await cacheDeletePattern(server, `packages:list:*`);

      server.log.info({ packageName, version, userId }, 'Package published successfully');

      // 7. Generate embedding asynchronously (non-blocking)
      // Only attempt if OpenAI API key is configured
      if (process.env.OPENAI_API_KEY) {
        (async () => {
          try {
            const embeddingService = new EmbeddingGenerationService(server);
            const result = await embeddingService.generatePackageEmbedding({
              package_id: pkg.id,
              force_regenerate: true // Always regenerate on publish
            });

            if (result.success && !result.skipped) {
              server.log.info({ packageId: pkg.id, packageName }, 'Embedding generated on publish');
            } else if (result.error) {
              server.log.warn({ packageId: pkg.id, packageName, error: result.error }, 'Failed to generate embedding on publish (non-blocking)');
            }
          } catch (error) {
            server.log.warn({ packageId: pkg.id, packageName, error: String(error) }, 'Exception generating embedding on publish (non-blocking)');
          }
        })();
      } else {
        server.log.debug({ packageId: pkg.id }, 'Skipping embedding generation - OPENAI_API_KEY not configured');
      }

      return reply.send({
        success: true,
        package_id: pkg.id,
        name: packageName,
        version,
        tarball_url: tarballUrl,
        message: `Successfully published ${packageName}@${version}`
      });
    } catch (error: unknown) {
      server.log.error({ error: String(error) }, 'Failed to publish package');
      return reply.status(500).send({
        error: 'Failed to publish package',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Unpublish version (authenticated)
  server.delete('/:packageName/:version', {
    onRequest: [server.authenticate],
    schema: {
      tags: ['packages'],
      description: 'Unpublish a package version',
      params: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
          version: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.user_id;
    const { packageName, version } = request.params as { packageName: string; version: string };

    // Check ownership
    const pkg = await queryOne<Package>(
      server,
      'SELECT * FROM packages WHERE name = $1',
      [packageName]
    );

    if (!pkg) {
      return reply.status(404).send({ error: 'Package not found' });
    }

    if (pkg.author_id !== userId && !request.user.is_admin) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    // Delete version (use UUID for FK)
    const result = await query(
      server,
      'DELETE FROM package_versions WHERE package_id = $1 AND version = $2',
      [pkg.id, version]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'Version not found' });
    }

    // Invalidate caches
    await cacheDelete(server, `package:${packageName}`);
    await cacheDelete(server, `package:${packageName}:${version}`);
    await cacheDeletePattern(server, `packages:list:*`);

    return { success: true, message: 'Version unpublished' };
  });

  // Get package download stats
  server.get('/:packageName/stats', {
    schema: {
      tags: ['packages'],
      description: 'Get package download statistics',
      params: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30, minimum: 1, maximum: 365 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageName } = request.params as { packageName: string };
    const { days = 30 } = request.query as { days?: number };

    // Lookup package UUID by name
    const pkg = await queryOne<Package>(
      server,
      'SELECT id FROM packages WHERE name = $1',
      [packageName]
    );

    if (!pkg) {
      return reply.status(404).send({ error: 'Package not found' });
    }

    const result = await query(
      server,
      `SELECT date, total_downloads as downloads
       FROM package_stats
       WHERE package_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY date ASC`,
      [pkg.id]
    );

    return { stats: result.rows };
  });

  // Get trending packages
  server.get('/trending', {
    schema: {
      tags: ['packages'],
      description: 'Get trending packages based on recent download growth',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          days: { type: 'number', default: 7, minimum: 1, maximum: 30 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = 20, days = 7 } = request.query as {
      limit?: number;
      days?: number;
    };

    const cacheKey = `packages:trending:${limit}:${days}`;
    const cached = await cacheGet(server, cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate trending score based on recent downloads vs historical average
    const result = await query<Package>(
      server,
      `SELECT ${LIST_COLUMNS},
        p.downloads_last_7_days as recent_downloads
       FROM packages p
       WHERE p.visibility = 'public'
         AND p.downloads_last_7_days > 0
       ORDER BY p.trending_score DESC, p.downloads_last_7_days DESC
       LIMIT $1`,
      [limit]
    );

    const response = {
      packages: result.rows,
      total: result.rows.length,
      period: `${days} days`,
    };

    await cacheSet(server, cacheKey, response, 300); // Cache for 5 minutes
    return response;
  });

  // Get popular packages
  server.get('/popular', {
    schema: {
      tags: ['packages'],
      description: 'Get most popular packages by total downloads',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          format: { type: 'string', enum: FORMAT_ENUM },
          subtype: { type: 'string', enum: SUBTYPE_ENUM },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = 20, format, subtype } = request.query as {
      limit?: number;
      format?: string;
      subtype?: string;
    };

    const cacheKey = `packages:popular:${limit}:${format || 'all'}:${subtype || 'all'}`;
    const cached = await cacheGet(server, cacheKey);
    if (cached) {
      return cached;
    }

    const conditions: string[] = ["visibility = 'public'"];
    const params: unknown[] = [limit];
    let paramIndex = 2;

    if (format) {
      conditions.push(`format = $${paramIndex++}`);
      params.push(format);
    }

    if (subtype) {
      conditions.push(`subtype = $${paramIndex++}`);
      params.push(subtype);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query<Package>(
      server,
      `SELECT ${LIST_COLUMNS}
       FROM packages p
       WHERE ${whereClause}
       ORDER BY p.total_downloads DESC, p.install_count DESC
       LIMIT $1`,
      params
    );

    const response = {
      packages: result.rows,
      total: result.rows.length,
    };

    await cacheSet(server, cacheKey, response, 600); // Cache for 10 minutes
    return response;
  });

  // Get package versions list
  server.get('/:packageName/versions', {
    schema: {
      tags: ['packages'],
      description: 'Get all available versions for a package',
      params: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
        },
        required: ['packageName'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageName } = request.params as { packageName: string };

    const cacheKey = `package:${packageName}:versions`;
    const cached = await cacheGet(server, cacheKey);
    if (cached) {
      return cached;
    }

    // Lookup package UUID by name
    const pkg = await queryOne<Package>(
      server,
      'SELECT id FROM packages WHERE name = $1',
      [packageName]
    );

    if (!pkg) {
      return reply.status(404).send({ error: 'Package not found' });
    }

    const result = await query<{ version: string; published_at: string; is_prerelease: boolean }>(
      server,
      `SELECT version, published_at, is_prerelease
       FROM package_versions
       WHERE package_id = $1
       ORDER BY published_at DESC`,
      [pkg.id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Package not found' });
    }

    const response = {
      package_id: pkg.id,
      package_name: packageName,
      versions: result.rows,
      total: result.rows.length,
    };

    await cacheSet(server, cacheKey, response, 300); // Cache for 5 minutes
    return response;
  });

  // Get package dependencies
  server.get('/:packageName/:version/dependencies', {
    schema: {
      tags: ['packages'],
      description: 'Get dependencies for a specific package version',
      params: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
          version: { type: 'string' },
        },
        required: ['packageName', 'version'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageName, version } = request.params as {
      packageName: string;
      version: string;
    };

    const cacheKey = `package:${packageName}:${version}:deps`;
    const cached = await cacheGet(server, cacheKey);
    if (cached) {
      return cached;
    }

    // Lookup package UUID by name
    const pkg = await queryOne<Package>(
      server,
      'SELECT id FROM packages WHERE name = $1',
      [packageName]
    );

    if (!pkg) {
      return reply.status(404).send({ error: 'Package not found' });
    }

    const result = await queryOne<{
      dependencies: Record<string, string> | null;
      peer_dependencies: Record<string, string> | null;
    }>(
      server,
      `SELECT dependencies, peer_dependencies
       FROM package_versions
       WHERE package_id = $1 AND version = $2`,
      [pkg.id, version]
    );

    if (!result) {
      return reply.code(404).send({ error: 'Package version not found' });
    }

    const response = {
      package_id: pkg.id,
      package_name: packageName,
      version,
      dependencies: result.dependencies || {},
      peerDependencies: result.peer_dependencies || {},
    };

    await cacheSet(server, cacheKey, response, 600); // Cache for 10 minutes
    return response;
  });

  // Resolve dependency tree
  server.get('/:packageName/resolve', {
    schema: {
      tags: ['packages'],
      description: 'Resolve complete dependency tree for a package',
      params: {
        type: 'object',
        properties: {
          packageName: { type: 'string' },
        },
        required: ['packageName'],
      },
      querystring: {
        type: 'object',
        properties: {
          version: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { packageName } = request.params as { packageName: string };
    const { version } = request.query as { version?: string };

    try {
      const resolved = await resolveDependencyTree(server, packageName, version);
      return {
        package_name: packageName,
        version: version || 'latest',
        resolved: resolved.resolved,
        tree: resolved.tree,
      };
    } catch (error: unknown) {
      const err = toError(error);
      return reply.code(500).send({
        error: 'Failed to resolve dependencies',
        message: err.message,
      });
    }
  });

  /**
   * GET /packages/:id/related
   * Get packages that are frequently installed together with this package
   */
  server.get(
    '/:id/related',
    {
      schema: {
        description: 'Get related packages based on co-installation patterns',
        tags: ['packages', 'recommendations'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Package ID or name (e.g., "@username/package-name")',
            },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 10,
              description: 'Maximum number of related packages to return',
            },
            min_confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              default: 10,
              description: 'Minimum confidence score (0-100)',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const {
        limit = 10,
        min_confidence = 10,
      } = request.query as { limit?: number; min_confidence?: number };

      try {
        // Get the package by ID or name
        const packageResult = await server.pg.query(
          `SELECT id, name, description
           FROM packages
           WHERE id::text = $1 OR name = $1
           AND visibility = 'public'
           AND deprecated = FALSE
           LIMIT 1`,
          [id]
        );

        if (packageResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `Package '${id}' not found`,
          });
        }

        const pkg = packageResult.rows[0];

        // Get related packages using the co-installations table
        // Query both directions (package_a and package_b)
        const relatedResult = await server.pg.query(
          `SELECT DISTINCT
            CASE
              WHEN pc.package_a_id = $1 THEN pb.id
              ELSE pa.id
            END as id,
            CASE
              WHEN pc.package_a_id = $1 THEN pb.name
              ELSE pa.name
            END as name,
            CASE
              WHEN pc.package_a_id = $1 THEN pb.description
              ELSE pa.description
            END as description,
            pc.confidence_score,
            pc.co_install_count,
            CASE
              WHEN pc.package_a_id = $1 THEN pb.total_downloads
              ELSE pa.total_downloads
            END as total_downloads,
            CASE
              WHEN pc.package_a_id = $1 THEN pb.quality_score
              ELSE pa.quality_score
            END as quality_score,
            CASE
              WHEN pc.package_a_id = $1 THEN pb.tags
              ELSE pa.tags
            END as tags
           FROM package_co_installations pc
           LEFT JOIN packages pa ON pc.package_a_id = pa.id
           LEFT JOIN packages pb ON pc.package_b_id = pb.id
           WHERE (pc.package_a_id = $1 OR pc.package_b_id = $1)
           AND pc.confidence_score >= $2
           AND ((pa.visibility = 'public' AND pa.deprecated = FALSE)
                OR (pb.visibility = 'public' AND pb.deprecated = FALSE))
           ORDER BY pc.confidence_score DESC, total_downloads DESC
           LIMIT $3`,
          [pkg.id, min_confidence, limit]
        );

        return {
          package: {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
          },
          related: relatedResult.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description || '',
            confidence_score: parseFloat(row.confidence_score),
            co_install_count: row.co_install_count,
            total_downloads: row.total_downloads || 0,
            quality_score: row.quality_score ? parseFloat(row.quality_score) : null,
            tags: row.tags || [],
          })),
        };
      } catch (error) {
        server.log.error(error, 'Failed to fetch related packages');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch related packages',
        });
      }
    }
  );

  /**
   * GET /packages/ssg-data
   * Get all public packages with full content for static site generation
   * Used by webapp during build for generateStaticParams
   * REQUIRES: X-SSG-Token header for authentication
   * RATE LIMITING: Exempt from global rate limits (see index.ts allowList)
   * PAGINATION: Default 500 packages per request (max 1000 to avoid payload size issues)
   *             With 7000+ packages: ~8-14 requests needed to fetch all
   * PAYLOAD SIZE: ~500 packages × ~10KB avg = ~5MB response (safe for JSON parsing)
   */
  server.get(
    '/ssg-data',
    {
      schema: {
        tags: ['packages'],
        description: 'Get all packages with full content for SSG (requires X-SSG-Token header)',
        headers: {
          type: 'object',
          properties: {
            'x-ssg-token': { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string' },
            limit: { type: 'number', default: 500, minimum: 1, maximum: 1000 },
            offset: { type: 'number', default: 0, minimum: 0 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { format?: string; limit?: number; offset?: number } }>, reply: FastifyReply) => {
      try {
        // Authenticate SSG token
        const ssgToken = request.headers['x-ssg-token'];
        const expectedToken = process.env.SSG_DATA_TOKEN;

        if (!expectedToken) {
          server.log.error('SSG_DATA_TOKEN environment variable not configured');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'SSG endpoint not properly configured',
          });
        }

        if (!ssgToken || ssgToken !== expectedToken) {
          server.log.warn({ ip: request.ip }, 'Unauthorized SSG data access attempt');
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Valid X-SSG-Token header required',
          });
        }

        const { format, limit = 500, offset = 0 } = request.query;

        server.log.info({ format, limit, offset }, 'Fetching SSG data');

        // Build WHERE clause
        // NOTE: Includes deprecated packages - they still have pages, just with deprecation warnings
        const conditions: string[] = ["visibility = 'public'"];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (format) {
          conditions.push(`format = $${paramIndex++}`);
          params.push(format);
        }

        // Get total count for pagination
        const countResult = await query<{ total: string }>(
          server,
          `SELECT COUNT(*) as total FROM packages p WHERE ${conditions.join(' AND ')}`,
          params.slice(0, paramIndex - 1) // Only use WHERE clause params
        );
        const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

        // Add limit and offset
        const limitIndex = paramIndex++;
        const offsetIndex = paramIndex++;
        params.push(limit);
        params.push(offset);

        // Get public packages with minimal fields + full_content (paginated)
        // Exclude: monthly_downloads, quality_score, keywords, created_at, updated_at, snippet (not displayed on SEO page)
        const result = await query(
          server,
          `SELECT
            p.id,
            p.name,
            p.display_name,
            p.description,
            p.format,
            p.subtype,
            p.category,
            p.tags,
            p.license,
            p.repository_url,
            p.homepage_url,
            p.documentation_url,
            p.total_downloads,
            p.weekly_downloads,
            p.version_count,
            p.stars,
            p.rating_average,
            p.rating_count,
            p.verified,
            p.featured,
            p.deprecated,
            p.deprecated_reason,
            p.full_content,
            u.username as author_username,
            pv.version as latest_version,
            pv.metadata as latest_version_metadata,
            pv.file_size,
            pv.downloads as version_downloads,
            pv.changelog,
            pv.published_at as version_published_at
          FROM packages p
          LEFT JOIN users u ON p.author_id = u.id
          LEFT JOIN LATERAL (
            SELECT version, metadata, file_size, downloads, changelog, published_at
            FROM package_versions
            WHERE package_id = p.id
            ORDER BY published_at DESC
            LIMIT 1
          ) pv ON true
          WHERE ${conditions.join(' AND ')}
          ORDER BY p.total_downloads DESC, p.id ASC
          LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
          params
        );

        const packages = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          display_name: row.display_name,
          description: row.description,
          format: row.format,
          subtype: row.subtype,
          category: row.category,
          tags: row.tags || [],
          license: row.license,
          repository_url: row.repository_url,
          homepage_url: row.homepage_url,
          documentation_url: row.documentation_url,
          total_downloads: row.total_downloads || 0,
          weekly_downloads: row.weekly_downloads || 0,
          version_count: row.version_count || 0,
          stars: row.stars || 0,
          rating_average: row.rating_average ? parseFloat(row.rating_average) : null,
          rating_count: row.rating_count || 0,
          verified: row.verified || false,
          featured: row.featured || false,
          deprecated: row.deprecated || false,
          deprecated_reason: row.deprecated_reason,
          fullContent: row.full_content, // Include full content - essential for page rendering
          author: row.author_username ? { username: row.author_username } : null,
          latest_version: row.latest_version ? {
            version: row.latest_version,
            metadata: row.latest_version_metadata,
            file_size: row.file_size,
            downloads: row.version_downloads || 0,
            changelog: row.changelog,
            published_at: row.version_published_at,
          } : null,
        }));

        server.log.info({
          count: packages.length,
          total: totalCount,
          offset,
          limit
        }, 'SSG data fetched successfully');

        return {
          packages,
          total: totalCount, // Total count across all pages
          count: packages.length, // Count in this page
          limit,
          offset,
          hasMore: offset + packages.length < totalCount,
          generated_at: new Date().toISOString(),
        };
      } catch (error) {
        server.log.error(error, 'Failed to fetch SSG data');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch SSG data',
        });
      }
    }
  );

  /**
   * POST /packages/installations/track
   * Track a package installation for co-installation analysis
   * Called by CLI after successful package install
   */
  server.post(
    '/installations/track',
    {
      schema: {
        description: 'Track package installation for analytics (anonymized)',
        tags: ['installations', 'analytics'],
        body: {
          type: 'object',
          required: ['package_id', 'version', 'session_id'],
          properties: {
            package_id: {
              type: 'string',
              description: 'Package ID or name',
            },
            version: {
              type: 'string',
              description: 'Installed version',
            },
            session_id: {
              type: 'string',
              description: 'Anonymous session identifier (generated by CLI)',
            },
            format: {
              type: 'string',
              description: 'Installation format (cursor, claude, etc.)',
            },
            install_batch_id: {
              type: 'string',
              description: 'Batch ID if installing multiple packages at once',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        package_id,
        version,
        session_id,
        format,
        install_batch_id,
      } = request.body as {
        package_id: string;
        version: string;
        session_id: string;
        format?: string;
        install_batch_id?: string;
      };

      try {
        // Resolve package ID from name if needed
        const pkgResult = await server.pg.query(
          `SELECT id FROM packages WHERE id::text = $1 OR name = $1 LIMIT 1`,
          [package_id]
        );

        if (pkgResult.rows.length === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: `Package '${package_id}' not found`,
          });
        }

        const resolvedPackageId = pkgResult.rows[0].id;

        // Track the installation
        await server.pg.query(
          `INSERT INTO package_installations
           (package_id, version, session_id, format, install_batch_id, installed_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [resolvedPackageId, version, session_id, format || null, install_batch_id || null]
        );

        return reply.code(201).send({
          success: true,
          message: 'Installation tracked successfully',
        });
      } catch (error) {
        server.log.error(error, 'Failed to track installation');
        // Don't fail the install if tracking fails
        return reply.code(201).send({
          success: false,
          message: 'Installation tracking skipped',
        });
      }
    }
  );

  /**
   * POST /api/v1/packages/:packageId/star
   * Star/unstar a package
   */
  server.post(
    '/:packageId/star',
    {
      onRequest: [server.authenticate],
      schema: {
        description: 'Star or unstar a package',
        tags: ['packages', 'stars'],
        params: {
          type: 'object',
          required: ['packageId'],
          properties: {
            packageId: { type: 'string', description: 'Package ID (UUID)' },
          },
        },
        body: {
          type: 'object',
          required: ['starred'],
          properties: {
            starred: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { packageId } = request.params as { packageId: string };
      const { starred } = request.body as { starred: boolean };
      const user = request.user;

      try {
        // Check if package exists first to avoid foreign key constraint violation
        const pkgCheck = await server.pg.query(
          `SELECT id, visibility FROM packages WHERE id = $1`,
          [packageId]
        );

        if (pkgCheck.rows.length === 0) {
          return reply.status(404).send({
            error: 'Package not found',
          });
        }

        if (starred) {
          // Add star
          await server.pg.query(
            `
            INSERT INTO package_stars (package_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `,
            [packageId, user.user_id]
          );
        } else {
          // Remove star
          await server.pg.query(
            `
            DELETE FROM package_stars
            WHERE package_id = $1 AND user_id = $2
          `,
            [packageId, user.user_id]
          );
        }

        // Get updated star count
        const result = await server.pg.query(
          `SELECT stars FROM packages WHERE id = $1`,
          [packageId]
        );

        return reply.send({
          starred,
          stars: result.rows[0]?.stars || 0,
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          error: 'Failed to star package',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * GET /api/v1/packages/starred
   * Get user's starred packages
   */
  server.get(
    '/starred',
    {
      onRequest: [server.authenticate],
      schema: {
        description: 'Get packages starred by the current user',
        tags: ['packages', 'stars'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
            offset: { type: 'number', default: 0, minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };
      const user = request.user;

      try {
        const result = await server.pg.query(
          `
          SELECT
            p.*,
            ps.starred_at,
            u.username as author_username,
            u.verified_author,
            u.avatar_url as author_avatar_url,
            o.name as org_name,
            o.is_verified as org_verified,
            o.avatar_url as org_avatar_url
          FROM package_stars ps
          JOIN packages p ON ps.package_id = p.id
          LEFT JOIN users u ON p.author_id = u.id
          LEFT JOIN organizations o ON p.org_id = o.id
          WHERE ps.user_id = $1
          ORDER BY ps.starred_at DESC
          LIMIT $2 OFFSET $3
        `,
          [user.user_id, limit, offset]
        );

        const packages = result.rows.map((row) => ({
          ...row,
          author: row.author_username ? {
            username: row.author_username,
            verified_author: row.verified_author,
            avatar_url: row.author_avatar_url,
          } : null,
          organization: row.org_name ? {
            name: row.org_name,
            is_verified: row.org_verified,
            avatar_url: row.org_avatar_url,
          } : null,
        }));

        return reply.send({
          packages,
          total: packages.length,
        });
      } catch (error) {
        server.log.error(error);
        return reply.status(500).send({
          error: 'Failed to get starred packages',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
}

/**
 * Resolve dependency tree recursively
 */
interface DependencyTreeNode {
  version: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

async function resolveDependencyTree(
  server: FastifyInstance,
  packageName: string,
  version?: string
): Promise<{
  resolved: Record<string, string>;
  tree: Record<string, DependencyTreeNode>;
}> {
  const resolved: Record<string, string> = {};
  const tree: Record<string, DependencyTreeNode> = {};

  async function resolve(pkgName: string, ver?: string, depth: number = 0): Promise<void> {
    // Prevent circular dependencies
    if (depth > 10) {
      throw new Error(`Circular dependency detected: ${pkgName}`);
    }

    // Lookup package by name to get UUID
    const pkg = await queryOne<{ id: string }>(
      server,
      'SELECT id FROM packages WHERE name = $1',
      [pkgName]
    );

    if (!pkg) {
      throw new Error(`Package not found: ${pkgName}`);
    }

    const pkgId = pkg.id;

    // Get package version info
    let actualVersion = ver;
    if (!actualVersion || actualVersion === 'latest') {
      const pkgResult = await queryOne<{ latest_version: string }>(
        server,
        `SELECT (SELECT version FROM package_versions WHERE package_id = $1 ORDER BY published_at DESC LIMIT 1) as latest_version`,
        [pkgId]
      );

      if (!pkgResult || !pkgResult.latest_version) {
        throw new Error(`Package not found: ${pkgName}`);
      }

      actualVersion = pkgResult.latest_version;
    }

    // Check if already resolved
    if (resolved[pkgName] && resolved[pkgName] === actualVersion) {
      return;
    }

    // Mark as resolved
    resolved[pkgName] = actualVersion;

    // Get dependencies
    const versionResult = await queryOne<{
      dependencies: Record<string, string> | null;
      peer_dependencies: Record<string, string> | null;
    }>(
      server,
      `SELECT dependencies, peer_dependencies
       FROM package_versions
       WHERE package_id = $1 AND version = $2`,
      [pkgId, actualVersion]
    );

    if (!versionResult) {
      throw new Error(`Version not found: ${pkgName}@${actualVersion}`);
    }

    const deps = versionResult.dependencies || {};
    const peerDeps = versionResult.peer_dependencies || {};

    // Add to tree
    tree[pkgName] = {
      version: actualVersion,
      dependencies: deps,
      peerDependencies: peerDeps,
    };

    // Resolve dependencies recursively (deps are specified by name)
    for (const [depName, depVersion] of Object.entries(deps)) {
      await resolve(depName, depVersion as string, depth + 1);
    }
  }

  await resolve(packageName, version);

  return { resolved, tree };
}
