/**
 * Security Utilities for Playground
 *
 * Provides input validation, sanitization, and security checks
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Maximum sizes for various inputs
 */
export const SECURITY_LIMITS = {
  MAX_USER_INPUT_LENGTH: 50000, // 50KB
  MAX_PACKAGE_PROMPT_LENGTH: 100000, // 100KB
  MAX_CONVERSATION_MESSAGES: 100,
  MAX_SESSION_NAME_LENGTH: 200,
  WEBHOOK_TIMESTAMP_TOLERANCE: 300, // 5 minutes in seconds
};

/**
 * Validate environment variables at startup
 * Prevents runtime errors from missing critical configuration
 */
export function validateEnvironmentVariables() {
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'ANTHROPIC_API_KEY',
  ];

  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `These must be configured before the application can start.`
    );
  }

  // Validate Stripe webhook secret format
  if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
    console.warn(
      'WARNING: STRIPE_WEBHOOK_SECRET does not start with "whsec_". ' +
      'This may indicate an incorrect secret. Stripe webhook secrets should start with "whsec_".'
    );
  }
}

/**
 * Validate Stripe webhook signature with strict timestamp checking
 */
export function validateStripeWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  if (!secret) {
    return {
      valid: false,
      error: 'Webhook secret not configured',
    };
  }

  if (!signature) {
    return {
      valid: false,
      error: 'Missing signature header',
    };
  }

  try {
    // Parse signature header
    const elements = signature.split(',');
    const timestamp = elements
      .find((e) => e.startsWith('t='))
      ?.split('=')[1];

    if (!timestamp) {
      return {
        valid: false,
        error: 'Invalid signature format',
      };
    }

    // Check timestamp is recent (prevent replay attacks)
    const timestampSeconds = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const difference = now - timestampSeconds;

    if (difference > SECURITY_LIMITS.WEBHOOK_TIMESTAMP_TOLERANCE) {
      return {
        valid: false,
        error: `Webhook timestamp too old (${difference}s ago). Possible replay attack.`,
      };
    }

    if (difference < -SECURITY_LIMITS.WEBHOOK_TIMESTAMP_TOLERANCE) {
      return {
        valid: false,
        error: 'Webhook timestamp is in the future',
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Signature validation failed',
    };
  }
}

/**
 * Sanitize user input to prevent injection attacks
 * While AI providers handle this, it's good practice for logging/display
 */
export function sanitizeUserInput(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim excessive whitespace
  sanitized = sanitized.trim();

  // Truncate to max length
  if (sanitized.length > SECURITY_LIMITS.MAX_USER_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, SECURITY_LIMITS.MAX_USER_INPUT_LENGTH);
  }

  return sanitized;
}

/**
 * Validate package prompt size
 */
export function validatePackagePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt) {
    return {
      valid: false,
      error: 'Package prompt is empty',
    };
  }

  if (prompt.length > SECURITY_LIMITS.MAX_PACKAGE_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Package prompt exceeds maximum size (${SECURITY_LIMITS.MAX_PACKAGE_PROMPT_LENGTH} characters)`,
    };
  }

  return { valid: true };
}

/**
 * Validate conversation history
 */
export function validateConversationHistory(
  messages: Array<{ role: string; content: string }>
): { valid: boolean; error?: string } {
  if (messages.length > SECURITY_LIMITS.MAX_CONVERSATION_MESSAGES) {
    return {
      valid: false,
      error: `Too many messages in conversation (max ${SECURITY_LIMITS.MAX_CONVERSATION_MESSAGES})`,
    };
  }

  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return {
        valid: false,
        error: 'Invalid message role',
      };
    }

    if (msg.content.length > SECURITY_LIMITS.MAX_USER_INPUT_LENGTH) {
      return {
        valid: false,
        error: 'Message content exceeds maximum length',
      };
    }
  }

  return { valid: true };
}

/**
 * Middleware to log all requests for security audit trail
 */
export function createAuditLogMiddleware() {
  return async function auditLog(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request.user as any)?.user_id;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const method = request.method;
    const url = request.url;

    // Log request
    request.server.log.info({
      type: 'audit',
      userId: userId || 'anonymous',
      ip,
      userAgent,
      method,
      url,
      timestamp: new Date().toISOString(),
    }, 'API request');

    // Log response on completion
    reply.raw.on('finish', () => {
      request.server.log.info({
        type: 'audit',
        userId: userId || 'anonymous',
        ip,
        method,
        url,
        statusCode: reply.statusCode,
        duration: reply.getResponseTime(),
        timestamp: new Date().toISOString(),
      }, 'API response');
    });
  };
}

/**
 * Detect and block potential abuse patterns
 */
export function detectAbusePatterns(
  userId: string,
  recentRequests: Array<{ timestamp: number; endpoint: string }>
): { suspicious: boolean; reason?: string } {
  // Check for rapid-fire requests (> 10 per second)
  const now = Date.now();
  const lastSecond = recentRequests.filter(r => now - r.timestamp < 1000);

  if (lastSecond.length > 10) {
    return {
      suspicious: true,
      reason: 'Excessive request rate (> 10/second)',
    };
  }

  // Check for identical requests (potential bot)
  const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint));
  if (recentRequests.length > 20 && uniqueEndpoints.size === 1) {
    return {
      suspicious: true,
      reason: 'Repetitive identical requests',
    };
  }

  return { suspicious: false };
}
