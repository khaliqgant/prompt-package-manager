/**
 * Playground Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaygroundService } from '../playground.js';
import type { FastifyInstance } from 'fastify';

// Mock data
const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
const mockPackageId = '123e4567-e89b-12d3-a456-426614174001';
const mockSessionId = '123e4567-e89b-12d3-a456-426614174002';

describe('PlaygroundService', () => {
  let service: PlaygroundService;
  let mockServer: any;
  let mockCreditsService: any;

  beforeEach(() => {
    // Mock Fastify server
    mockServer = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      pg: {
        query: vi.fn(),
      },
    };

    // Create service instance
    service = new PlaygroundService(mockServer as FastifyInstance);

    // Mock credits service
    mockCreditsService = {
      canAfford: vi.fn().mockResolvedValue(true),
      spendCredits: vi.fn().mockResolvedValue(undefined),
      getBalance: vi.fn().mockResolvedValue({
        balance: 100,
        monthly: { allocated: 200, used: 100, remaining: 100, resetAt: null },
        rollover: { amount: 0, expiresAt: null },
        purchased: 0,
        breakdown: { monthly: 100, rollover: 0, purchased: 0 },
      }),
    };

    // Inject mock credits service
    (service as any).creditsService = mockCreditsService;
  });

  describe('estimateCredits', () => {
    it('should return 1 credit for small Sonnet prompt', () => {
      const credits = service.estimateCredits(1000, 500, 'sonnet');
      expect(credits).toBe(1);
    });

    it('should return 3 credits for Opus model', () => {
      const credits = service.estimateCredits(1000, 500, 'opus');
      expect(credits).toBe(3);
    });

    it('should return 2 credits for GPT-4o model', () => {
      const credits = service.estimateCredits(1000, 500, 'gpt-4o');
      expect(credits).toBe(2);
    });

    it('should return 1 credit for GPT-4o-mini model', () => {
      const credits = service.estimateCredits(1000, 500, 'gpt-4o-mini');
      expect(credits).toBe(1);
    });

    it('should return 3 credits for GPT-4-turbo model', () => {
      const credits = service.estimateCredits(1000, 500, 'gpt-4-turbo');
      expect(credits).toBe(3);
    });

    it('should increase credits for larger prompts with Sonnet', () => {
      const largePromptCredits = service.estimateCredits(10000, 5000, 'sonnet');
      const smallPromptCredits = service.estimateCredits(1000, 500, 'sonnet');
      expect(largePromptCredits).toBeGreaterThan(smallPromptCredits);
    });

    it('should factor in conversation history', () => {
      const conversationHistory = [
        { role: 'user' as const, content: 'First message with some content', timestamp: '2025-01-01T00:00:00Z' },
        { role: 'assistant' as const, content: 'Response with more content', timestamp: '2025-01-01T00:00:01Z' },
      ];

      const withHistory = service.estimateCredits(1000, 500, 'sonnet', conversationHistory);
      const withoutHistory = service.estimateCredits(1000, 500, 'sonnet');

      expect(withHistory).toBeGreaterThanOrEqual(withoutHistory);
    });
  });

  describe('loadPackagePrompt', () => {
    it('should load latest version when no version specified', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            tarball_url: 'https://example.com/package.tgz',
            snippet: 'You are a helpful assistant',
            name: 'test-package',
          },
        ],
      });

      const prompt = await service.loadPackagePrompt(mockPackageId);

      expect(prompt).toBe('You are a helpful assistant');
      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY pv.published_at DESC'),
        [mockPackageId]
      );
    });

    it('should load specific version when version specified', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            tarball_url: 'https://example.com/package.tgz',
            snippet: 'You are a helpful assistant v1.0.0',
            name: 'test-package',
          },
        ],
      });

      const prompt = await service.loadPackagePrompt(mockPackageId, '1.0.0');

      expect(prompt).toBe('You are a helpful assistant v1.0.0');
      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('pv.version = $2'),
        [mockPackageId, '1.0.0']
      );
    });

    it('should throw error when package not found', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.loadPackagePrompt(mockPackageId)).rejects.toThrow('Package not found');
    });

    it('should throw error when package has no snippet', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            tarball_url: 'https://example.com/package.tgz',
            snippet: null,
            name: 'test-package',
          },
        ],
      });

      await expect(service.loadPackagePrompt(mockPackageId)).rejects.toThrow(
        'Package content not available'
      );
    });
  });

  describe('getSession', () => {
    it('should return session when user owns it', async () => {
      const mockSession = {
        id: mockSessionId,
        user_id: mockUserId,
        org_id: null,
        package_id: mockPackageId,
        package_version: '1.0.0',
        package_name: 'test-package',
        conversation: [{ role: 'user', content: 'Test', timestamp: '2025-01-01T00:00:00Z' }],
        credits_spent: 1,
        estimated_tokens: 100,
        model: 'claude-3-5-sonnet-20241022',
        total_tokens: 100,
        total_duration_ms: 1000,
        run_count: 1,
        is_public: false,
        share_token: null,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        last_run_at: new Date('2025-01-01'),
      };

      mockServer.pg.query.mockResolvedValueOnce({
        rows: [mockSession],
      });

      const session = await service.getSession(mockSessionId, mockUserId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(mockSessionId);
      expect(session?.user_id).toBe(mockUserId);
    });

    it('should return session when it is public', async () => {
      const mockSession = {
        id: mockSessionId,
        user_id: 'different-user',
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
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        last_run_at: new Date('2025-01-01'),
      };

      mockServer.pg.query.mockResolvedValueOnce({
        rows: [mockSession],
      });

      const session = await service.getSession(mockSessionId, mockUserId);

      expect(session).toBeDefined();
      expect(session?.is_public).toBe(true);
    });

    it('should return null when session not found', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [],
      });

      const session = await service.getSession(mockSessionId, mockUserId);

      expect(session).toBeNull();
    });
  });

  describe('listSessions', () => {
    it('should return paginated sessions', async () => {
      const mockSessions = [
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
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-01'),
          last_run_at: new Date('2025-01-01'),
        },
      ];

      mockServer.pg.query
        .mockResolvedValueOnce({ rows: mockSessions }) // List query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Count query

      const result = await service.listSessions(mockUserId, { limit: 20, offset: 0 });

      expect(result.sessions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.sessions[0].id).toBe(mockSessionId);
    });

    it('should apply limit and offset correctly', async () => {
      mockServer.pg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      await service.listSessions(mockUserId, { limit: 10, offset: 20 });

      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [mockUserId, 10, 20]
      );
    });

    it('should default to limit 20 offset 0', async () => {
      mockServer.pg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listSessions(mockUserId);

      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [mockUserId, 20, 0]
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete session when user owns it', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rowCount: 1,
      });

      await expect(service.deleteSession(mockSessionId, mockUserId)).resolves.toBeUndefined();

      expect(mockServer.pg.query).toHaveBeenCalledWith(
        'DELETE FROM playground_sessions WHERE id = $1 AND user_id = $2',
        [mockSessionId, mockUserId]
      );
    });

    it('should throw error when session not found or unauthorized', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rowCount: 0,
      });

      await expect(service.deleteSession(mockSessionId, mockUserId)).rejects.toThrow(
        'Session not found or unauthorized'
      );
    });
  });

  describe('shareSession', () => {
    it('should generate share token and make session public', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [{ share_token: 'generated-token-123' }],
      });

      const token = await service.shareSession(mockSessionId, mockUserId);

      expect(token).toBe('generated-token-123');
      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE playground_sessions'),
        expect.arrayContaining([expect.any(String), mockSessionId, mockUserId])
      );
    });

    it('should throw error when session not found', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.shareSession(mockSessionId, mockUserId)).rejects.toThrow(
        'Session not found or unauthorized'
      );
    });
  });

  describe('getSessionByShareToken', () => {
    it('should return public session by share token', async () => {
      const mockSession = {
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
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        last_run_at: new Date('2025-01-01'),
      };

      mockServer.pg.query.mockResolvedValueOnce({
        rows: [mockSession],
      });

      const session = await service.getSessionByShareToken('abc123');

      expect(session).toBeDefined();
      expect(session?.share_token).toBe('abc123');
      expect(session?.is_public).toBe(true);
    });

    it('should return null when share token not found', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [],
      });

      const session = await service.getSessionByShareToken('invalid-token');

      expect(session).toBeNull();
    });
  });
});
