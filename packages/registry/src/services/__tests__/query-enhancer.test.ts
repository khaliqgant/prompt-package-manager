/**
 * Tests for Query Enhancer Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryEnhancerService } from '../query-enhancer.js';
import type { FastifyInstance } from 'fastify';

// Mock Fastify instance
const mockServer = {
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  pg: {
    query: vi.fn()
  }
} as unknown as FastifyInstance;

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn()
        }
      };
    }
  };
});

describe('QueryEnhancerService', () => {
  let service: QueryEnhancerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QueryEnhancerService(mockServer);
    // Clear cache between tests
    service.clearCache();
  });

  describe('Synonym Expansion', () => {
    it('should expand "api" to include REST API, GraphQL, endpoint', async () => {
      const result = await service.enhanceQuery('api');

      expect(result.enhanced_query).toContain('api');
      expect(result.enhanced_query).toContain('rest api');
      expect(result.enhanced_query).toContain('graphql');
      expect(result.enhanced_query).toContain('endpoint');
    });

    it('should expand "auth" to include authentication synonyms', async () => {
      const result = await service.enhanceQuery('auth');

      expect(result.enhanced_query).toMatch(/authentication|authorization|login|oauth|jwt/);
    });

    it('should expand "db" to database terms', async () => {
      const result = await service.enhanceQuery('db');

      expect(result.enhanced_query).toMatch(/database|postgres|mysql|mongodb/);
    });

    it('should handle multiple expandable terms', async () => {
      const result = await service.enhanceQuery('api auth');

      expect(result.enhanced_query).toContain('api');
      expect(result.enhanced_query).toMatch(/authentication|auth/);
    });
  });

  describe('Concept Extraction', () => {
    it('should extract programming language concepts', async () => {
      const result = await service.enhanceQuery('Python Flask REST API');

      expect(result.key_concepts).toContain('python');
      expect(result.key_concepts).toContain('api');
    });

    it('should extract framework concepts', async () => {
      const result = await service.enhanceQuery('React testing with Jest');

      expect(result.key_concepts).toContain('react');
      expect(result.key_concepts).toContain('testing');
    });

    it('should extract multiple languages', async () => {
      const result = await service.enhanceQuery('JavaScript and TypeScript patterns');

      expect(result.key_concepts).toContain('javascript');
      expect(result.key_concepts).toContain('typescript');
    });

    it('should handle case-insensitive extraction', async () => {
      const result = await service.enhanceQuery('REACT TESTING');

      expect(result.key_concepts).toContain('react');
      expect(result.key_concepts).toContain('testing');
    });

    it('should return empty array for non-technical query', async () => {
      const result = await service.enhanceQuery('hello world');

      expect(result.key_concepts).toEqual([]);
    });
  });

  describe('Cache Behavior', () => {
    it('should cache query enhancement results', async () => {
      const query = 'Python Flask API';

      // First call
      const result1 = await service.enhanceQuery(query);

      // Second call should return cached result
      const result2 = await service.enhanceQuery(query);

      expect(result1).toEqual(result2);
    });

    it('should be case-insensitive for cache keys', async () => {
      const result1 = await service.enhanceQuery('Python Flask');
      const result2 = await service.enhanceQuery('python flask');

      expect(result1.enhanced_query).toEqual(result2.enhanced_query);
    });

    it('should clear cache on demand', async () => {
      await service.enhanceQuery('test query');

      service.clearCache();

      // After clear, should process query again
      const result = await service.enhanceQuery('test query');
      expect(result).toBeDefined();
    });
  });

  describe('Search Suggestions', () => {
    it('should return empty array for queries shorter than 3 characters', async () => {
      const suggestions = await service.generateSuggestions('ab', 5);

      expect(suggestions).toEqual([]);
    });

    it('should query database for suggestions', async () => {
      const mockResults = {
        rows: [
          { query: 'Python testing patterns' },
          { query: 'Python API development' }
        ]
      };
      (mockServer.pg.query as any).mockResolvedValue(mockResults);

      const suggestions = await service.generateSuggestions('Python', 5);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toBe('Python testing patterns');
      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['%Python%', 5])
      );
    });

    it('should handle database errors gracefully', async () => {
      (mockServer.pg.query as any).mockRejectedValue(new Error('DB error'));

      const suggestions = await service.generateSuggestions('test', 5);

      expect(suggestions).toEqual([]);
      expect(mockServer.log.warn).toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const mockResults = {
        rows: [
          { query: 'query 1' },
          { query: 'query 2' },
          { query: 'query 3' }
        ]
      };
      (mockServer.pg.query as any).mockResolvedValue(mockResults);

      await service.generateSuggestions('test', 3);

      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), 3])
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', async () => {
      const result = await service.enhanceQuery('');

      expect(result.original_query).toBe('');
      expect(result.enhanced_query).toBe('');
      expect(result.key_concepts).toEqual([]);
    });

    it('should handle very long query by truncating', async () => {
      const longQuery = 'a'.repeat(10000);

      const result = await service.enhanceQuery(longQuery);

      expect(result.original_query).toBe(longQuery);
      expect(result.enhanced_query).toBeDefined();
    });

    it('should handle special characters in query', async () => {
      const result = await service.enhanceQuery('api & auth + testing');

      expect(result.enhanced_query).toBeDefined();
      expect(result.key_concepts).toContain('api');
      expect(result.key_concepts).toContain('testing');
    });

    it('should handle queries with numbers', async () => {
      const result = await service.enhanceQuery('Python 3.11 async patterns');

      expect(result.key_concepts).toContain('python');
    });

    it('should handle unicode characters', async () => {
      const result = await service.enhanceQuery('React 组件 testing');

      expect(result.enhanced_query).toBeDefined();
    });
  });

  describe('AI Enhancement Fallback', () => {
    it('should fallback to synonym expansion if AI fails', async () => {
      // AI enhancement will fail because OpenAI is mocked
      const result = await service.enhanceQuery('api testing');

      // Should still get basic enhancement
      expect(result.enhanced_query).toBeDefined();
      expect(result.enhanced_query).toContain('api');
      expect(result.expansion_used).toBe(false); // AI didn't work
    });

    it('should log warning on AI enhancement failure', async () => {
      await service.enhanceQuery('test query');

      // Should have logged the AI enhancement attempt
      expect(mockServer.log.warn).toHaveBeenCalled();
    });
  });

  describe('Detected Intent', () => {
    it('should set default intent when AI enhancement fails', async () => {
      const result = await service.enhanceQuery('test query');

      expect(result.detected_intent).toBe('general_search');
    });

    it('should extract key concepts even without AI', async () => {
      const result = await service.enhanceQuery('Python Flask testing');

      expect(result.key_concepts).toContain('python');
      expect(result.key_concepts).toContain('testing');
    });
  });

  describe('Query Enhancement Metadata', () => {
    it('should return original query in metadata', async () => {
      const originalQuery = 'Python API';
      const result = await service.enhanceQuery(originalQuery);

      expect(result.original_query).toBe(originalQuery);
    });

    it('should indicate if expansion was used', async () => {
      const result = await service.enhanceQuery('api auth');

      expect(typeof result.expansion_used).toBe('boolean');
    });

    it('should provide key concepts array', async () => {
      const result = await service.enhanceQuery('React TypeScript');

      expect(Array.isArray(result.key_concepts)).toBe(true);
    });
  });
});
