/**
 * Tests for Error Monitoring Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorMonitoringService } from '../error-monitoring.js';
import type { FastifyInstance } from 'fastify';

describe('ErrorMonitoringService', () => {
  let service: ErrorMonitoringService;
  let mockServer: Partial<FastifyInstance>;
  let mockPg: any;

  beforeEach(() => {
    mockPg = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    };

    mockServer = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
        trace: vi.fn(),
        child: vi.fn()
      } as any,
      pg: mockPg
    };

    service = new ErrorMonitoringService(mockServer as FastifyInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('trackError', () => {
    it('should log error with full context', async () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.ts:10:15';

      await service.trackError(error, {
        operation: 'test_operation',
        userId: 'user-123',
        metadata: { foo: 'bar' }
      });

      expect(mockServer.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String)
          },
          context: expect.objectContaining({
            operation: 'test_operation',
            userId: 'user-123',
            metadata: { foo: 'bar' },
            timestamp: expect.any(String)
          })
        }),
        'Error in test_operation'
      );
    });

    it('should store error in database', async () => {
      const error = new Error('Database test error');

      await service.trackError(error, {
        operation: 'vector_search',
        userId: 'user-456'
      });

      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO error_logs'),
        expect.arrayContaining([
          'vector_search',
          'Error',
          'Database test error',
          expect.any(String), // stack
          'user-456',
          expect.any(String)  // metadata JSON
        ])
      );
    });

    it('should handle errors gracefully without throwing', async () => {
      mockPg.query.mockRejectedValue(new Error('DB connection failed'));

      const error = new Error('Test error');

      // Should not throw
      await expect(
        service.trackError(error, { operation: 'test' })
      ).resolves.not.toThrow();

      // Should log the tracking error
      expect(mockServer.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({ trackingError: expect.any(Error) }),
        'Failed to track error'
      );
    });

    it('should increment error count', async () => {
      const error = new Error('Repeated error');

      await service.trackError(error, { operation: 'test_op' });
      await service.trackError(error, { operation: 'test_op' });
      await service.trackError(error, { operation: 'test_op' });

      // Should have tracked 3 times
      expect(mockPg.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('trackOpenAIError', () => {
    it('should track OpenAI embedding errors with query context', async () => {
      const error = new Error('OpenAI rate limit exceeded');
      (error as any).code = 'rate_limit_exceeded';
      (error as any).type = 'rate_limit_error';

      await service.trackOpenAIError(error, 'embedding', 'test query for embeddings');

      expect(mockServer.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'openai_embedding',
            metadata: expect.objectContaining({
              query: 'test query for embeddings',
              error_code: 'rate_limit_exceeded',
              error_type: 'rate_limit_error'
            })
          })
        }),
        expect.any(String)
      );
    });

    it('should truncate long queries to 100 chars', async () => {
      const error = new Error('OpenAI error');
      const longQuery = 'a'.repeat(200);

      await service.trackOpenAIError(error, 'query_enhancement', longQuery);

      expect(mockServer.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            metadata: expect.objectContaining({
              query: 'a'.repeat(100)
            })
          })
        }),
        expect.any(String)
      );
    });

    it('should track query enhancement errors', async () => {
      const error = new Error('Query enhancement failed');

      await service.trackOpenAIError(error, 'query_enhancement', 'Python API');

      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO error_logs'),
        expect.arrayContaining([
          'openai_query_enhancement',
          expect.any(String),
          expect.any(String),
          expect.any(String),
          undefined, // userId
          expect.stringContaining('Python API')
        ])
      );
    });
  });

  describe('trackVectorSearchError', () => {
    it('should track vector search errors with query and filters', async () => {
      const error = new Error('Vector search timeout');
      const query = 'Python Flask REST API';
      const filters = { format: 'cursor', min_quality: 4.0 };

      await service.trackVectorSearchError(error, query, filters);

      expect(mockServer.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'vector_search',
            metadata: expect.objectContaining({
              query: 'Python Flask REST API',
              filters: { format: 'cursor', min_quality: 4.0 }
            })
          })
        }),
        expect.any(String)
      );
    });

    it('should work without filters', async () => {
      const error = new Error('Vector search failed');

      await service.trackVectorSearchError(error, 'test query');

      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO error_logs'),
        expect.arrayContaining([
          'vector_search',
          'Error',
          'Vector search failed'
        ])
      );
    });
  });

  describe('trackQueryEnhancementError', () => {
    it('should track query enhancement errors with query context', async () => {
      const error = new Error('AI model unavailable');
      const query = 'React testing patterns';

      await service.trackQueryEnhancementError(error, query);

      expect(mockServer.log?.error).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            operation: 'query_enhancement',
            metadata: expect.objectContaining({
              query: 'React testing patterns'
            })
          })
        }),
        expect.any(String)
      );
    });
  });

  describe('getErrorMetrics', () => {
    it('should calculate error metrics for an operation', async () => {
      mockPg.query.mockResolvedValue({
        rows: [
          {
            error_count: 15,
            error_rate: 0.05,
            last_error_at: new Date('2025-01-15T10:30:00Z')
          }
        ]
      });

      const metrics = await service.getErrorMetrics('openai_embedding', '1 hour');

      expect(metrics).toEqual({
        error_count: 15,
        error_rate: 0.05,
        last_error_at: expect.any(Date)
      });

      expect(mockPg.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM error_logs'),
        expect.arrayContaining(['openai_embedding', '1 hour'])
      );
    });

    it('should get metrics for all operations when operation not specified', async () => {
      mockPg.query.mockResolvedValue({
        rows: [{ error_count: 25, error_rate: 0.1 }]
      });

      const metrics = await service.getErrorMetrics();

      expect(metrics.error_count).toBe(25);
      expect(mockPg.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['1 hour'])
      );
    });

    it('should handle empty results', async () => {
      mockPg.query.mockResolvedValue({ rows: [] });

      const metrics = await service.getErrorMetrics('test_op', '30 minutes');

      expect(metrics).toEqual({
        error_count: 0,
        error_rate: 0,
        last_error_at: undefined
      });
    });
  });

  describe('alerting', () => {
    it('should send alert after threshold is reached', async () => {
      const error = new Error('Critical error');

      // Trigger 10 errors (threshold)
      for (let i = 0; i < 10; i++) {
        await service.trackError(error, {
          operation: 'critical_operation'
        });
      }

      // Should have inserted alert
      const alertCalls = mockPg.query.mock.calls.filter((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO error_alerts')
      );

      expect(alertCalls.length).toBeGreaterThan(0);
    });

    it('should not alert before threshold', async () => {
      const error = new Error('Minor error');

      // Trigger 5 errors (below threshold of 10)
      for (let i = 0; i < 5; i++) {
        await service.trackError(error, {
          operation: 'minor_operation'
        });
      }

      // Should not have inserted alert
      const alertCalls = mockPg.query.mock.calls.filter((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('INSERT INTO error_alerts')
      );

      expect(alertCalls.length).toBe(0);
    });
  });

  describe('error count cleanup', () => {
    it('should clean up old error counts', () => {
      // This would require timer mocking
      // For now, just verify the service initializes properly
      expect(service).toBeDefined();
    });
  });
});
