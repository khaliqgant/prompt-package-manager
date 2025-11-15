/**
 * Tests for AI search command
 */

import { handleAISearch } from '../commands/ai-search';
import { getConfig } from '../core/user-config';
import { telemetry } from '../core/telemetry';

// Mock dependencies
jest.mock('../core/user-config');
jest.mock('../core/telemetry', () => ({
  telemetry: {
    track: jest.fn(),
    shutdown: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('AI Search Command', () => {
  const mockConfig = {
    registryUrl: 'https://test-registry.com',
    token: 'test-token',
  };

  beforeEach(() => {
    (getConfig as jest.Mock).mockResolvedValue(mockConfig);
    (global.fetch as jest.Mock).mockClear();

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const unauthConfig = { ...mockConfig, token: undefined };
      (getConfig as jest.Mock).mockResolvedValue(unauthConfig);

      await expect(
        handleAISearch('test query', {})
      ).rejects.toThrow('Authentication required');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Authentication required')
      );
    });

    it('should handle 401 authentication failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        ok: false,
      });

      await expect(
        handleAISearch('test query', {})
      ).rejects.toThrow('Authentication failed');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-registry.com/api/v1/ai-search',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle 403 PRPM+ subscription required', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 403,
        ok: false,
        json: async () => ({
          upgrade_info: {
            feature: 'AI Search',
            trial_available: true,
          },
        }),
      });

      await expect(
        handleAISearch('test query', {})
      ).rejects.toThrow('subscription required');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('PRPM+ subscription')
      );
    });
  });

  describe('Query Validation', () => {
    it('should reject empty queries', async () => {
      await handleAISearch('', {});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('provide a search query')
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should accept valid queries', async () => {
      const mockResponse = {
        results: [
          {
            package_id: 'pkg-1',
            name: '@test/package',
            description: 'Test package',
            similarity_score: 0.85,
            quality_score_normalized: 0.9,
            popularity_score_normalized: 0.7,
            final_score: 0.82,
            ai_use_case_description: 'Build REST APIs',
            ai_best_for: 'Backend development',
            ai_similar_to: ['Flask', 'Django'],
            total_downloads: 1000,
            format: 'generic',
            subtype: 'prompt',
          },
        ],
        total_matches: 1,
        execution_time_ms: 250,
        query: 'Python Flask REST API',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await handleAISearch('Python Flask REST API', {});

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-registry.com/api/v1/ai-search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: expect.stringContaining('Python Flask REST API'),
        })
      );
    });
  });

  describe('Search Options', () => {
    it('should apply limit parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
          total_matches: 0,
          execution_time_ms: 100,
          query: 'test',
        }),
      });

      await handleAISearch('test query', { limit: 5 });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.limit).toBe(5);
    });

    it('should apply format filter', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
          total_matches: 0,
          execution_time_ms: 100,
          query: 'test',
        }),
      });

      await handleAISearch('test query', { format: 'claude' });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.filters.format).toBe('claude');
    });

    it('should apply multiple filters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
          total_matches: 0,
          execution_time_ms: 100,
          query: 'test',
        }),
      });

      await handleAISearch('test query', {
        format: 'cursor',
        subtype: 'rule',
        limit: 15,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.filters.format).toBe('cursor');
      expect(requestBody.filters.subtype).toBe('rule');
      expect(requestBody.limit).toBe(15);
    });
  });

  describe('Result Display', () => {
    it('should display results with match percentages', async () => {
      const mockResponse = {
        results: [
          {
            package_id: 'pkg-1',
            name: '@test/high-match',
            description: 'High match package',
            similarity_score: 0.92,
            quality_score_normalized: 0.85,
            popularity_score_normalized: 0.75,
            final_score: 0.87,
            ai_use_case_description: 'Perfect for REST APIs',
            ai_best_for: 'API development',
            ai_similar_to: ['Express', 'FastAPI'],
            total_downloads: 5000,
            format: 'generic',
            subtype: 'prompt',
          },
          {
            package_id: 'pkg-2',
            name: '@test/medium-match',
            description: 'Medium match package',
            similarity_score: 0.65,
            quality_score_normalized: 0.9,
            popularity_score_normalized: 0.8,
            final_score: 0.77,
            ai_use_case_description: 'Good for testing',
            ai_best_for: 'Test automation',
            ai_similar_to: [],
            total_downloads: 2000,
            format: 'claude',
            subtype: 'agent',
          },
        ],
        total_matches: 2,
        execution_time_ms: 245,
        query: 'REST API testing',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await handleAISearch('REST API testing', {});

      // Check that results are displayed
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('92% match')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('65% match')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Perfect for REST APIs')
      );
    });

    it('should show no results message when empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
          total_matches: 0,
          execution_time_ms: 150,
          query: 'obscure query',
        }),
      });

      await handleAISearch('obscure query', {});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No packages found')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        handleAISearch('test query', {})
      ).rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('AI search failed')
      );
    });

    it('should handle API errors with message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      await expect(
        handleAISearch('test query', {})
      ).rejects.toThrow();
    });
  });

  describe('Telemetry Tracking', () => {
    it('should track successful searches', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{ package_id: 'pkg-1', name: '@test/pkg' }],
          total_matches: 1,
          execution_time_ms: 200,
          query: 'test',
        }),
      });

      await handleAISearch('test query', {});

      expect(telemetry.track).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'ai-search',
          success: true,
          data: expect.objectContaining({
            query: 'test query',
            resultCount: 1,
            executionTime: 200,
          }),
        })
      );
    });

    it('should track failed searches', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Search failed')
      );

      await expect(
        handleAISearch('test query', {})
      ).rejects.toThrow();

      expect(telemetry.track).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'ai-search',
          success: false,
          error: expect.any(String),
        })
      );
    });
  });
});
