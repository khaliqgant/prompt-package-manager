/**
 * Registry configuration from environment variables
 */

import { RegistryConfig } from './types.js';

export function loadConfig(): RegistryConfig {
  return {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3111', 10),
    host: process.env.HOST || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',

    database: {
      url: process.env.DATABASE_URL || 'postgresql://prpm:prpm@localhost:5432/prpm_registry',
    },

    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    search: {
      engine: (process.env.SEARCH_ENGINE || 'postgres') as 'postgres' | 'opensearch',
      opensearch: {
        endpoint: process.env.OPENSEARCH_ENDPOINT || '',
        region: process.env.AWS_REGION || 'us-east-1',
      },
    },

    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },


    nango: {
      apiKey: process.env.NANGO_API_KEY || '',
      host: process.env.NANGO_HOST || 'https://api.nango.dev',
      integrationId: process.env.NANGO_INTEGRATION_ID || 'github',
    },

    s3: {
      endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'prpm-packages',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },

    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    },

    packages: {
      maxSize: parseInt(process.env.MAX_PACKAGE_SIZE || '10485760', 10), // 10MB
      allowedExtensions: (process.env.ALLOWED_FILE_EXTENSIONS || '.md,.json,.yaml,.yml,.txt').split(','),
    },

    ai: {
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
      evaluationEnabled: process.env.AI_EVALUATION_ENABLED !== 'false',
    },

    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },

    frontend: {
      url: process.env.FRONTEND_URL || 'https://prpm.dev',
    },
  };
}

export const config = loadConfig();
