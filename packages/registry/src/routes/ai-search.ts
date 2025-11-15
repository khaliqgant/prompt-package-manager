/**
 * AI Search Routes
 * AI-powered semantic search (Free for everyone, including anonymous users)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { AISearchService } from '../services/ai-search.js';
import type { AISearchQuery } from '@pr-pm/types';

export async function aiSearchRoutes(server: FastifyInstance) {
  const aiSearchService = new AISearchService(server);

  // Generous rate limiting for anonymous AI search
  // 300 requests per 15 minutes per IP = ~1 request every 3 seconds
  // This prevents abuse while being very generous for legitimate use
  await server.register(rateLimit, {
    max: 300,
    timeWindow: '15 minutes',
    cache: 10000, // Cache up to 10k IP addresses
    allowList: ['127.0.0.1', '::1'], // Allow localhost unlimited
    skipOnError: true, // Don't block on Redis errors
    keyGenerator: (request: FastifyRequest) => {
      // Use X-Forwarded-For if behind proxy, otherwise use IP
      const forwarded = request.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
      }
      return request.ip;
    },
    errorResponseBuilder: () => {
      return {
        error: 'rate_limit_exceeded',
        message: 'Too many AI search requests. Please wait a moment and try again.',
        limit: 300,
        window: '15 minutes',
        hint: 'You can make up to 300 searches every 15 minutes (about 1 every 3 seconds)'
      };
    },
    onExceeding: (request: FastifyRequest) => {
      server.log.warn({
        ip: request.ip,
        forwarded: request.headers['x-forwarded-for'],
        path: request.url
      }, 'AI search rate limit being approached');
    },
    onExceeded: (request: FastifyRequest) => {
      server.log.warn({
        ip: request.ip,
        forwarded: request.headers['x-forwarded-for'],
        path: request.url
      }, 'AI search rate limit exceeded');
    }
  });

  /**
   * POST /ai-search
   * Perform AI-powered semantic search
   * No authentication required - open to everyone!
   */
  server.post('/', {
    schema: {
      description: 'AI-powered semantic search for packages (Free for everyone, no login required)',
      tags: ['ai-search'],
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            minLength: 3,
            maxLength: 500,
            description: 'Natural language search query'
          },
          filters: {
            type: 'object',
            properties: {
              format: { type: 'string' },
              subtype: { type: 'string' },
              language: { type: 'string' },
              framework: { type: 'string' },
              min_quality: { type: 'number', minimum: 0, maximum: 5 },
              categories: { type: 'array', items: { type: 'string' } },
              use_cases: { type: 'array', items: { type: 'string' } }
            }
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 50,
            default: 10
          },
          offset: {
            type: 'number',
            minimum: 0,
            default: 0
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: { type: 'array' },
            query: { type: 'string' },
            total_matches: { type: 'number' },
            execution_time_ms: { type: 'number' },
            search_metadata: { type: 'object' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            upgrade_info: { type: 'object' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            upgrade_info: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userId = (request.user as any)?.user_id || null; // Optional - works for anonymous users
    const searchQuery: AISearchQuery = request.body as AISearchQuery;

    try {
      const results = await aiSearchService.search(searchQuery, userId);

      server.log.info({
        userId: userId || 'anonymous',
        query: searchQuery.query,
        results_count: results.results.length,
        execution_time: results.execution_time_ms
      }, 'AI search completed successfully');

      return reply.code(200).send(results);
    } catch (error) {
      server.log.error({
        error,
        userId: userId || 'anonymous',
        query: searchQuery.query
      }, 'AI search error');

      return reply.code(500).send({
        error: 'search_failed',
        message: 'An error occurred during AI search. Please try again.'
      });
    }
  });

  /**
   * GET /ai-search/similar/:packageId
   * Get similar packages using AI
   */
  server.get('/similar/:packageId', {
    schema: {
      description: 'Get similar packages using AI embeddings (Free for everyone, no login required)',
      tags: ['ai-search'],
      params: {
        type: 'object',
        required: ['packageId'],
        properties: {
          packageId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 20,
            default: 5
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            similar_packages: { type: 'array' },
            source_package_id: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { packageId } = request.params as { packageId: string };
    const { limit } = request.query as { limit?: number };

    try {
      const similarPackages = await aiSearchService.getSimilarPackages(
        packageId,
        limit || 5
      );

      return reply.code(200).send({
        similar_packages: similarPackages,
        source_package_id: packageId
      });
    } catch (error) {
      server.log.error({ error, packageId }, 'Failed to get similar packages');

      return reply.code(500).send({
        error: 'similar_packages_failed',
        message: 'Failed to retrieve similar packages'
      });
    }
  });

  /**
   * GET /ai-search/suggestions
   * Get query suggestions for autocomplete
   */
  server.get('/suggestions', {
    schema: {
      description: 'Get query suggestions for autocomplete based on popular searches',
      tags: ['ai-search'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: {
            type: 'string',
            minLength: 3,
            maxLength: 100,
            description: 'Partial query to get suggestions for'
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            default: 5
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: { type: 'string' }
            },
            query: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { q, limit } = request.query as { q: string; limit?: number };

    try {
      // Get suggestions from popular searches
      const result = await server.pg.query(
        `SELECT DISTINCT query, COUNT(*) as count
         FROM ai_search_usage
         WHERE query ILIKE $1
         AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY query
         ORDER BY count DESC
         LIMIT $2`,
        [`%${q}%`, limit || 5]
      );

      const suggestions = result.rows.map(row => row.query);

      return reply.code(200).send({
        suggestions,
        query: q
      });
    } catch (error) {
      server.log.warn({ error, query: q }, 'Failed to get query suggestions');

      // Return empty suggestions on error
      return reply.code(200).send({
        suggestions: [],
        query: q
      });
    }
  });

  /**
   * GET /ai-search/access
   * Check if user has AI search access (for frontend)
   * Now free for everyone - always returns true
   */
  server.get('/access', {
    schema: {
      description: 'Check if user has access to AI search (Always true - free for everyone)',
      tags: ['ai-search'],
      response: {
        200: {
          type: 'object',
          properties: {
            has_access: { type: 'boolean' },
            reason: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // AI search is now free for everyone, even anonymous users
    return reply.code(200).send({
      has_access: true,
      reason: 'free_for_all'
    });
  });
}
