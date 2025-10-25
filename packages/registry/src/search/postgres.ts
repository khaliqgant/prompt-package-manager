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
      const conditions: string[] = ["visibility = 'public'"];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Only add text search if query is provided
      if (searchQuery && searchQuery.trim()) {
        conditions.push(`to_tsvector('english', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${paramIndex++})`);
        params.push(searchQuery);
      }

      if (format) {
        if (Array.isArray(format)) {
          // Handle array of formats with IN clause
          conditions.push(`format = ANY($${paramIndex++})`);
          params.push(format);
        } else {
          // Handle single format
          conditions.push(`format = $${paramIndex++}`);
          params.push(format);
        }
      }

      if (subtype) {
        if (Array.isArray(subtype)) {
          // Handle array of subtypes with IN clause
          conditions.push(`subtype = ANY($${paramIndex++})`);
          params.push(subtype);
        } else {
          // Handle single subtype
          conditions.push(`subtype = $${paramIndex++}`);
          params.push(subtype);
        }
      }

      if (category) {
        conditions.push(`category = $${paramIndex++}`);
        params.push(category);
      }

      if (author) {
        conditions.push(`author_id = (SELECT id FROM users WHERE username = $${paramIndex++})`);
        params.push(author);
      }

      if (tags && tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        params.push(tags);
      }

      if (verified !== undefined) {
        conditions.push(`verified = $${paramIndex++}`);
        params.push(verified);
      }

      if (featured !== undefined) {
        conditions.push(`featured = $${paramIndex++}`);
        params.push(featured);
      }

      const whereClause = conditions.join(' AND ');

      // Build ORDER BY clause
      let orderBy: string;
      switch (sort) {
        case 'created':
          orderBy = 'created_at DESC';
          break;
        case 'updated':
          orderBy = 'updated_at DESC';
          break;
        case 'quality':
          orderBy = 'quality_score DESC NULLS LAST, total_downloads DESC';
          break;
        case 'rating':
          orderBy = 'rating_average DESC NULLS LAST, quality_score DESC NULLS LAST';
          break;
        case 'downloads':
          orderBy = 'total_downloads DESC, quality_score DESC NULLS LAST';
          break;
        default:
          // Default: prioritize quality, then downloads, then search relevance
          orderBy = 'quality_score DESC NULLS LAST, rank DESC, total_downloads DESC';
          break;
      }

      // Search with ranking (only calculate rank if there's a search query)
      const rankColumn = (searchQuery && searchQuery.trim())
        ? `ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')), plainto_tsquery('english', $1)) as rank`
        : '0 as rank';

      const result = await query<Package & { rank: number }>(
        server,
        `SELECT *, ${rankColumn}
         FROM packages
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await queryOne<{ count: string }>(
        server,
        `SELECT COUNT(*) as count FROM packages WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult?.count || '0', 10);

      return {
        packages: result.rows.map(({ rank, ...pkg }) => pkg),
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
