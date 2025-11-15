/**
 * Error Monitoring Service
 * Centralized error tracking and alerting for production issues
 */

import type { FastifyInstance } from 'fastify';

export interface ErrorContext {
  userId?: string;
  operation: string;
  metadata?: Record<string, any>;
}

export interface ErrorMetrics {
  error_count: number;
  error_rate: number;
  last_error_at?: Date;
}

export class ErrorMonitoringService {
  private server: FastifyInstance;
  private errorCounts: Map<string, number> = new Map();
  private readonly ALERT_THRESHOLD = 10; // Alert after 10 errors in 5 minutes
  private readonly TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(server: FastifyInstance) {
    this.server = server;

    // Clean up old error counts every minute
    setInterval(() => this.cleanupOldErrors(), 60000);
  }

  /**
   * Track an error with context
   */
  async trackError(
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    const errorKey = `${context.operation}:${error.name}`;

    try {
      // Log error with full context
      this.server.log.error({
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context: {
          ...context,
          timestamp: new Date().toISOString()
        }
      }, `Error in ${context.operation}`);

      // Track error count
      const currentCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, currentCount + 1);

      // Store in database for analytics
      await this.storeError(error, context);

      // Check if we need to alert
      if (currentCount + 1 >= this.ALERT_THRESHOLD) {
        await this.sendAlert(error, context, currentCount + 1);
      }
    } catch (trackingError) {
      // Don't let error tracking itself fail the request
      this.server.log.error({ trackingError }, 'Failed to track error');
    }
  }

  /**
   * Track OpenAI API errors
   */
  async trackOpenAIError(
    error: Error,
    operation: 'embedding' | 'query_enhancement',
    query?: string
  ): Promise<void> {
    await this.trackError(error, {
      operation: `openai_${operation}`,
      metadata: {
        query: query?.substring(0, 100), // First 100 chars
        error_code: (error as any).code,
        error_type: (error as any).type
      }
    });
  }

  /**
   * Track vector search errors
   */
  async trackVectorSearchError(
    error: Error,
    query: string,
    filters?: Record<string, any>
  ): Promise<void> {
    await this.trackError(error, {
      operation: 'vector_search',
      metadata: {
        query: query.substring(0, 100),
        filters,
        error_message: error.message
      }
    });
  }

  /**
   * Track query enhancement failures
   */
  async trackQueryEnhancementError(
    error: Error,
    query: string
  ): Promise<void> {
    await this.trackError(error, {
      operation: 'query_enhancement',
      metadata: {
        query: query.substring(0, 100),
        error_type: error.name
      }
    });
  }

  /**
   * Get error metrics for monitoring dashboard
   */
  async getErrorMetrics(
    operation?: string,
    timeWindow: string = '1 hour'
  ): Promise<ErrorMetrics> {
    try {
      const intervalMap: Record<string, string> = {
        '1 hour': '1 hour',
        '24 hours': '24 hours',
        '7 days': '7 days'
      };

      const interval = intervalMap[timeWindow] || '1 hour';

      const query = operation
        ? `SELECT
             COUNT(*) as error_count,
             MAX(created_at) as last_error_at
           FROM error_logs
           WHERE operation = $1
             AND created_at > NOW() - INTERVAL '${interval}'`
        : `SELECT
             COUNT(*) as error_count,
             MAX(created_at) as last_error_at
           FROM error_logs
           WHERE created_at > NOW() - INTERVAL '${interval}'`;

      const params = operation ? [operation] : [];
      const result = await this.server.pg.query(query, params);

      const errorCount = parseInt(result.rows[0]?.error_count || '0');
      const totalQueries = await this.getTotalQueries(interval);

      return {
        error_count: errorCount,
        error_rate: totalQueries > 0 ? (errorCount / totalQueries) * 100 : 0,
        last_error_at: result.rows[0]?.last_error_at
      };
    } catch (error) {
      this.server.log.error({ error }, 'Failed to get error metrics');
      return { error_count: 0, error_rate: 0 };
    }
  }

  /**
   * Store error in database for analytics
   */
  private async storeError(
    error: Error,
    context: ErrorContext
  ): Promise<void> {
    try {
      // Create error_logs table if it doesn't exist (handled by migration)
      await this.server.pg.query(
        `INSERT INTO error_logs (
          operation,
          error_name,
          error_message,
          error_stack,
          user_id,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          context.operation,
          error.name,
          error.message,
          error.stack || null,
          context.userId || null,
          JSON.stringify(context.metadata || {})
        ]
      );
    } catch (storeError) {
      // Log but don't fail
      this.server.log.warn({ storeError }, 'Failed to store error in database');
    }
  }

  /**
   * Send alert for high error rate
   */
  private async sendAlert(
    error: Error,
    context: ErrorContext,
    count: number
  ): Promise<void> {
    // In production, this would integrate with:
    // - Sentry
    // - PagerDuty
    // - Slack webhook
    // - Email alert

    this.server.log.error({
      alert: 'HIGH_ERROR_RATE',
      operation: context.operation,
      error_name: error.name,
      error_count: count,
      threshold: this.ALERT_THRESHOLD,
      message: `High error rate detected for ${context.operation}: ${count} errors in ${this.TIME_WINDOW_MS / 1000}s`
    }, 'ALERT: High error rate');

    // Store alert in database
    try {
      await this.server.pg.query(
        `INSERT INTO error_alerts (
          operation,
          error_name,
          error_count,
          threshold,
          time_window_ms,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          context.operation,
          error.name,
          count,
          this.ALERT_THRESHOLD,
          this.TIME_WINDOW_MS
        ]
      );
    } catch (alertError) {
      this.server.log.warn({ alertError }, 'Failed to store alert');
    }
  }

  /**
   * Get total queries for error rate calculation
   */
  private async getTotalQueries(interval: string): Promise<number> {
    try {
      const result = await this.server.pg.query(
        `SELECT COUNT(*) as total
         FROM ai_search_usage
         WHERE created_at > NOW() - INTERVAL '${interval}'`
      );
      return parseInt(result.rows[0]?.total || '0');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean up old error counts from memory
   */
  private cleanupOldErrors(): void {
    // In a production system, you'd track timestamps
    // For now, just clear all counts every cleanup cycle
    // This ensures memory doesn't grow unbounded
    if (this.errorCounts.size > 1000) {
      this.errorCounts.clear();
    }
  }

  /**
   * Health check for error monitoring
   */
  async healthCheck(): Promise<{ status: string; error_rate: number }> {
    const metrics = await this.getErrorMetrics(undefined, '1 hour');

    return {
      status: metrics.error_rate > 5 ? 'degraded' : 'healthy',
      error_rate: metrics.error_rate
    };
  }
}
