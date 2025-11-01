/**
 * Analytics routes tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { analyticsRoutes } from '../analytics';

describe('Analytics Routes', () => {
  let server: FastifyInstance;
  const mockDbRows: unknown[] = [];

  beforeAll(async () => {
    server = Fastify();

    // Mock postgres plugin
    (server as any).pg = {
      query: async (sql: string, params?: unknown[]): Promise<unknown> => {
        // Lookup package by name (for analytics download tracking)
        if (sql.includes('SELECT id FROM packages WHERE name = $1')) {
          const packageName = params?.[0];
          if (packageName === 'test-package') {
            return {
              rows: [{ id: 'test-package-uuid' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: [],
            };
          }
          return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
        }

        // Track download - INSERT into download_events
        if (sql.includes('INSERT INTO download_events')) {
          return { rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] };
        }

        // Update package download counts
        if (sql.includes('UPDATE packages') && sql.includes('total_downloads')) {
          return { rows: [], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] };
        }

        // Track view - INSERT into package_views
        if (sql.includes('INSERT INTO package_views')) {
          return { rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] };
        }

        // Get downloads by format (check before general SELECT to be more specific)
        if (sql.includes('GROUP BY format') && sql.includes('download_events')) {
          const packageUuid = params?.[0];
          if (packageUuid === 'test-package-uuid') {
            return {
              rows: [
                { format: 'cursor', count: '60' },
                { format: 'claude', count: '40' },
              ],
              command: 'SELECT',
              rowCount: 2,
              oid: 0,
              fields: [],
            };
          }
          return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
        }

        // Get downloads by client
        if (sql.includes('GROUP BY client_type') && sql.includes('download_events')) {
          const packageUuid = params?.[0];
          if (packageUuid === 'test-package-uuid') {
            return {
              rows: [
                { client_type: 'cli', count: '70' },
                { client_type: 'web', count: '30' },
              ],
              command: 'SELECT',
              rowCount: 2,
              oid: 0,
              fields: [],
            };
          }
          return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
        }

        // Trend calculation
        if (sql.includes('this_week') && sql.includes('last_week')) {
          const packageUuid = params?.[0];
          if (packageUuid === 'test-package-uuid') {
            return {
              rows: [{ this_week: '30', last_week: '20' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: [],
            };
          }
          return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
        }

        // Get total downloads by UUID
        if (sql.includes('SELECT total_downloads FROM packages WHERE id = $1')) {
          const packageUuid = params?.[0];
          return {
            rows: [{ total_downloads: packageUuid === 'test-package-uuid' ? 100 : 0 }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          };
        }

        // Get total downloads (simple query)
        if (sql.includes('SELECT total_downloads FROM packages')) {
          const packageId = params?.[0];
          return {
            rows: [{ total_downloads: packageId === 'test-package' ? 100 : 0 }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          };
        }

        // Get package stats - main query (check after more specific queries)
        if (sql.includes('total_downloads') && sql.includes('weekly_downloads') && sql.includes('monthly_downloads')) {
          const packageUuid = params?.[0];
          if (packageUuid === 'test-package-uuid' || packageUuid === 'test-package') {
            return {
              rows: [{
                total_downloads: 1000,
                weekly_downloads: 50,
                monthly_downloads: 200,
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: [],
            };
          }
          return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
        }

        // Trending packages
        if (sql.includes('trending_score')) {
          return {
            rows: [
              {
                id: 'trending-1',
                
                description: 'Hot package',
                type: 'cursor',
                category: 'development',
                total_downloads: 500,
                weekly_downloads: 100,
                recent_downloads: '50',
                trending_score: 0.1,
              },
            ],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          };
        }

        // Popular packages
        if (sql.includes('ORDER BY total_downloads DESC')) {
          return {
            rows: [
              {
                id: 'popular-1',
                
                description: 'Most downloaded',
                type: 'cursor',
                category: 'development',
                total_downloads: 5000,
                weekly_downloads: 200,
                monthly_downloads: 800,
                verified: true,
                featured: false,
              },
            ],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          };
        }

        return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
      },
    };

    // Mock optional auth middleware
    server.decorateRequest('user', null);

    await server.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /api/v1/analytics/download', () => {
    it('should track a download successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/download',
        payload: {
          packageId: 'test-package',
          version: '1.0.0',
          format: 'cursor',
          client: 'cli',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        success: true,
        packageId: 'test-package',
        totalDownloads: 100,
      });
    });

    it('should track download without optional fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/download',
        payload: {
          packageId: 'test-package',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should validate format enum', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/download',
        payload: {
          packageId: 'test-package',
          format: 'invalid-format',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate client enum', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/download',
        payload: {
          packageId: 'test-package',
          client: 'invalid-client',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/analytics/view', () => {
    it('should track a view successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/view',
        payload: {
          packageId: 'test-package',
          referrer: 'https://example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should track view without referrer', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/view',
        payload: {
          packageId: 'test-package',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should require packageId', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/analytics/view',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/analytics/stats/:packageId', () => {
    it('should return package stats', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/stats/test-package',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        packageId: 'test-package',
        totalDownloads: 1000,
        weeklyDownloads: 50,
        monthlyDownloads: 200,
      });
      expect(body.downloadsByFormat).toBeDefined();
      expect(body.downloadsByClient).toBeDefined();
      expect(body.trend).toMatch(/^(rising|falling|stable)$/);
    });

    it('should return downloads by format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/stats/test-package',
      });

      const body = JSON.parse(response.body);
      expect(body.downloadsByFormat).toBeDefined();
      expect(typeof body.downloadsByFormat).toBe('object');
    });

    it('should return downloads by client', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/stats/test-package',
      });

      const body = JSON.parse(response.body);
      expect(body.downloadsByClient).toBeDefined();
      expect(typeof body.downloadsByClient).toBe('object');
    });

    it('should return 404 for non-existent package', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/stats/non-existent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });

    it('should calculate rising trend', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/stats/test-package',
      });

      const body = JSON.parse(response.body);
      expect(body.trend).toBe('rising'); // 30 > 20 * 1.2 = false, but 30 > 20
    });
  });

  describe('GET /api/v1/analytics/trending', () => {
    it('should return trending packages', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/trending',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.trending).toBeDefined();
      expect(Array.isArray(body.trending)).toBe(true);
      expect(body.timeframe).toBe('week');
    });

    it('should support custom limit', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/trending?limit=5',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.trending).toBeDefined();
    });

    it('should support timeframe parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/trending?timeframe=day',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.timeframe).toBe('day');
    });

    it('should validate timeframe enum', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/trending?timeframe=invalid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/analytics/popular', () => {
    it('should return popular packages', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/popular',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.popular).toBeDefined();
      expect(Array.isArray(body.popular)).toBe(true);
      expect(body.count).toBeDefined();
    });

    it('should support custom limit', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/popular?limit=20',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/popular?type=cursor',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.popular).toBeDefined();
    });

    it('should validate type enum', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/popular?type=invalid',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should include verified and featured flags', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/analytics/popular',
      });

      const body = JSON.parse(response.body);
      if (body.popular.length > 0) {
        expect(body.popular[0].verified).toBeDefined();
        expect(body.popular[0].featured).toBeDefined();
      }
    });
  });
});
