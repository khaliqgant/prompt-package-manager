/**
 * Playground Credits API Routes
 *
 * Handles credit balance, purchases, and transaction history.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { PlaygroundCreditsService } from '../services/playground-credits.js';
import { config } from '../config.js';
import { createPurchaseRateLimiter } from '../middleware/rate-limit.js';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-02-24.acacia',
});

// Request validation schemas
const PurchaseCreditsSchema = z.object({
  package: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: 'Package must be small, medium, or large' }),
  }),
});

const TransactionHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(['signup', 'monthly', 'purchase', 'spend', 'rollover', 'expire', 'refund', 'bonus', 'admin']).optional(),
});

// Credit package pricing
const CREDIT_PACKAGES = {
  small: { credits: 100, price: 500 }, // $5.00
  medium: { credits: 250, price: 1000 }, // $10.00
  large: { credits: 600, price: 2000 }, // $20.00
};

export async function playgroundCreditsRoutes(server: FastifyInstance) {
  const creditsService = new PlaygroundCreditsService(server);
  const purchaseRateLimiter = createPurchaseRateLimiter();

  // =====================================================
  // GET /api/v1/playground/credits
  // Get current credit balance
  // =====================================================
  server.get(
    '/credits',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Get user credit balance and breakdown',
        tags: ['playground', 'credits'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              balance: { type: 'number' },
              monthly: {
                type: 'object',
                properties: {
                  allocated: { type: 'number' },
                  used: { type: 'number' },
                  remaining: { type: 'number' },
                  resetAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
              rollover: {
                type: 'object',
                properties: {
                  amount: { type: 'number' },
                  expiresAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
              purchased: { type: 'number' },
              breakdown: {
                type: 'object',
                properties: {
                  monthly: { type: 'number' },
                  rollover: { type: 'number' },
                  purchased: { type: 'number' },
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

        const balance = await creditsService.getBalance(userId);

        return reply.code(200).send(balance);
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get credit balance');
        return reply.code(500).send({
          error: 'get_balance_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // GET /api/v1/playground/credits/history
  // Get credit transaction history
  // =====================================================
  server.get(
    '/credits/history',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Get credit transaction history',
        tags: ['playground', 'credits'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50, minimum: 1, maximum: 100 },
            offset: { type: 'number', default: 0, minimum: 0 },
            type: {
              type: 'string',
              enum: ['signup', 'monthly', 'purchase', 'spend', 'rollover', 'expire', 'refund', 'bonus', 'admin'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              transactions: { type: 'array' },
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

        const query = TransactionHistoryQuerySchema.parse(request.query);

        const result = await creditsService.getTransactionHistory(userId, query);

        return reply.code(200).send({
          transactions: result.transactions,
          total: result.total,
          pagination: {
            limit: query.limit,
            offset: query.offset,
          },
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get transaction history');
        return reply.code(500).send({
          error: 'get_history_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // POST /api/v1/playground/credits/purchase
  // Initiate credit purchase
  // =====================================================
  server.post(
    '/credits/purchase',
    {
      preHandler: [server.authenticate, purchaseRateLimiter],
      schema: {
        description: 'Initiate a credit purchase via Stripe',
        tags: ['playground', 'credits'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['package'],
          properties: {
            package: { type: 'string', enum: ['small', 'medium', 'large'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              clientSecret: { type: 'string' },
              credits: { type: 'number' },
              price: { type: 'number' },
              purchaseId: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = PurchaseCreditsSchema.parse(request.body);
        const userId = request.user?.user_id;
        const userEmail = request.user?.email;

        if (!userId || !userEmail) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        // Get package details
        const packageType = body.package as keyof typeof CREDIT_PACKAGES;
        const pkg = CREDIT_PACKAGES[packageType];
        const { credits, price } = pkg;

        server.log.info(
          { userId, package: body.package, credits, price },
          'Initiating credit purchase'
        );

        // Get or create Stripe customer
        let stripeCustomerId: string;

        // Check if user has existing customer ID
        const userResult = await server.pg.query(
          'SELECT stripe_customer_id FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows[0]?.stripe_customer_id) {
          stripeCustomerId = userResult.rows[0].stripe_customer_id;
        } else {
          // Create new Stripe customer
          const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
              userId,
            },
          });
          stripeCustomerId = customer.id;

          // Save customer ID
          await server.pg.query(
            'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
            [stripeCustomerId, userId]
          );
        }

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: price,
          currency: 'usd',
          customer: stripeCustomerId,
          metadata: {
            userId,
            credits: credits.toString(),
            package: body.package,
            type: 'playground_credits',
          },
          description: `PRPM Playground Credits - ${credits} credits`,
        });

        // Create purchase record in database
        const purchaseResult = await server.pg.query(
          `INSERT INTO playground_credit_purchases
           (user_id, credits, amount_cents, package_type, stripe_payment_intent_id, stripe_customer_id, stripe_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')
           RETURNING id`,
          [userId, credits, price, body.package, paymentIntent.id, stripeCustomerId]
        );

        const purchaseId = purchaseResult.rows[0].id;

        server.log.info(
          { userId, purchaseId, paymentIntentId: paymentIntent.id },
          'Credit purchase initiated'
        );

        return reply.code(200).send({
          clientSecret: paymentIntent.client_secret,
          credits,
          price,
          purchaseId,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to initiate credit purchase');
        return reply.code(400).send({
          error: 'purchase_failed',
          message: error.message || 'Failed to initiate credit purchase',
        });
      }
    }
  );

  // =====================================================
  // GET /api/v1/playground/credits/packages
  // Get available credit packages
  // =====================================================
  server.get(
    '/credits/packages',
    {
      schema: {
        description: 'Get available credit packages for purchase',
        tags: ['playground', 'credits'],
        response: {
          200: {
            type: 'object',
            properties: {
              packages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    credits: { type: 'number' },
                    price: { type: 'number' },
                    priceFormatted: { type: 'string' },
                    perCreditCost: { type: 'number' },
                    bonus: { type: 'number' },
                    description: { type: 'string' },
                    popular: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const packages = [
        {
          id: 'small',
          name: 'Small Pack',
          credits: 100,
          price: 500,
          priceFormatted: '$5.00',
          perCreditCost: 0.05,
          bonus: 0,
          description: 'Best for trying out the playground',
          popular: false,
        },
        {
          id: 'medium',
          name: 'Medium Pack',
          credits: 250,
          price: 1000,
          priceFormatted: '$10.00',
          perCreditCost: 0.04,
          bonus: 25,
          description: 'Best for regular playground users',
          popular: true,
        },
        {
          id: 'large',
          name: 'Large Pack',
          credits: 600,
          price: 2000,
          priceFormatted: '$20.00',
          perCreditCost: 0.033,
          bonus: 50,
          description: 'Best value for power users',
          popular: false,
        },
      ];

      return reply.code(200).send({ packages });
    }
  );

  // =====================================================
  // GET /api/v1/playground/pricing
  // Get user's pricing tier based on organization membership
  // =====================================================
  server.get(
    '/pricing',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Get PRPM+ pricing for current user',
        tags: ['playground', 'subscription'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              currency: { type: 'string' },
              interval: { type: 'string' },
              credits: { type: 'number' },
              isOrgMember: { type: 'boolean' },
              orgName: { type: 'string', nullable: true },
              discount: { type: 'number' },
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

        // Check if user is member of a verified organization
        const orgMemberResult = await server.pg.query(
          `SELECT o.id, o.name, o.is_verified
           FROM organization_members om
           JOIN organizations o ON om.org_id = o.id
           WHERE om.user_id = $1 AND o.is_verified = TRUE
           LIMIT 1`,
          [userId]
        );

        const isVerifiedOrgMember = orgMemberResult.rows.length > 0;
        const orgName = isVerifiedOrgMember ? orgMemberResult.rows[0].name : null;

        // Return pricing based on organization membership
        if (isVerifiedOrgMember) {
          return reply.code(200).send({
            price: 2.00,
            currency: 'USD',
            interval: 'month',
            credits: 200,
            isOrgMember: true,
            orgName,
            discount: 60, // 60% off
          });
        } else {
          return reply.code(200).send({
            price: 5.00,
            currency: 'USD',
            interval: 'month',
            credits: 200,
            isOrgMember: false,
            orgName: null,
            discount: 0,
          });
        }
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get pricing');
        return reply.code(500).send({
          error: 'pricing_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // POST /api/v1/playground/subscribe
  // Create PRPM+ subscription
  // =====================================================
  server.post(
    '/subscribe',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Subscribe to PRPM+ for 200 monthly playground credits',
        tags: ['playground', 'subscription'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['successUrl', 'cancelUrl'],
          properties: {
            successUrl: { type: 'string', format: 'uri' },
            cancelUrl: { type: 'string', format: 'uri' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              checkoutUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { successUrl, cancelUrl } = request.body as { successUrl: string; cancelUrl: string };
        const userId = request.user?.user_id;
        const userEmail = request.user?.email;

        if (!userId || !userEmail) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        // Check if user is member of a verified organization
        const orgMemberResult = await server.pg.query(
          `SELECT o.id, o.name, o.is_verified
           FROM organization_members om
           JOIN organizations o ON om.org_id = o.id
           WHERE om.user_id = $1 AND o.is_verified = TRUE
           LIMIT 1`,
          [userId]
        );

        const isVerifiedOrgMember = orgMemberResult.rows.length > 0;
        const orgId = isVerifiedOrgMember ? orgMemberResult.rows[0].id : null;

        // Select appropriate price ID based on organization membership
        let priceId: string;
        let planType: string;

        if (isVerifiedOrgMember) {
          priceId = process.env.STRIPE_PRPM_PLUS_ORG_MEMBER_PRICE_ID || '';
          planType = 'prpm_plus_org_member';
          server.log.info({ userId, orgId }, 'User is verified org member - using discounted pricing');
        } else {
          priceId = process.env.STRIPE_PRPM_PLUS_PRICE_ID || '';
          planType = 'prpm_plus_individual';
        }

        if (!priceId) {
          return reply.code(500).send({
            error: 'configuration_error',
            message: 'PRPM+ subscription not configured',
          });
        }

        server.log.info({ userId, planType }, 'Creating PRPM+ subscription checkout');

        // Get or create Stripe customer
        let stripeCustomerId: string;

        const userResult = await server.pg.query(
          'SELECT stripe_customer_id FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows[0]?.stripe_customer_id) {
          stripeCustomerId = userResult.rows[0].stripe_customer_id;
        } else {
          // Create new Stripe customer
          const customer = await stripe.customers.create({
            email: userEmail,
            metadata: {
              userId,
              type: 'prpm_plus',
            },
          });
          stripeCustomerId = customer.id;

          // Save customer ID
          await server.pg.query(
            'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
            [stripeCustomerId, userId]
          );
        }

        // Create Stripe Checkout session for subscription
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            userId,
            orgId: orgId || '',
            type: 'prpm_plus_subscription',
            planType,
          },
          subscription_data: {
            metadata: {
              userId,
              orgId: orgId || '',
              type: 'prpm_plus',
              planType,
            },
          },
        });

        server.log.info({ userId, sessionId: session.id }, 'PRPM+ checkout session created');

        return reply.code(200).send({
          checkoutUrl: session.url,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to create PRPM+ subscription');
        return reply.code(500).send({
          error: 'subscription_failed',
          message: error.message || 'Failed to create subscription',
        });
      }
    }
  );

  // =====================================================
  // GET /api/v1/playground/subscription
  // Get user's PRPM+ subscription status
  // =====================================================
  server.get(
    '/subscription',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Get PRPM+ subscription status',
        tags: ['playground', 'subscription'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              isActive: { type: 'boolean' },
              status: { type: 'string', nullable: true },
              cancelAtPeriodEnd: { type: 'boolean' },
              currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true },
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

        const userResult = await server.pg.query(
          `SELECT prpm_plus_status, prpm_plus_cancel_at_period_end, prpm_plus_current_period_end
           FROM users WHERE id = $1`,
          [userId]
        );

        const user = userResult.rows[0];
        const isActive = user?.prpm_plus_status === 'active';

        return reply.code(200).send({
          isActive,
          status: user?.prpm_plus_status || null,
          cancelAtPeriodEnd: user?.prpm_plus_cancel_at_period_end || false,
          currentPeriodEnd: user?.prpm_plus_current_period_end || null,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to get subscription status');
        return reply.code(500).send({
          error: 'status_check_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // POST /api/v1/playground/subscription/cancel
  // Cancel PRPM+ subscription
  // =====================================================
  server.post(
    '/subscription/cancel',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Cancel PRPM+ subscription at period end',
        tags: ['playground', 'subscription'],
        security: [{ bearerAuth: [] }],
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

        const userResult = await server.pg.query(
          'SELECT prpm_plus_subscription_id FROM users WHERE id = $1',
          [userId]
        );

        const subscriptionId = userResult.rows[0]?.prpm_plus_subscription_id;

        if (!subscriptionId) {
          return reply.code(404).send({
            error: 'no_subscription',
            message: 'No active subscription found',
          });
        }

        // Cancel at period end
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

        // Update database
        await server.pg.query(
          'UPDATE users SET prpm_plus_cancel_at_period_end = TRUE WHERE id = $1',
          [userId]
        );

        server.log.info({ userId, subscriptionId }, 'PRPM+ subscription cancelled');

        return reply.code(200).send({
          message: 'Subscription will be cancelled at the end of the current period',
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to cancel subscription');
        return reply.code(500).send({
          error: 'cancel_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // POST /api/v1/playground/subscription/portal
  // Get Stripe customer portal URL
  // =====================================================
  server.post(
    '/subscription/portal',
    {
      preHandler: server.authenticate,
      schema: {
        description: 'Get Stripe Customer Portal URL for managing subscription',
        tags: ['playground', 'subscription'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['returnUrl'],
          properties: {
            returnUrl: { type: 'string', format: 'uri' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              portalUrl: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { returnUrl } = request.body as { returnUrl: string };
        const userId = request.user?.user_id;

        if (!userId) {
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'User not authenticated',
          });
        }

        const userResult = await server.pg.query(
          'SELECT stripe_customer_id FROM users WHERE id = $1',
          [userId]
        );

        const stripeCustomerId = userResult.rows[0]?.stripe_customer_id;

        if (!stripeCustomerId) {
          return reply.code(404).send({
            error: 'no_customer',
            message: 'No Stripe customer found',
          });
        }

        // Create portal session
        const session = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: returnUrl,
        });

        return reply.code(200).send({
          portalUrl: session.url,
        });
      } catch (error: any) {
        server.log.error({ error }, 'Failed to create portal session');
        return reply.code(500).send({
          error: 'portal_failed',
          message: error.message,
        });
      }
    }
  );

  // =====================================================
  // Webhook handler for Stripe events
  // POST /api/v1/webhooks/stripe/credits
  // =====================================================
  server.post(
    '/webhooks/stripe/credits',
    {
      schema: {
        description: 'Handle Stripe webhook events for credit purchases',
        tags: ['webhooks'],
        hide: true, // Hide from Swagger docs
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const sig = request.headers['stripe-signature'];

      if (!sig) {
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }

      const rawBody = (request as any).rawBody;
      if (!rawBody) {
        return reply.code(400).send({ error: 'Raw body not available' });
      }

      try {
        // Validate webhook secret exists
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CREDITS || process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
          server.log.error('STRIPE_WEBHOOK_SECRET not configured');
          return reply.code(500).send({
            error: 'webhook_configuration_error',
            message: 'Webhook secret not configured',
          });
        }

        // Verify webhook signature with strict timestamp checking
        const event = stripe.webhooks.constructEvent(
          rawBody,
          sig as string,
          webhookSecret,
          300 // 5 minutes tolerance
        );

        server.log.info({ eventType: event.type, eventId: event.id }, 'Received Stripe webhook');

        // Handle different event types
        switch (event.type) {
          // ===== PRPM+ Subscription Events =====
          case 'customer.subscription.created':
          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;

            // Check if this is a PRPM+ subscription
            if (subscription.metadata.type === 'prpm_plus') {
              const userId = subscription.metadata.userId;

              server.log.info(
                { userId, subscriptionId: subscription.id, status: subscription.status },
                'Processing PRPM+ subscription update'
              );

              // Update user subscription status
              await server.pg.query(
                `UPDATE users
                 SET
                   prpm_plus_subscription_id = $1,
                   prpm_plus_status = $2,
                   prpm_plus_cancel_at_period_end = $3,
                   prpm_plus_current_period_end = to_timestamp($4)
                 WHERE id = $5`,
                [
                  subscription.id,
                  subscription.status,
                  subscription.cancel_at_period_end,
                  subscription.current_period_end,
                  userId,
                ]
              );

              // If subscription becomes active, grant 200 monthly credits
              if (subscription.status === 'active') {
                const now = new Date();
                const periodEnd = new Date(subscription.current_period_end * 1000);

                await server.pg.query(
                  `INSERT INTO playground_credits (user_id, monthly_credits, monthly_reset_at, balance, lifetime_earned)
                   VALUES ($1, 200, $2, 200, 200)
                   ON CONFLICT (user_id)
                   DO UPDATE SET
                     monthly_credits = 200,
                     monthly_reset_at = $2,
                     balance = playground_credits.balance + (200 - playground_credits.monthly_credits + playground_credits.monthly_credits_used),
                     monthly_credits_used = 0,
                     lifetime_earned = playground_credits.lifetime_earned + 200,
                     updated_at = NOW()`,
                  [userId, periodEnd]
                );

                // Log transaction
                await server.pg.query(
                  `INSERT INTO playground_credit_transactions (user_id, amount, balance_after, transaction_type, description, metadata)
                   SELECT $1, 200, balance, 'monthly', 'PRPM+ monthly credits', $2
                   FROM playground_credits WHERE user_id = $1`,
                  [userId, JSON.stringify({ subscriptionId: subscription.id })]
                );

                server.log.info({ userId }, 'PRPM+ monthly credits granted');
              }
            }
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;

            if (subscription.metadata.type === 'prpm_plus') {
              const userId = subscription.metadata.userId;

              server.log.info({ userId, subscriptionId: subscription.id }, 'PRPM+ subscription cancelled');

              // Update user status
              await server.pg.query(
                `UPDATE users
                 SET prpm_plus_status = 'canceled', prpm_plus_cancel_at_period_end = FALSE
                 WHERE id = $1`,
                [userId]
              );

              // Remove monthly credits allocation (but don't touch purchased/rollover credits)
              await server.pg.query(
                `UPDATE playground_credits
                 SET
                   monthly_credits = 0,
                   monthly_credits_used = 0,
                   monthly_reset_at = NULL,
                   balance = rollover_credits + purchased_credits,
                   updated_at = NOW()
                 WHERE user_id = $1`,
                [userId]
              );
            }
            break;
          }

          // ===== Credit Purchase Events =====
          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            // Check if this is a credit purchase
            if (paymentIntent.metadata.type === 'playground_credits') {
              const { userId, credits } = paymentIntent.metadata;

              server.log.info(
                { userId, credits, paymentIntentId: paymentIntent.id },
                'Processing successful credit purchase'
              );

              // Add credits to user balance
              await creditsService.addCredits(
                userId,
                parseInt(credits),
                'purchase',
                `Purchased ${credits} playground credits`,
                { stripePaymentIntentId: paymentIntent.id }
              );

              // Update purchase record
              await server.pg.query(
                `UPDATE playground_credit_purchases
                 SET stripe_status = 'succeeded', completed_at = NOW()
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id]
              );

              server.log.info({ userId, credits }, 'Credits added successfully');
            }
            break;
          }

          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;

            if (paymentIntent.metadata.type === 'playground_credits') {
              server.log.warn(
                { paymentIntentId: paymentIntent.id },
                'Credit purchase payment failed'
              );

              // Update purchase record
              await server.pg.query(
                `UPDATE playground_credit_purchases
                 SET stripe_status = 'failed', failed_at = NOW(), failure_reason = $2
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id, paymentIntent.last_payment_error?.message || 'Payment failed']
              );
            }
            break;
          }

          case 'charge.refunded': {
            const charge = event.data.object as Stripe.Charge;

            // Find the payment intent from charge
            const paymentIntentId = charge.payment_intent;

            if (typeof paymentIntentId === 'string') {
              const purchaseResult = await server.pg.query(
                `SELECT user_id, credits
                 FROM playground_credit_purchases
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntentId]
              );

              if (purchaseResult.rows.length > 0) {
                const { user_id, credits } = purchaseResult.rows[0];

                server.log.info(
                  { userId: user_id, credits, paymentIntentId },
                  'Processing credit refund'
                );

                // Deduct refunded credits (if user still has them)
                // This prevents abuse but doesn't break if credits were already spent
                const balance = await creditsService.getBalance(user_id);
                if (balance.purchased >= credits) {
                  await server.pg.query(
                    `UPDATE playground_credits
                     SET
                       balance = balance - $2,
                       purchased_credits = purchased_credits - $2,
                       updated_at = NOW()
                     WHERE user_id = $1`,
                    [user_id, credits]
                  );

                  // Log transaction
                  await server.pg.query(
                    `INSERT INTO playground_credit_transactions
                     (user_id, amount, balance_after, transaction_type, description, purchase_id)
                     SELECT $1, -$2, balance, 'refund', 'Credit purchase refunded', $3
                     FROM playground_credits WHERE user_id = $1`,
                    [user_id, credits, paymentIntentId]
                  );
                }

                // Update purchase record
                await server.pg.query(
                  `UPDATE playground_credit_purchases
                   SET stripe_status = 'refunded', refunded_at = NOW()
                   WHERE stripe_payment_intent_id = $1`,
                  [paymentIntentId]
                );
              }
            }
            break;
          }

          default:
            server.log.debug({ eventType: event.type }, 'Unhandled webhook event type');
        }

        return reply.code(200).send({ received: true });
      } catch (error: any) {
        server.log.error({ error }, 'Webhook processing failed');
        return reply.code(400).send({
          error: 'webhook_error',
          message: error.message,
        });
      }
    }
  );
}
