import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AISearchService } from '../ai-search';
import type { FastifyInstance } from 'fastify';
import type { AISearchQuery } from '@pr-pm/types';

describe('AISearchService', () => {
  let service: AISearchService;
  let mockFastify: Partial<FastifyInstance>;
  let mockPg: any;
  let mockOpenAI: any;

  beforeEach(() => {
    mockPg = {
      query: vi.fn(),
    };

    mockOpenAI = {
      embeddings: {
        create: vi.fn(),
      },
    };

    mockFastify = {
      pg: mockPg as any,
      openai: mockOpenAI,
    };

    service = new AISearchService(mockFastify as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should perform AI-powered semantic search', async () => {
      const query: AISearchQuery = {
        query: 'Python Flask REST API with authentication',
        limit: 10,
      };

      // Mock embedding generation
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          {
            embedding: new Array(1536).fill(0.1),
          },
        ],
      });

      // Mock vector search results
      const mockVectorResults = {
        rows: [
          {
            package_id: 'pkg-1',
            name: '@test/flask-api',
            description: 'Flask REST API template',
            similarity_score: 0.85,
            quality_score: 4.5,
            popularity_score: 1000,
            ai_use_case_description: 'Build REST APIs with Flask',
            ai_best_for: 'Python backend development',
            ai_similar_to: ['Django REST', 'FastAPI'],
            format: 'generic',
            subtype: 'prompt',
            total_downloads: 1000,
          },
        ],
      };

      // Mock max popularity for normalization
      const mockMaxPopularity = {
        rows: [{ max_downloads: 10000 }],
      };

      mockPg.query
        .mockResolvedValueOnce(mockVectorResults)
        .mockResolvedValueOnce(mockMaxPopularity)
        .mockResolvedValueOnce({ rows: [] }); // Usage tracking

      const result = await service.search(query, 'user-123');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('@test/flask-api');
      expect(result.results[0].similarity_score).toBeCloseTo(0.85);
      expect(result.results[0].final_score).toBeGreaterThan(0);
      expect(result.execution_time_ms).toBeGreaterThan(0);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: expect.any(String),
        dimensions: 1536,
      });
    });

    it('should apply format filter when provided', async () => {
      const query: AISearchQuery = {
        query: 'React testing patterns',
        limit: 10,
        filters: {
          format: 'cursor',
        },
      };

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      });

      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ max_downloads: 10000 }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.search(query, 'user-123');

      // Check that SQL WHERE clause includes format filter
      const sqlCalls = mockPg.query.mock.calls;
      expect(sqlCalls[0][0]).toContain('format = $');
    });

    it('should apply multiple filters when provided', async () => {
      const query: AISearchQuery = {
        query: 'debugging tools',
        limit: 5,
        filters: {
          format: 'claude',
          subtype: 'agent',
          min_quality: 4.0,
        },
      };

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      });

      mockPg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ max_downloads: 10000 }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.search(query, 'user-123');

      const sqlCalls = mockPg.query.mock.calls;
      const sql = sqlCalls[0][0];
      expect(sql).toContain('format = $');
      expect(sql).toContain('subtype = $');
      expect(sql).toContain('quality_score >= $');
    });

    it('should track usage for analytics', async () => {
      const query: AISearchQuery = {
        query: 'test query',
        limit: 10,
      };

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      });

      const mockResults = {
        rows: [
          {
            package_id: 'pkg-1',
            name: '@test/package',
            description: 'Test',
            similarity_score: 0.9,
            quality_score: 5.0,
            popularity_score: 500,
            format: 'generic',
            subtype: 'prompt',
            total_downloads: 500,
          },
        ],
      };

      mockPg.query
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce({ rows: [{ max_downloads: 10000 }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.search(query, 'user-123');

      // Check usage tracking INSERT
      const usageInsertCall = mockPg.query.mock.calls[2];
      expect(usageInsertCall[0]).toContain('INSERT INTO ai_search_usage');
      expect(usageInsertCall[1]).toContain('user-123');
      expect(usageInsertCall[1]).toContain('test query');
    });
  });

  describe('getSimilarPackages', () => {
    it('should find similar packages using embedding similarity', async () => {
      // Mock embedding retrieval
      const mockEmbedding = {
        rows: [
          {
            embedding: `[${new Array(1536).fill(0.1).join(',')}]`,
          },
        ],
      };

      // Mock similar packages
      const mockSimilar = {
        rows: [
          {
            package_id: 'pkg-2',
            name: '@test/similar-package',
            description: 'Similar package',
            similarity_score: 0.75,
            quality_score: 4.0,
            popularity_score: 800,
            format: 'generic',
            subtype: 'prompt',
            total_downloads: 800,
          },
        ],
      };

      mockPg.query
        .mockResolvedValueOnce(mockEmbedding)
        .mockResolvedValueOnce(mockSimilar)
        .mockResolvedValueOnce({ rows: [{ max_downloads: 10000 }] });

      const result = await service.getSimilarPackages('pkg-1', 5);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('@test/similar-package');
      expect(result[0].similarity_score).toBeCloseTo(0.75);
    });

    it('should throw error when package has no embedding', async () => {
      mockPg.query.mockResolvedValue({ rows: [] });

      await expect(
        service.getSimilarPackages('pkg-without-embedding', 5)
      ).rejects.toThrow('Package not found or has no embedding');
    });
  });

  describe('ranking algorithm', () => {
    it('should weight similarity highest (50%)', async () => {
      const query: AISearchQuery = {
        query: 'test',
        limit: 10,
      };

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      });

      const mockResults = {
        rows: [
          {
            package_id: 'pkg-1',
            name: '@test/high-similarity',
            similarity_score: 0.9,
            quality_score: 2.0, // Low quality
            popularity_score: 100, // Low popularity
            format: 'generic',
            subtype: 'prompt',
            total_downloads: 100,
          },
          {
            package_id: 'pkg-2',
            name: '@test/low-similarity',
            similarity_score: 0.5, // Lower similarity
            quality_score: 5.0, // High quality
            popularity_score: 10000, // High popularity
            format: 'generic',
            subtype: 'prompt',
            total_downloads: 10000,
          },
        ],
      };

      mockPg.query
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce({ rows: [{ max_downloads: 10000 }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.search(query, 'user-123');

      // High similarity package should rank first despite lower quality/popularity
      expect(result.results[0].package_id).toBe('pkg-1');
      expect(result.results[0].final_score).toBeGreaterThan(result.results[1].final_score);
    });
  });
});
