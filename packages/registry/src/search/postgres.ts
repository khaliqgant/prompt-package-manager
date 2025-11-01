/**
 * PostgreSQL Full-Text Search implementation
 */

import { FastifyInstance } from 'fastify';
import { SearchFilters, SearchResult, Package } from '../types.js';
import { SearchProvider } from './index.js';
import { query, queryOne } from '../db/index.js';

export function postgresSearch(server: FastifyInstance): SearchProvider {
  return {
    async search(searchQuery: string, filters: SearchFilters): Promise<SearchResult> {
      const {
        format,
        subtype,
        tags,
        category,
        author,
        verified,
        featured,
        sort = 'downloads',
        limit = 20,
        offset = 0,
      } = filters;

      // Build WHERE clause
      const conditions: string[] = ["p.visibility = 'public'"];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Only add text search if query is provided
      if (searchQuery && searchQuery.trim()) {
        conditions.push(`(
          to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', $${paramIndex}) OR
          p.name ILIKE $${paramIndex + 1} OR
          p.name % $${paramIndex} OR
          p.description % $${paramIndex} OR
          $${paramIndex} = ANY(p.tags) OR
          EXISTS (
            SELECT 1 FROM unnest(p.tags) tag WHERE tag % $${paramIndex}
          )
        )`);
        params.push(searchQuery, `%${searchQuery}%`);
        paramIndex += 2;
      }

      if (format) {
        if (Array.isArray(format)) {
          // Handle array of formats with IN clause
          conditions.push(`p.format = ANY($${paramIndex++})`);
          params.push(format);
        } else {
          // Handle single format
          conditions.push(`p.format = $${paramIndex++}`);
          params.push(format);
        }
      }

      if (subtype) {
        if (Array.isArray(subtype)) {
          // Handle array of subtypes with IN clause
          conditions.push(`p.subtype = ANY($${paramIndex++})`);
          params.push(subtype);
        } else {
          // Handle single subtype
          conditions.push(`p.subtype = $${paramIndex++}`);
          params.push(subtype);
        }
      }

      if (category) {
        conditions.push(`p.category = $${paramIndex++}`);
        params.push(category);
      }

      if (author) {
        // Search by both author username and organization name
        conditions.push(`(
          p.author_id = (SELECT id FROM users WHERE username = $${paramIndex}) OR
          p.org_id = (SELECT id FROM organizations WHERE name = $${paramIndex})
        )`);
        params.push(author);
        paramIndex++;
      }

      if (tags && tags.length > 0) {
        conditions.push(`p.tags && $${paramIndex++}`);
        params.push(tags);
      }

      if (verified !== undefined) {
        conditions.push(`p.verified = $${paramIndex++}`);
        params.push(verified);
      }

      if (featured !== undefined) {
        conditions.push(`p.featured = $${paramIndex++}`);
        params.push(featured);
      }

      const whereClause = conditions.join(' AND ');

      // Build ORDER BY clause
      let orderBy: string;
      const hasSearchQuery = searchQuery && searchQuery.trim();

      switch (sort) {
        case 'created':
          orderBy = 'p.created_at DESC';
          break;
        case 'updated':
          orderBy = 'p.updated_at DESC';
          break;
        case 'quality':
          orderBy = 'p.quality_score DESC NULLS LAST, p.total_downloads DESC';
          break;
        case 'rating':
          orderBy = 'p.rating_average DESC NULLS LAST, p.quality_score DESC NULLS LAST';
          break;
        case 'downloads':
          orderBy = 'p.total_downloads DESC, p.quality_score DESC NULLS LAST';
          break;
        default:
          // Default: when searching, prioritize relevance using trigram similarity + full-text search
          if (hasSearchQuery) {
            orderBy = 'relevance DESC, p.quality_score DESC NULLS LAST, p.total_downloads DESC';
          } else {
            orderBy = 'p.quality_score DESC NULLS LAST, p.total_downloads DESC';
          }
          break;
      }

      // Search with combined ranking (trigram similarity + full-text search)
      const rankColumn = hasSearchQuery
        ? `(
            GREATEST(
              similarity(p.name, $1),
              similarity(COALESCE(p.description, ''), $1)
            ) * 2 +
            ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', $1))
          ) as relevance`
        : '0 as relevance';

      const result = await query<Package & { relevance: number }>(
        server,
        `SELECT p.*, u.username as author_username, o.name as org_name, ${rankColumn}
         FROM packages p
         LEFT JOIN users u ON p.author_id = u.id
         LEFT JOIN organizations o ON p.org_id = o.id
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await queryOne<{ count: string }>(
        server,
        `SELECT COUNT(*) as count FROM packages p WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult?.count || '0', 10);

      return {
        packages: result.rows.map(({ relevance, ...pkg }) => pkg),
        total,
        offset,
        limit,
      };
    },

    async indexPackage(packageId: string): Promise<void> {
      // PostgreSQL FTS indexes are automatically maintained
      // No action needed
      server.log.debug(`Package ${packageId} indexed (PostgreSQL FTS auto-maintains)`);
    },

    async deletePackage(packageId: string): Promise<void> {
      // PostgreSQL FTS indexes are automatically maintained
      // No action needed
      server.log.debug(`Package ${packageId} removed from index (PostgreSQL FTS auto-maintains)`);
    },

    async reindexAll(): Promise<void> {
      // For PostgreSQL, we can refresh the GIN index
      await query(server, 'REINDEX INDEX CONCURRENTLY idx_packages_search');
      server.log.info('Reindexed all packages (PostgreSQL FTS)');
    },
  };
}
