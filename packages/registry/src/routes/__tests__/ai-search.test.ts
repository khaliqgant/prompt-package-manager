/**
 * AI Search routes integration tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { aiSearchRoutes } from '../ai-search';

describe('AI Search Routes', () => {
  let server: FastifyInstance;
  let mockUser: any;

  beforeAll(async () => {
    server = Fastify();

    // Mock authenticate decorator with user injection
    server.decorate('authenticate', async (request: any) => {
      if (mockUser) {
        request.user = mockUser;
      } else {
        throw new Error('Unauthorized');
      }
    });

    // Mock OpenAI client
    const mockOpenAI = {
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [
            {
              embedding: new Array(1536).fill(0.1),
            },
          ],
        }),
      },
    };

    // Create mock query function
    const mockQuery = async (sql: string, params?: unknown[]) => {
      // Mock user subscription check
      if (sql.includes('SELECT subscription_tier, subscription_status, trial_ends_at')) {
        const userId = params?.[0];

        if (userId === 'prpm-plus-user') {
          return {
            rows: [
              {
                subscription_tier: 'prpm_plus',
                subscription_status: 'active',
                trial_ends_at: null,
              },
            ],
          };
        }

        if (userId === 'trial-user') {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 7);
          return {
            rows: [
              {
                subscription_tier: 'prpm_plus',
                subscription_status: 'trialing',
                trial_ends_at: futureDate,
              },
            ],
          };
        }

        if (userId === 'expired-trial-user') {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 1);
          return {
            rows: [
              {
                subscription_tier: 'free',
                subscription_status: 'inactive',
                trial_ends_at: pastDate,
              },
            ],
          };
        }

        return {
          rows: [
            {
              subscription_tier: 'free',
              subscription_status: 'inactive',
              trial_ends_at: null,
            },
          ],
        };
      }

      // Mock vector similarity search
      if (sql.includes('ORDER BY embedding <=>')) {
        return {
          rows: [
            {
              package_id: 'pkg-1',
              name: '@test/flask-api',
              description: 'Flask REST API template',
              similarity_score: 0.85,
              quality_score: 4.5,
              popularity_score: 1000,
              ai_use_case_description: 'Build REST APIs with Flask and authentication',
              ai_problem_statement: 'Creating secure REST APIs quickly',
              ai_similar_to: ['Django REST', 'FastAPI', 'Express'],
              ai_best_for: 'Python backend API development',
              format: 'generic',
              subtype: 'prompt',
              total_downloads: 1000,
            },
            {
              package_id: 'pkg-2',
              name: '@test/api-security',
              description: 'API security best practices',
              similarity_score: 0.72,
              quality_score: 4.8,
              popularity_score: 800,
              ai_use_case_description: 'Secure your REST APIs',
              ai_problem_statement: 'API authentication and authorization',
              ai_similar_to: ['OAuth2', 'JWT'],
              ai_best_for: 'API security implementation',
              format: 'cursor',
              subtype: 'rule',
              total_downloads: 800,
            },
          ],
        };
      }

      // Mock max downloads for normalization
      if (sql.includes('SELECT MAX(total_downloads)')) {
        return {
          rows: [{ max_downloads: 10000 }],
        };
      }

      // Mock package embedding lookup
      if (sql.includes('SELECT embedding FROM package_embeddings WHERE package_id = $1')) {
        const packageId = params?.[0];

        if (packageId === 'pkg-with-embedding') {
          return {
            rows: [
              {
                embedding: `[${new Array(1536).fill(0.15).join(',')}]`,
              },
            ],
          };
        }

        if (packageId === 'pkg-without-embedding') {
          return { rows: [] };
        }
      }

      // Mock similar packages search
      if (sql.includes('WHERE pe.package_id != $1') && sql.includes('ORDER BY embedding <=>')) {
        return {
          rows: [
            {
              package_id: 'similar-1',
              name: '@test/similar-package',
              description: 'Similar package description',
              similarity_score: 0.78,
              quality_score: 4.3,
              popularity_score: 600,
              ai_use_case_description: 'Similar use case',
              ai_best_for: 'Similar best for',
              ai_similar_to: ['Related 1', 'Related 2'],
              format: 'generic',
              subtype: 'prompt',
              total_downloads: 600,
            },
          ],
        };
      }

      // Mock usage tracking INSERT
      if (sql.includes('INSERT INTO ai_search_usage')) {
        return { rows: [] };
      }

      return { rows: [] };
    };

    // Mock pg client
    server.decorate('pg', {
      query: mockQuery,
    } as any);

    // Mock OpenAI
    server.decorate('openai', mockOpenAI as any);

    // Register routes
    await server.register(aiSearchRoutes, { prefix: '/api/v1/ai-search' });
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication', async () => {
      mockUser = null;

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
        },
      });

      expect(response.statusCode).toBe(500); // Auth decorator throws error
    });

    it('should allow PRPM+ users', async () => {
      mockUser = { user_id: 'prpm-plus-user' };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'Python Flask REST API',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('should allow trial users', async () => {
      mockUser = { user_id: 'trial-user' };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
          limit: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toBeDefined();
    });

    it('should reject expired trial users', async () => {
      mockUser = { user_id: 'expired-trial-user' };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('prpm_plus_required');
      expect(body.upgrade_info).toBeDefined();
      expect(body.upgrade_info.feature).toBe('AI-Powered Search');
    });

    it('should reject free tier users with upgrade info', async () => {
      mockUser = { user_id: 'free-user' };

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);

      expect(body.error).toBe('prpm_plus_required');
      expect(body.upgrade_info).toBeDefined();
      expect(body.upgrade_info.price).toBe('$19/month');
      expect(body.upgrade_info.trial_available).toBe(true);
      expect(body.upgrade_info.benefits).toBeDefined();
      expect(Array.isArray(body.upgrade_info.benefits)).toBe(true);
    });
  });

  describe('POST /ai-search', () => {
    beforeEach(() => {
      mockUser = { user_id: 'prpm-plus-user' };
    });

    it('should perform AI semantic search', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'Python Flask REST API with authentication',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.results.length).toBeGreaterThan(0);

      const result = body.results[0];
      expect(result).toHaveProperty('package_id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('similarity_score');
      expect(result).toHaveProperty('final_score');
      expect(result).toHaveProperty('ai_use_case_description');
    });

    it('should apply format filter', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'React testing patterns',
          filters: {
            format: 'cursor',
          },
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toBeDefined();
    });

    it('should apply subtype filter', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'debugging tools',
          filters: {
            subtype: 'agent',
          },
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toBeDefined();
    });

    it('should apply multiple filters', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'code review',
          filters: {
            format: 'claude',
            subtype: 'agent',
            min_quality: 4.0,
          },
          limit: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.results).toBeDefined();
    });

    it('should return execution time metrics', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.execution_time_ms).toBeDefined();
      expect(typeof body.execution_time_ms).toBe('number');
      expect(body.execution_time_ms).toBeGreaterThan(0);
    });

    it('should return total matches count', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.total_matches).toBeDefined();
      expect(typeof body.total_matches).toBe('number');
    });

    it('should validate query parameter', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          // Missing query
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate limit parameter', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test',
          limit: -1,
        },
      });

      // Should either clamp or reject
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('GET /similar/:packageId', () => {
    beforeEach(() => {
      mockUser = { user_id: 'prpm-plus-user' };
    });

    it('should return similar packages', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/similar/pkg-with-embedding',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.source_package_id).toBe('pkg-with-embedding');
      expect(body.similar_packages).toBeDefined();
      expect(Array.isArray(body.similar_packages)).toBe(true);
    });

    it('should support limit parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/similar/pkg-with-embedding?limit=3',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.similar_packages).toBeDefined();
    });

    it('should return 404 for package without embedding', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/similar/pkg-without-embedding',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should require PRPM+ subscription', async () => {
      mockUser = { user_id: 'free-user' };

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/similar/pkg-with-embedding',
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /access', () => {
    it('should return access info for PRPM+ users', async () => {
      mockUser = { user_id: 'prpm-plus-user' };

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/access',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.has_access).toBe(true);
      expect(body.subscription_tier).toBe('prpm_plus');
      expect(body.subscription_status).toBe('active');
    });

    it('should return access info for trial users', async () => {
      mockUser = { user_id: 'trial-user' };

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/access',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.has_access).toBe(true);
      expect(body.subscription_tier).toBe('prpm_plus');
      expect(body.trial_ends_at).toBeDefined();
    });

    it('should return no access for free users with upgrade info', async () => {
      mockUser = { user_id: 'free-user' };

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/access',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.has_access).toBe(false);
      expect(body.upgrade_info).toBeDefined();
      expect(body.upgrade_info.feature).toBe('AI-Powered Search');
      expect(body.upgrade_info.trial_available).toBe(true);
    });

    it('should require authentication', async () => {
      mockUser = null;

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/ai-search/access',
      });

      expect(response.statusCode).toBe(500); // Auth throws error
    });
  });

  describe('Result Ranking', () => {
    beforeEach(() => {
      mockUser = { user_id: 'prpm-plus-user' };
    });

    it('should include normalized scores in results', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'Python Flask REST API',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      const result = body.results[0];
      expect(result.similarity_score).toBeDefined();
      expect(result.quality_score_normalized).toBeDefined();
      expect(result.popularity_score_normalized).toBeDefined();
      expect(result.final_score).toBeDefined();

      // Scores should be between 0 and 1
      expect(result.similarity_score).toBeGreaterThanOrEqual(0);
      expect(result.similarity_score).toBeLessThanOrEqual(1);
      expect(result.final_score).toBeGreaterThanOrEqual(0);
      expect(result.final_score).toBeLessThanOrEqual(1);
    });

    it('should sort results by final score descending', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/ai-search',
        payload: {
          query: 'test query',
          limit: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      if (body.results.length > 1) {
        for (let i = 1; i < body.results.length; i++) {
          expect(body.results[i - 1].final_score).toBeGreaterThanOrEqual(
            body.results[i].final_score
          );
        }
      }
    });
  });
});
