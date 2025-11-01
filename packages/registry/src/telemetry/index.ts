/**
 * Registry Telemetry & Analytics
 * Tracks API usage, downloads, and user behavior
 */

import { PostHog } from 'posthog-node';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export interface TelemetryConfig {
  enabled: boolean;
  apiKey: string;
  host: string;
}

export interface APIRequestEvent {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  query?: Record<string, unknown>;
  error?: string;
}

export interface PackageDownloadEvent {
  packageId: string;
  version?: string;
  userId?: string;
  type?: string;
}

export interface SearchEvent {
  query: string;
  type?: string;
  filters?: Record<string, unknown>;
  resultCount: number;
  userId?: string;
}

export interface UserEvent {
  event: string;
  userId: string;
  properties?: Record<string, unknown>;
}

export interface ErrorEvent {
  error: string;
  stack?: string;
  endpoint?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

class RegistryTelemetry {
  private posthog: PostHog | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.ENABLE_TELEMETRY !== 'false';

    if (this.enabled) {
      try {
        this.posthog = new PostHog(
          process.env.POSTHOG_API_KEY || 'phc_aO5lXLILeylHfb1ynszVwKbQKSzO91UGdXNhN5Q0Snl',
          {
            host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
            flushAt: 10, // Batch 10 events
            flushInterval: 10000, // Flush every 10 seconds
          }
        );
      } catch (error) {
        console.error('Failed to initialize PostHog:', error);
        this.enabled = false;
      }
    }
  }

  /**
   * Track API request
   */
  async trackAPIRequest(event: APIRequestEvent): Promise<void> {
    if (!this.enabled || !this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: event.userId || 'anonymous',
        event: 'api_request',
        properties: {
          endpoint: event.endpoint,
          method: event.method,
          status_code: event.statusCode,
          duration_ms: event.duration,
          user_agent: event.userAgent,
          ip: this.anonymizeIP(event.ip),
          query_params: event.query,
          error: event.error,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Silently fail - don't break the app
      console.error('Telemetry tracking failed:', error);
    }
  }

  /**
   * Track package download
   */
  async trackPackageDownload(event: PackageDownloadEvent): Promise<void> {
    if (!this.enabled || !this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: event.userId || 'anonymous',
        event: 'package_download',
        properties: {
          package_id: event.packageId,
          version: event.version,
          type: event.type,
          timestamp: new Date().toISOString(),
        },
      });

      // Also increment counter
      this.posthog.capture({
        distinctId: 'system',
        event: 'download_counter',
        properties: {
          package_id: event.packageId,
          count: 1,
        },
      });
    } catch (error) {
      console.error('Telemetry tracking failed:', error);
    }
  }

  /**
   * Track search query
   */
  async trackSearch(event: SearchEvent): Promise<void> {
    if (!this.enabled || !this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: event.userId || 'anonymous',
        event: 'package_search',
        properties: {
          query: event.query,
          type: event.type,
          filters: event.filters,
          result_count: event.resultCount,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Telemetry tracking failed:', error);
    }
  }

  /**
   * Track user action
   */
  async trackUserEvent(event: UserEvent): Promise<void> {
    if (!this.enabled || !this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: event.userId,
        event: event.event,
        properties: {
          ...event.properties,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Telemetry tracking failed:', error);
    }
  }

  /**
   * Track error
   */
  async trackError(event: ErrorEvent): Promise<void> {
    if (!this.enabled || !this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: event.userId || 'anonymous',
        event: 'error',
        properties: {
          error: event.error,
          stack: event.stack,
          endpoint: event.endpoint,
          context: event.context,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Telemetry tracking failed:', error);
    }
  }

  /**
   * Anonymize IP address (GDPR compliance)
   */
  private anonymizeIP(ip?: string): string | undefined {
    if (!ip) return undefined;

    // IPv4: Remove last octet
    if (ip.includes('.')) {
      const parts = ip.split('.');
      parts[parts.length - 1] = '0';
      return parts.join('.');
    }

    // IPv6: Remove last 64 bits
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::';
    }

    return undefined;
  }

  /**
   * Shutdown telemetry (flush pending events)
   */
  async shutdown(): Promise<void> {
    if (this.posthog) {
      try {
        await this.posthog.shutdown();
      } catch (error) {
        console.error('Error shutting down telemetry:', error);
      }
    }
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const telemetry = new RegistryTelemetry();

/**
 * Fastify plugin for request tracking
 */
export async function registerTelemetryPlugin(server: FastifyInstance) {
  // Track all requests
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Store start time
    request.startTime = Date.now();
  });

  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!telemetry.isEnabled()) return;

    const duration = Date.now() - (request.startTime || Date.now());

    // Extract user ID from JWT if available
    const userId = request.user?.user_id;

    // Track the request
    await telemetry.trackAPIRequest({
      endpoint: request.routeOptions?.url || request.url,
      method: request.method,
      statusCode: reply.statusCode,
      duration,
      userId,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      query: request.query as Record<string, unknown>,
      error: reply.statusCode >= 400 ? `HTTP ${reply.statusCode}` : undefined,
    });
  });

  // Track errors
  server.setErrorHandler(async (error, request, reply) => {
    await telemetry.trackError({
      error: error.message,
      stack: error.stack,
      endpoint: request.routeOptions?.url || request.url,
      userId: request.user?.user_id,
      context: {
        method: request.method,
        query: request.query,
      },
    });

    // Re-throw to let Fastify handle it
    throw error;
  });

  server.log.info('✅ Telemetry plugin registered');
}
