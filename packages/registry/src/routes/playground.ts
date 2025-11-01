/**
 * Playground API Routes
 *
 * Handles playground execution, session management, and sharing.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PlaygroundService } from '../services/playground.js';
import { PlaygroundCreditsService } from '../services/playground-credits.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { sanitizeUserInput, SECURITY_LIMITS } from '../middleware/security.js';
import { getModelId } from '../config/models.js';

// Request validation schemas
const PlaygroundRunSchema = z.object({
  package_id: z.string().uuid('Invalid package ID'),
  package_version: z.string().optional(),
  input: z.string()
    .min(1, 'User input is required')
    .max(SECURITY_LIMITS.MAX_USER_INPUT_LENGTH, `Input too long (max ${SECURITY_LIMITS.MAX_USER_INPUT_LENGTH} characters)`),
  session_id: z.string().uuid().optional(),
  model: z.enum(['sonnet', 'opus', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']).optional().default('sonnet'),
});

const EstimateCreditSchema = z.object({
  package_id: z.string().uuid('Invalid package ID'),
  input: z.string().min(1).max(10000),
  model: z.enum(['sonnet', 'opus', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']).optional().default('sonnet'),
});

const ShareSessionSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
});

export async function playgroundRoutes(server: FastifyInstance) {
  const playgroundService = new PlaygroundService(server);
  const creditsService = new PlaygroundCreditsService(server);
  const rateLimiter = createRateLimiter();

  // =====================================================
  // POST /api/v1/playground/run
  // Execute a playground run
  // =====================================================
  server.post(
    '/run',
    {
      preHandler: [server.authenticate, rateLimiter],
      schema: {
        description: 'Execute a playground run with a package prompt',
        tags: ['playground'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['package_id', 'input'],
          properties: {
            package_id: { type: 'string', format: 'uuid' },
            package_version: { type: 'string' },
            input: { type: 'string', minLength: 1, maxLength: 10000 },
            session_id: { type: 'string', format: 'uuid' },
            model: { type: 'string', enum: ['sonnet', 'opus', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], default: 'sonnet' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              session_id: { type: 'string' },
              response: { type: 'string' },
              credits_spent: { type: 'number' },
              credits_remaining: { type: 'number' },
              tokens_used: { type: 'number' },
              duration_ms: { type: 'number' },
              model: { type: 'string' },
              conversation: { type: 'array' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          402: {
            type: 'object',
            properties: {
              error: { type: 'string', enum: ['insufficient_credits'] },
              message: { type: 'string' },
              required_credits: { type: 'number' },
              available_credits: { type: 'number' },
              purchase_url: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = PlaygroundRunSchema.parse(request.body);
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        // Sanitize user input for security
        const input = sanitizeUserInput(body.input);

        server.log.info(
          { userId, package_id: body.package_id, session_id: body.session_id },
          'Starting playground run'
        );

        const result = await playgroundService.executePrompt(userId, {
          package_id: body.package_id,
          package_version: body.package_version,
          input,
          session_id: body.session_id,
          model: body.model,
        });

        return reply.code(200).send(result);
      } catch (error: any) {
        server.log.error({ error }, 'Playground run failed');

        // Handle insufficient credits
        if (error.message?.includes('Insufficient credits')) {
          const match = error.message.match(/Need (\d+) but have (\d+)/);
          if (match) {
            return reply.code(402).send({
              error: 'insufficient_credits',
              message: error.message,
              required_credits: parseInt(match[1]),
              available_credits: parseInt(match[2]),
              purchase_url: '/playground/credits/buy',
            });
          }
        }

        return reply.code(400).send({
          error: 'playground_run_failed',
          message: error.message || 'Failed to execute playground run',
        });
      }
    }
  );

  // =====================================================
  // POST /api/v1/playground/estimate
  // Estimate credit cost before running
  // =====================================================
  server.post(
    '/estimate',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Estimate credit cost for a playground run',
        tags: ['playground'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['package_id', 'input'],
          properties: {
            package_id: { type: 'string', format: 'uuid' },
            input: { type: 'string', minLength: 1, maxLength: 10000 },
            model: { type: 'string', enum: ['sonnet', 'opus', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], default: 'sonnet' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              estimatedCredits: { type: 'number' },
              estimatedTokens: { type: 'number' },
              model: { type: 'string' },
              canAfford: { type: 'boolean' },
              currentBalance: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = EstimateCreditSchema.parse(request.body);
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        // Load package prompt to estimate
        const packageData = await playgroundService.loadPackagePrompt(body.package_id);

        // Estimate credits
        const estimatedCredits = playgroundService.estimateCredits(
          packageData.prompt.length,
          body.input.length,
          body.model
        );

        const estimatedTokens = Math.floor(
          ((packageData.prompt.length + body.input.length) / 4) * 1.3
        );

        // Check if user can afford
        const canAfford = await creditsService.canAfford(userId, estimatedCredits);
        const balance = await creditsService.getBalance(userId);

        return reply.code(200).send({
          estimated_credits: estimatedCredits,
          estimated_tokens: estimatedTokens,
          model: getModelId(body.model),
          can_afford: canAfford,
          current_balance: balance.balance,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Credit estimation failed');
        return reply.code(400).send({
          error: 'estimation_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // GET /api/v1/playground/sessions
  // List user's playground sessions
  // =====================================================
  server.get(
    '/sessions',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'List user playground sessions',
        tags: ['playground'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 20, maximum: 100 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sessions: { type: 'array' },
              total: { type: 'number' },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }
        const { limit = 20, offset = 0 } = request.query as any;

        const result = await playgroundService.listSessions(userId, {
          limit: Math.min(limit, 100),
          offset,
        });

        return reply.code(200).send({
          sessions: result.sessions,
          total: result.total,
          pagination: {
            limit,
            offset,
          },
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to list sessions');
        return reply.code(500).send({
          error: 'list_sessions_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // GET /api/v1/playground/sessions/:id
  // Get specific session
  // =====================================================
  server.get(
    '/sessions/:id',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Get a specific playground session',
        tags: ['playground'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        const session = await playgroundService.getSession(id, userId);

        if (!session) {
          return reply.code(404).send({
            error: 'session_not_found',
            message: 'Session not found or unauthorized',
          });
        }

        return reply.code(200).send(session);
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get session');
        return reply.code(500).send({
          error: 'get_session_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // DELETE /api/v1/playground/sessions/:id
  // Delete a session
  // =====================================================
  server.delete(
    '/sessions/:id',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Delete a playground session',
        tags: ['playground'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        await playgroundService.deleteSession(id, userId);

        return reply.code(200).send({
          message: 'Session deleted successfully',
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to delete session');
        return reply.code(400).send({
          error: 'delete_session_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // POST /api/v1/playground/sessions/:id/share
  // Share a session publicly
  // =====================================================
  server.post(
    '/sessions/:id/share',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Share a playground session publicly',
        tags: ['playground'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              shareToken: { type: 'string' },
              shareUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        const shareToken = await playgroundService.shareSession(id, userId);

        // Build share URL using config
        const shareUrl = `${server.config.frontend.url}/playground/shared/${shareToken}`;

        return reply.code(200).send({
          shareToken,
          shareUrl,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to share session');
        return reply.code(400).send({
          error: 'share_session_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // GET /api/v1/playground/shared/:token
  // Get shared session (public access)
  // =====================================================
  server.get(
    '/shared/:token',
    {
      schema: {
        description: 'Get a publicly shared playground session',
        tags: ['playground'],
        params: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
          required: ['token'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { token } = request.params as { token: string };

        const session = await playgroundService.getSessionByShareToken(token);

        if (!session) {
          return reply.code(404).send({
            error: 'session_not_found',
            message: 'Shared session not found',
          });
        }

        return reply.code(200).send(session);
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get shared session');
        return reply.code(500).send({
          error: 'get_shared_session_failed',
          message: error.message,
        });
      }
    }
  );
}
