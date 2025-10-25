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
import type {
  ListPackagesQuery,
  PackageParams,
  PackageVersionParams,
  TrendingQuery,
  ResolveQuery,
} from '../types/requests.js';

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
          format: { type: 'string', enum: ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'agents.md', 'generic', 'mcp'] },
          subtype: { type: 'string', enum: ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'] },
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

    // Build ORDER BY clause
    let orderBy = 'total_downloads DESC';
    switch (sort) {
      case 'created':
        orderBy = 'created_at DESC';
        break;
      case 'updated':
        orderBy = 'updated_at DESC';
        break;
      case 'quality':
        orderBy = 'quality_score DESC NULLS LAST';
        break;
      case 'rating':
        orderBy = 'rating_average DESC NULLS LAST';
        break;
    }

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      server,
      `SELECT COUNT(*) as count FROM packages ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get packages
    const result = await query<Package>(
      server,
      `SELECT * FROM packages
       ${whereClause}
       ORDER BY ${orderBy}
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

    // Decode URL-encoded package name (handles slashes in scoped packages)
    const packageName = decodeURIComponent(rawPackageName);

    // Check cache
    const cacheKey = `package:${packageName}`;
    const cached = await cacheGet<PackageInfo>(server, cacheKey);
    if (cached) {
      return cached;
    }

    // Get package
    const pkg = await queryOne<Package>(
      server,
      `SELECT * FROM packages WHERE name = $1 AND visibility = 'public'`,
      [packageName]
    );

    if (!pkg) {
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
    const protocol = request.protocol;
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

    // Cache for 5 minutes
    await cacheSet(server, cacheKey, packageInfo, 300);

    return packageInfo;
  });

  // Get specific package version
  server.get('/:packageName/:version', {
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

    // Decode URL-encoded package name (handles slashes in scoped packages)
    const packageName = decodeURIComponent(rawPackageName);

    // Check if this is a tarball download request (.tar.gz)
    if (versionParam.endsWith('.tar.gz')) {
      const version = versionParam.replace(/\.tar\.gz$/, '');

      // Check if packageName is a UUID (for tarball downloads by ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packageName);

      // Get package version with content
      const pkgVersion = await queryOne<PackageVersion>(
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

        // If still no content, return 404
        if (!content || content.trim() === '' || content.trim() === '---') {
          return reply.status(404).send({ error: 'Package content not available' });
        }

        const zlib = await import('zlib');
        const gzipped = zlib.gzipSync(Buffer.from(content, 'utf-8'));

        const pkgName = (pkgVersion as any).package_name || packageName;
        reply.header('Content-Type', 'application/gzip');
        reply.header('Content-Disposition', `attachment; filename="${pkgName.replace(/[^a-z0-9-]/gi, '-')}-${version}.tar.gz"`);
        return reply.send(gzipped);
      }

      // For published packages with tarball_url, generate presigned download URL
      if (pkgVersion.tarball_url) {
        try {
          // Extract package ID and version from tarball_url or use the actual values
          const { getDownloadUrl } = await import('../storage/s3.js');
          // Use package name for S3 key (some packages were seeded with name-based paths)
          const pkgName = (pkgVersion as any).package_name || packageName;
          const downloadUrl = await getDownloadUrl(server, pkgName, version);

          // Redirect to the presigned URL
          return reply.redirect(302, downloadUrl);
        } catch (error) {
          server.log.error({ error, version: pkgVersion }, 'Failed to generate download URL');
          return reply.status(500).send({ error: 'Failed to generate download URL' });
        }
      }

      return reply.status(404).send({ error: 'Package tarball not available' });
    }

    // Regular version info request
    const version = versionParam;

    // Check cache
    const cacheKey = `package:${packageName}:${version}`;
    const cached = await cacheGet<PackageVersion>(server, cacheKey);
    if (cached) {
      return cached;
    }

    const pkgVersion = await queryOne<PackageVersion>(
      server,
      `SELECT pv.* FROM package_versions pv
       JOIN packages p ON p.id = pv.package_id
       WHERE p.name = $1 AND pv.version = $2 AND p.visibility = 'public'`,
      [packageName, version]
    );

    if (!pkgVersion) {
      return reply.status(404).send({ error: 'Package version not found' });
    }

    // Cache for 1 hour (versions are immutable)
    await cacheSet(server, cacheKey, pkgVersion, 3600);

    return pkgVersion;
  });

  // Publish package (authenticated)
  server.post('/', {
    onRequest: [server.authenticate],
    schema: {
      tags: ['packages'],
      description: 'Publish a new package or version',
      body: {
        type: 'object',
        required: ['manifest', 'tarball'],
        properties: {
          manifest: { type: 'object' },
          tarball: { type: 'string' },
          readme: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.user_id;
    const { manifest, tarball: tarballBase64, readme } = request.body as {
      manifest: Record<string, unknown>;
      tarball: string;
      readme?: string
    };

    try {
      // 1. Validate manifest
      const packageName = manifest.name as string;
      const version = manifest.version as string;
      const description = manifest.description as string;
      const format = manifest.format as string;
      const subtype = manifest.subtype as string;

      if (!packageName || !version || !description || !format) {
        return reply.status(400).send({
          error: 'Invalid manifest',
          message: 'Missing required fields: name, version, description, or format'
        });
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

      // 2. Check if package exists and user has permission
      let pkg = await queryOne<Package>(
        server,
        'SELECT * FROM packages WHERE name = $1',
        [packageName]
      );

      if (pkg) {
        // Package exists - check ownership
        if (pkg.author_id !== userId && !request.user.is_admin) {
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
        pkg = await queryOne<Package>(
          server,
          `INSERT INTO packages (name, description, author_id, format, subtype)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [packageName, description, userId, format, subtype]
        );

        if (!pkg) {
          throw new Error('Failed to create package record');
        }

        server.log.info({ packageName, userId }, 'Created new package');
      }

      // 3. Decode tarball from base64 and upload to S3
      const tarballBuffer = Buffer.from(tarballBase64, 'base64');

      const { uploadPackage } = await import('../storage/s3.js');
      const { url: tarballUrl, hash: tarballHash, size } = await uploadPackage(
        server,
        pkg.id,
        version,
        tarballBuffer
      );

      // 4. Create package version record
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
          JSON.stringify({ manifest, readme })
        ]
      );

      // Update package updated_at and last_published_at
      await query(
        server,
        'UPDATE packages SET last_published_at = NOW(), updated_at = NOW() WHERE id = $1',
        [pkg.id]
      );

      // 5. Invalidate caches
      await cacheDelete(server, `package:${packageName}`);
      await cacheDelete(server, `package:${packageName}:${version}`);
      await cacheDeletePattern(server, `packages:list:*`);

      server.log.info({ packageName, version, userId }, 'Package published successfully');

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
      `SELECT p.*,
        p.downloads_last_7_days as recent_downloads,
        p.trending_score
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
          format: { type: 'string', enum: ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'agents.md', 'generic', 'mcp'] },
          subtype: { type: 'string', enum: ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'] },
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
      `SELECT p.*,
        p.total_downloads,
        p.weekly_downloads,
        p.install_count
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
