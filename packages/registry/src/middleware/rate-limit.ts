/**
 * Rate Limiting Middleware for Playground
 *
 * Implements tiered rate limiting based on user subscription level:
 * - Free users: 5 requests per minute
 * - PRPM+ users: 20 requests per minute
 * - Organization members: 100 requests per minute
 */

import { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store (should use Redis in production)
const store: RateLimitStore = {};

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  });
}, 60000);

/**
 * Get rate limit configuration based on user tier
 */
async function getRateLimitConfig(
  server: any,
  userId: string
): Promise<RateLimitConfig> {
  try {
    // Check if user has PRPM+ subscription
    const userResult = await server.pg.query(
      `SELECT prpm_plus_status FROM users WHERE id = $1`,
      [userId]
    );

    const isSubscriber = userResult.rows[0]?.prpm_plus_status === 'active';

    if (isSubscriber) {
      return {
        maxRequests: 20,
        windowMs: 60000, // 1 minute
      };
    }

    // Check if user is member of verified organization
    const orgResult = await server.pg.query(
      `SELECT o.id, o.is_verified
       FROM organization_members om
       JOIN organizations o ON om.org_id = o.id
       WHERE om.user_id = $1 AND o.is_verified = TRUE
       LIMIT 1`,
      [userId]
    );

    const isOrgMember = orgResult.rows.length > 0;

    if (isOrgMember) {
      return {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
      };
    }

    // Free tier
    return {
      maxRequests: 5,
      windowMs: 60000, // 1 minute
    };
  } catch (error) {
    // On error, use conservative limits
    return {
      maxRequests: 5,
      windowMs: 60000,
    };
  }
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter() {
  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const userId = (request.user as any)?.user_id;

    if (!userId) {
      // No user ID, skip rate limiting (auth middleware will handle)
      return;
    }

    // Get user's rate limit config
    const config = await getRateLimitConfig(request.server, userId);

    // Create unique key for this user
    const key = `ratelimit:playground:${userId}`;

    const now = Date.now();
    const record = store[key];

    // Initialize or reset if window expired
    if (!record || record.resetAt < now) {
      store[key] = {
        count: 1,
        resetAt: now + config.windowMs,
      };

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', config.maxRequests);
      reply.header('X-RateLimit-Remaining', config.maxRequests - 1);
      reply.header('X-RateLimit-Reset', Math.ceil(store[key].resetAt / 1000));

      return;
    }

    // Increment counter
    record.count += 1;

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', config.maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - record.count));
    reply.header('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    // Check if limit exceeded
    if (record.count > config.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      reply.header('Retry-After', retryAfter);

      return reply.code(429).send({
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Maximum ${config.maxRequests} requests per minute.`,
        retryAfter,
        upgradeUrl: '/playground/credits',
      });
    }
  };
}

/**
 * Stricter rate limit for credit purchases to prevent abuse
 */
export function createPurchaseRateLimiter() {
  return async function purchaseRateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const userId = (request.user as any)?.user_id;

    if (!userId) {
      return;
    }

    const key = `ratelimit:purchase:${userId}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 3; // Only 3 purchase attempts per minute

    const record = store[key];

    if (!record || record.resetAt < now) {
      store[key] = {
        count: 1,
        resetAt: now + windowMs,
      };
      return;
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      reply.header('Retry-After', retryAfter);

      return reply.code(429).send({
        error: 'rate_limit_exceeded',
        message: 'Too many purchase attempts. Please try again later.',
        retryAfter,
      });
    }
  };
}
