/**
 * Search and discovery routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/index.js';
import { cacheGet, cacheSet } from '../cache/redis.js';
import { Package, Format, Subtype } from '../types.js';
import { getSearchProvider } from '../search/index.js';

export async function searchRoutes(server: FastifyInstance) {
  // Full-text search
  server.get('/', {
    schema: {
      tags: ['search'],
      description: 'Search packages by name, description, tags, or keywords. Query optional when using format/subtype filter.',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          format: {
            anyOf: [
              { type: 'string', enum: ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'] },
              { type: 'array', items: { type: 'string', enum: ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'] } }
            ]
          },
          subtype: {
            anyOf: [
              { type: 'string', enum: ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'] },
              { type: 'array', items: { type: 'string', enum: ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'] } }
            ]
          },
          tags: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' },
          author: { type: 'string' },
          verified: { type: 'boolean' },
          featured: { type: 'boolean' },
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          offset: { type: 'number', default: 0, minimum: 0 },
          sort: { type: 'string', enum: ['downloads', 'created', 'updated', 'quality', 'rating'], default: 'downloads' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, format, subtype, tags, category, author, verified, featured, limit = 20, offset = 0, sort = 'downloads' } = request.query as {
      q?: string;
      format?: Format | Format[];
      subtype?: Subtype | Subtype[];
      tags?: string[];
      category?: string;
      author?: string;
      verified?: boolean;
      featured?: boolean;
      limit?: number;
      offset?: number;
      sort?: 'downloads' | 'created' | 'updated' | 'quality' | 'rating';
    };

    // Build cache key
    const cacheKey = `search:${JSON.stringify(request.query)}`;

    // Check cache
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

    // Use search provider (PostgreSQL or OpenSearch)
    const searchProvider = getSearchProvider(server);
    const response = await searchProvider.search(q || '', {
      format,
      subtype,
      tags,
      category,
      author,
      verified,
      featured,
      sort,
      limit,
      offset,
    });

    // Cache for 5 minutes
    await cacheSet(server, cacheKey, response, 300);

    return response;
  });

  // Trending packages (most downloaded in last 7 days)
  server.get('/trending', {
    schema: {
      tags: ['search'],
      description: 'Get trending packages based on recent downloads',
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'] },
          subtype: { type: 'string', enum: ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'] },
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { format, subtype, limit = 20 } = request.query as {
      format?: string;
      subtype?: string;
      limit?: number;
    };

    const cacheKey = `search:trending:${format || 'all'}:${subtype || 'all'}:${limit}`;
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

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

    const whereClause = conditions.join(' AND ');

    const result = await query<Package>(
      server,
      `SELECT * FROM packages
       WHERE ${whereClause}
       ORDER BY weekly_downloads DESC, total_downloads DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    const response = { packages: result.rows };

    // Cache for 1 hour
    await cacheSet(server, cacheKey, response, 3600);

    return response;
  });

  // Featured packages
  server.get('/featured', {
    schema: {
      tags: ['search'],
      description: 'Get featured packages',
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'] },
          subtype: { type: 'string', enum: ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'] },
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { format, subtype, limit = 20 } = request.query as {
      format?: string;
      subtype?: string;
      limit?: number;
    };

    const cacheKey = `search:featured:${format || 'all'}:${subtype || 'all'}:${limit}`;
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

    const conditions: string[] = ["visibility = 'public'", 'featured = TRUE'];
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

    const whereClause = conditions.join(' AND ');

    const result = await query<Package>(
      server,
      `SELECT * FROM packages
       WHERE ${whereClause}
       ORDER BY quality_score DESC NULLS LAST, total_downloads DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    const response = { packages: result.rows };

    // Cache for 1 hour
    await cacheSet(server, cacheKey, response, 3600);

    return response;
  });

  // Get all unique tags
  server.get('/tags', {
    schema: {
      tags: ['search'],
      description: 'Get list of all package tags with counts',
    },
  }, async (request, reply) => {
    const cacheKey = 'search:tags';
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

    const result = await query<{ tag: string; count: string }>(
      server,
      `SELECT unnest(tags) as tag, COUNT(*) as count
       FROM packages
       WHERE visibility = 'public'
       GROUP BY tag
       ORDER BY count DESC, tag ASC`
    );

    const response = {
      tags: result.rows.map(r => ({
        name: r.tag,
        count: parseInt(r.count, 10),
      })),
    };

    // Cache for 1 hour
    await cacheSet(server, cacheKey, response, 3600);

    return response;
  });

  // Get all categories
  server.get('/categories', {
    schema: {
      tags: ['search'],
      description: 'Get list of all package categories with counts',
    },
  }, async (request, reply) => {
    const cacheKey = 'search:categories';
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

    const result = await query<{ category: string; count: string }>(
      server,
      `SELECT category, COUNT(*) as count
       FROM packages
       WHERE visibility = 'public' AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC, category ASC`
    );

    const response = {
      categories: result.rows.map(r => ({
        name: r.category,
        count: parseInt(r.count, 10),
      })),
    };

    // Cache for 1 hour
    await cacheSet(server, cacheKey, response, 3600);

    return response;
  });

  // Get slash commands
  server.get('/slash-commands', {
    schema: {
      tags: ['search'],
      description: 'Get Claude slash commands',
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          offset: { type: 'number', default: 0, minimum: 0 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, limit = 20, offset = 0 } = request.query as {
      q?: string;
      limit?: number;
      offset?: number;
    };

    const cacheKey = `search:slash-commands:${q || 'all'}:${limit}:${offset}`;
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

    const conditions: string[] = ["visibility = 'public'", "type = 'claude-slash-command'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(`(
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ websearch_to_tsquery('english', $${paramIndex}) OR
        name ILIKE $${paramIndex + 1} OR
        $${paramIndex + 2} = ANY(tags)
      )`);
      params.push(q, `%${q}%`, q.toLowerCase());
      paramIndex += 3;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ count: string }>(
      server,
      `SELECT COUNT(*) as count FROM packages WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get slash commands
    const result = await query<Package>(
      server,
      `SELECT * FROM packages
       WHERE ${whereClause}
       ORDER BY quality_score DESC NULLS LAST, total_downloads DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const response = {
      packages: result.rows,
      total,
      limit,
      offset,
    };

    // Cache for 5 minutes
    await cacheSet(server, cacheKey, response, 300);

    return response;
  });

  // Get top authors (leaderboard)
  server.get('/authors', {
    schema: {
      tags: ['search'],
      description: 'Get top package authors with their stats',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50, minimum: 1, maximum: 500 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = 50 } = request.query as { limit?: number };

    const cacheKey = `search:authors:${limit}`;
    const cached = await cacheGet<any>(server, cacheKey);
    if (cached) {
      return cached;
    }

    // Get author stats by aggregating packages
    const result = await query<{
      author: string;
      package_count: string;
      total_downloads: string;
      verified: boolean;
      latest_package: string;
    }>(
      server,
      `SELECT
        u.username as author,
        COUNT(p.id)::text as package_count,
        COALESCE(SUM(p.total_downloads), 0)::text as total_downloads,
        u.verified_author as verified,
        (SELECT p2.name FROM packages p2
         WHERE p2.author_id = u.id
         ORDER BY p2.created_at DESC
         LIMIT 1) as latest_package
       FROM users u
       INNER JOIN packages p ON p.author_id = u.id
       WHERE p.visibility = 'public'
       GROUP BY u.id, u.username, u.verified_author
       HAVING COUNT(p.id) > 0
       ORDER BY COUNT(p.id) DESC, SUM(p.total_downloads) DESC
       LIMIT $1`,
      [limit]
    );

    const response = {
      authors: result.rows.map(row => ({
        author: row.author,
        package_count: parseInt(row.package_count, 10),
        total_downloads: parseInt(row.total_downloads, 10),
        verified: row.verified,
        latest_package: row.latest_package,
      })),
      total: result.rows.length,
    };

    // Cache for 10 minutes
    await cacheSet(server, cacheKey, response, 600);

    return response;
  });
}
