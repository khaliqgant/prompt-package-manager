/**
 * AWS OpenSearch implementation
 */

import { FastifyInstance } from 'fastify';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { SearchFilters, SearchResult, Package } from '../types.js';
import { SearchProvider } from './index.js';
import { query, queryOne } from '../db/index.js';
import { toError, getStatusCode } from '../types/errors.js';

let client: Client | null = null;

function getOpenSearchClient(): Client {
  if (!client) {
    const endpoint = process.env.OPENSEARCH_ENDPOINT;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!endpoint) {
      throw new Error('OPENSEARCH_ENDPOINT not configured');
    }

    client = new Client({
      ...AwsSigv4Signer({
        region,
        service: 'es',
        // Credentials are automatically detected from:
        // - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
        // - IAM role (when running on ECS/EC2)
        // - AWS credentials file
      }),
      node: endpoint,
    });
  }

  return client;
}

export function openSearchSearch(server: FastifyInstance): SearchProvider {
  const INDEX_NAME = 'prpm-packages';

  return {
    async search(searchQuery: string, filters: SearchFilters): Promise<SearchResult> {
      const {
        format,
        subtype,
        tags,
        category,
        verified,
        featured,
        sort = 'downloads',
        limit = 20,
        offset = 0,
      } = filters;

      const client = getOpenSearchClient();

      // Build OpenSearch query
      const must: unknown[] = [
        {
          multi_match: {
            query: searchQuery,
            fields: ['id^3', 'description', 'tags^2', 'keywords'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
      ];

      const filter: unknown[] = [{ term: { visibility: 'public' } }];

      if (format) {
        filter.push({ term: { format } });
      }

      if (subtype) {
        filter.push({ term: { subtype } });
      }

      if (category) {
        filter.push({ term: { category } });
      }

      if (tags && tags.length > 0) {
        filter.push({ terms: { tags } });
      }

      if (verified !== undefined) {
        filter.push({ term: { verified } });
      }

      if (featured !== undefined) {
        filter.push({ term: { featured } });
      }

      // Build sort clause
      let sortClause: unknown[];
      switch (sort) {
        case 'created':
          sortClause = [{ created_at: { order: 'desc' } }];
          break;
        case 'updated':
          sortClause = [{ updated_at: { order: 'desc' } }];
          break;
        case 'quality':
          sortClause = [{ quality_score: { order: 'desc' } }];
          break;
        case 'rating':
          sortClause = [{ rating_average: { order: 'desc' } }];
          break;
        case 'downloads':
        default:
          sortClause = [{ total_downloads: { order: 'desc' } }, '_score'];
          break;
      }

      try {
        const response = await client.search({
          index: INDEX_NAME,
          body: {
            query: {
              bool: {
                must,
                filter,
              },
            },
            sort: sortClause,
            from: offset,
            size: limit,
          },
        });

        const hits = response.body.hits;
        const packages = hits.hits.map((hit: { _source: unknown }) => hit._source);
        const total = hits.total.value;

        return {
          packages,
          total,
          offset,
          limit,
        };
      } catch (error: unknown) {
        const err = toError(error);
        server.log.error({ error: err.message }, 'OpenSearch query failed');
        throw new Error('Search failed');
      }
    },

    async indexPackage(packageId: string): Promise<void> {
      const client = getOpenSearchClient();

      // Fetch package from database
      const pkg = await queryOne<Package>(
        server,
        'SELECT * FROM packages WHERE id = $1',
        [packageId]
      );

      if (!pkg) {
        throw new Error(`Package ${packageId} not found`);
      }

      try {
        await client.index({
          index: INDEX_NAME,
          id: packageId,
          body: pkg,
          refresh: true,
        });

        server.log.info(`Package ${packageId} indexed in OpenSearch`);
      } catch (error: unknown) {
        const err = toError(error);
        server.log.error({ error: err.message, packageId }, 'Failed to index package');
        throw err;
      }
    },

    async deletePackage(packageId: string): Promise<void> {
      const client = getOpenSearchClient();

      try {
        await client.delete({
          index: INDEX_NAME,
          id: packageId,
          refresh: true,
        });

        server.log.info(`Package ${packageId} removed from OpenSearch`);
      } catch (error: unknown) {
        if (getStatusCode(error) === 404) {
          // Package not in index, that's fine
          return;
        }
        const err = toError(error);
        server.log.error({ error: err.message, packageId }, 'Failed to delete package from index');
        throw err;
      }
    },

    async reindexAll(): Promise<void> {
      const client = getOpenSearchClient();

      // Delete and recreate index
      try {
        await client.indices.delete({ index: INDEX_NAME });
      } catch {
        // Index might not exist
      }

      // Create index with mapping
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              description: { type: 'text', analyzer: 'english' },
              type: { type: 'keyword' },
              category: { type: 'keyword' },
              tags: { type: 'keyword' },
              keywords: { type: 'text' },
              visibility: { type: 'keyword' },
              verified: { type: 'boolean' },
              featured: { type: 'boolean' },
              deprecated: { type: 'boolean' },
              total_downloads: { type: 'integer' },
              weekly_downloads: { type: 'integer' },
              monthly_downloads: { type: 'integer' },
              quality_score: { type: 'float' },
              rating_average: { type: 'float' },
              rating_count: { type: 'integer' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
            },
          },
        },
      });

      // Bulk index all packages
      const result = await query<Package>(
        server,
        "SELECT * FROM packages WHERE visibility = 'public'"
      );

      const body: Array<Record<string, unknown> | Package> = [];
      for (const pkg of result.rows) {
        body.push({ index: { _index: INDEX_NAME, _id: pkg.id } });
        body.push(pkg);
      }

      if (body.length > 0) {
        await client.bulk({
          body,
          refresh: true,
        });
      }

      server.log.info(`Reindexed ${result.rows.length} packages in OpenSearch`);
    },
  };
}
