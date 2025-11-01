/**
 * Playground Routes Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { playgroundRoutes } from '../playground.js';

describe('Playground Routes', () => {
  let server: FastifyInstance;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockPackageId = '123e4567-e89b-12d3-a456-426614174001';
  const mockSessionId = '123e4567-e89b-12d3-a456-426614174002';

  beforeAll(async () => {
    server = Fastify();

    // Mock authenticate decorator
    server.decorate('authenticate', async (request: any) => {
      if (!request.headers.authorization) {
        throw new Error('Unauthorized');
      }
      request.user = {
        user_id: mockUserId,
        username: 'testuser',
        email: 'test@example.com',
      };
    });

    // Mock pg plugin
    const mockQuery = vi.fn();
    const mockPool = {
      connect: vi.fn().mockResolvedValue({
        query: mockQuery,
        release: vi.fn(),
      }),
    } as any;

    server.decorate('pg', {
      query: mockQuery,
      pool: mockPool,
    } as any);

    await server.register(playgroundRoutes, { prefix: '/api/v1/playground' });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/playground/run', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/run',
        payload: {
          packageId: mockPackageId,
          userInput: 'Test input',
          model: 'sonnet',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/run',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          // Missing packageId and userInput
          model: 'sonnet',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept both camelCase and snake_case field names', async () => {
      const mockPlaygroundService = vi.fn();

      // Test with snake_case
      const responseSnake = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/run',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          package_id: mockPackageId,
          input: 'Test input',
          model: 'sonnet',
        },
      });

      // Should not fail validation (may fail on execution, but that's OK for this test)
      expect(responseSnake.statusCode).not.toBe(400);

      // Test with camelCase
      const responseCamel = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/run',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          packageId: mockPackageId,
          userInput: 'Test input',
          model: 'sonnet',
        },
      });

      expect(responseCamel.statusCode).not.toBe(400);
    });

    it('should validate model enum', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/run',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          packageId: mockPackageId,
          userInput: 'Test',
          model: 'invalid-model',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should enforce input length limits', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/run',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          packageId: mockPackageId,
          userInput: 'a'.repeat(10001), // Exceeds 10000 max
          model: 'sonnet',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Input too long');
    });
  });

  describe('POST /api/v1/playground/estimate', () => {
    it('should return credit estimate', async () => {
      // Mock database response for package lookup
      (server.pg.query as any).mockResolvedValueOnce({
        rows: [
          {
            tarball_url: 'https://example.com/pkg.tgz',
            snippet: 'You are a helpful assistant',
            name: 'test-package',
          },
        ],
      });

      // Mock credits balance
      (server.pg.query as any).mockResolvedValueOnce({
        rows: [
          {
            balance: 100,
            monthly_credits: 100,
            monthly_credits_used: 0,
            monthly_reset_at: new Date(),
            rollover_credits: 0,
            rollover_expires_at: null,
            purchased_credits: 0,
          },
        ],
      });

      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/playground/estimate',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          packageId: mockPackageId,
          userInput: 'Test input',
          model: 'sonnet',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('estimatedCredits');
      expect(body).toHaveProperty('estimatedTokens');
      expect(body).toHaveProperty('canAfford');
      expect(body).toHaveProperty('currentBalance');
    });
  });

  describe('GET /api/v1/playground/sessions', () => {
    it('should return paginated sessions', async () => {
      (server.pg.query as any)
        .mockResolvedValueOnce({
          rows: [
            {
              id: mockSessionId,
              user_id: mockUserId,
              org_id: null,
              package_id: mockPackageId,
              package_version: '1.0.0',
              package_name: 'test-package',
              conversation: [],
              credits_spent: 1,
              estimated_tokens: 100,
              model: 'claude-3-5-sonnet-20241022',
              total_tokens: 100,
              total_duration_ms: 1000,
              run_count: 1,
              is_public: false,
              share_token: null,
              created_at: new Date(),
              updated_at: new Date(),
              last_run_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/playground/sessions',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('sessions');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('pagination');
      expect(Array.isArray(body.sessions)).toBe(true);
    });

    it('should respect limit and offset query params', async () => {
      (server.pg.query as any)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/playground/sessions?limit=10&offset=20',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(20);
    });

    it('should enforce maximum limit of 100', async () => {
      (server.pg.query as any)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/playground/sessions?limit=200',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      // Verify the actual query was called with capped limit
      expect((server.pg.query as any).mock.calls[0][1][1]).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/v1/playground/sessions/:id', () => {
    it('should return session when user owns it', async () => {
      (server.pg.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: mockSessionId,
            user_id: mockUserId,
            org_id: null,
            package_id: mockPackageId,
            package_version: '1.0.0',
            package_name: 'test-package',
            conversation: [],
            credits_spent: 1,
            estimated_tokens: 100,
            model: 'claude-3-5-sonnet-20241022',
            total_tokens: 100,
            total_duration_ms: 1000,
            run_count: 1,
            is_public: false,
            share_token: null,
            created_at: new Date(),
            updated_at: new Date(),
            last_run_at: new Date(),
          },
        ],
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/playground/sessions/${mockSessionId}`,
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(mockSessionId);
    });

    it('should return 404 when session not found', async () => {
      (server.pg.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/playground/sessions/${mockSessionId}`,
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/v1/playground/sessions/:id', () => {
    it('should delete session when user owns it', async () => {
      (server.pg.query as any).mockResolvedValueOnce({ rowCount: 1 });

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/playground/sessions/${mockSessionId}`,
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect((server.pg.query as any)).toHaveBeenCalledWith(
        'DELETE FROM playground_sessions WHERE id = $1 AND user_id = $2',
        [mockSessionId, mockUserId]
      );
    });

    it('should return error when session not found or unauthorized', async () => {
      (server.pg.query as any).mockResolvedValueOnce({ rowCount: 0 });

      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/playground/sessions/${mockSessionId}`,
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/playground/sessions/:id/share', () => {
    it('should create share token for session', async () => {
      (server.pg.query as any).mockResolvedValueOnce({
        rows: [{ share_token: 'generated-token-123' }],
      });

      const response = await server.inject({
        method: 'POST',
        url: `/api/v1/playground/sessions/${mockSessionId}/share`,
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('shareToken');
      expect(body).toHaveProperty('shareUrl');
      expect(body.shareUrl).toContain(body.shareToken);
    });
  });

  describe('GET /api/v1/playground/shared/:token', () => {
    it('should return public session without authentication', async () => {
      (server.pg.query as any).mockResolvedValueOnce({
        rows: [
          {
            id: mockSessionId,
            user_id: mockUserId,
            org_id: null,
            package_id: mockPackageId,
            package_version: '1.0.0',
            package_name: 'test-package',
            conversation: [],
            credits_spent: 1,
            estimated_tokens: 100,
            model: 'claude-3-5-sonnet-20241022',
            total_tokens: 100,
            total_duration_ms: 1000,
            run_count: 1,
            is_public: true,
            share_token: 'abc123',
            created_at: new Date(),
            updated_at: new Date(),
            last_run_at: new Date(),
          },
        ],
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/playground/shared/abc123',
        // No authorization header
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.shareToken).toBe('abc123');
      expect(body.isPublic).toBe(true);
    });

    it('should return 404 for invalid share token', async () => {
      (server.pg.query as any).mockResolvedValueOnce({ rows: [] });

      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/playground/shared/invalid-token',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
