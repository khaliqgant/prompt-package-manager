/**
 * Playground Credits Service
 *
 * Manages credit balances, transactions, and spending for the playground feature.
 * Implements a credits-based system with monthly allocations, rollover, and purchases.
 */

import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import type {
  CreditBalance,
  CreditTransaction,
  PurchaseRecord,
} from '@pr-pm/types';

export class PlaygroundCreditsService {
  private db: Pool;
  private server: FastifyInstance;

  constructor(server: FastifyInstance) {
    this.server = server;
    this.db = server.pg.pool;
  }

  /**
   * Initialize credits for a new user
   * Gives 5 free trial credits
   */
  async initializeCredits(userId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Check if user already has credits
      const existing = await client.query(
        'SELECT id FROM playground_credits WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return; // Already initialized
      }

      // Create credits record with 5 free credits
      await client.query(
        `INSERT INTO playground_credits
         (user_id, balance, lifetime_earned, purchased_credits)
         VALUES ($1, 5, 5, 5)`,
        [userId]
      );

      // Log transaction
      await client.query(
        `INSERT INTO playground_credit_transactions
         (user_id, amount, balance_after, transaction_type, description)
         VALUES ($1, 5, 5, 'signup', 'Welcome to PRPM! Here are 5 free playground credits to get you started.')`,
        [userId]
      );

      await client.query('COMMIT');

      this.server.log.info({ userId, credits: 5 }, 'Initialized playground credits for new user');
    } catch (error) {
      await client.query('ROLLBACK');
      this.server.log.error({ error, userId }, 'Failed to initialize credits');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's current credit balance with breakdown
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const result = await this.db.query(
      `SELECT
        balance,
        monthly_credits,
        monthly_credits_used,
        monthly_reset_at,
        rollover_credits,
        rollover_expires_at,
        purchased_credits
       FROM playground_credits
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Initialize if not exists
      await this.initializeCredits(userId);
      return this.getBalance(userId);
    }

    const row = result.rows[0];

    return {
      balance: row.balance,
      monthly: {
        allocated: row.monthly_credits,
        used: row.monthly_credits_used,
        remaining: row.monthly_credits - row.monthly_credits_used,
        reset_at: row.monthly_reset_at,
      },
      rollover: {
        amount: row.rollover_credits,
        expires_at: row.rollover_expires_at,
      },
      purchased: row.purchased_credits,
      breakdown: {
        monthly: row.monthly_credits - row.monthly_credits_used,
        rollover: row.rollover_credits,
        purchased: row.purchased_credits,
      },
    };
  }

  /**
   * Check if user can afford an operation
   * Quick balance check without transaction
   */
  async canAfford(userId: string, credits: number): Promise<boolean> {
    const result = await this.db.query(
      'SELECT balance FROM playground_credits WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].balance >= credits;
  }

  /**
   * Spend credits for a playground operation
   * Deducts in priority order: monthly -> rollover -> purchased
   * Atomic transaction with row-level locking
   */
  async spendCredits(
    userId: string,
    credits: number,
    sessionId: string,
    description: string,
    metadata?: any
  ): Promise<CreditTransaction> {
    if (credits <= 0) {
      throw new Error('Credits must be positive');
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Lock the user's credit row
      const lockResult = await client.query(
        `SELECT
          balance,
          monthly_credits,
          monthly_credits_used,
          rollover_credits,
          purchased_credits
         FROM playground_credits
         WHERE user_id = $1
         FOR UPDATE`,
        [userId]
      );

      if (lockResult.rows.length === 0) {
        throw new Error('User credits not found');
      }

      const current = lockResult.rows[0];

      // Check sufficient balance
      if (current.balance < credits) {
        throw new Error(
          `Insufficient credits. Need ${credits} but have ${current.balance}`
        );
      }

      // Calculate deductions in priority order
      let remaining = credits;
      let newMonthlyUsed = current.monthly_credits_used;
      let newRollover = current.rollover_credits;
      let newPurchased = current.purchased_credits;

      // 1. Deduct from monthly credits first
      const monthlyAvailable = current.monthly_credits - current.monthly_credits_used;
      if (remaining > 0 && monthlyAvailable > 0) {
        const deduct = Math.min(remaining, monthlyAvailable);
        newMonthlyUsed += deduct;
        remaining -= deduct;
      }

      // 2. Then deduct from rollover credits
      if (remaining > 0 && current.rollover_credits > 0) {
        const deduct = Math.min(remaining, current.rollover_credits);
        newRollover -= deduct;
        remaining -= deduct;
      }

      // 3. Finally deduct from purchased credits
      if (remaining > 0 && current.purchased_credits > 0) {
        const deduct = Math.min(remaining, current.purchased_credits);
        newPurchased -= deduct;
        remaining -= deduct;
      }

      const newBalance = current.balance - credits;

      // Update credits
      await client.query(
        `UPDATE playground_credits
         SET
           balance = $1,
           monthly_credits_used = $2,
           rollover_credits = $3,
           purchased_credits = $4,
           lifetime_spent = lifetime_spent + $5,
           updated_at = NOW()
         WHERE user_id = $6`,
        [newBalance, newMonthlyUsed, newRollover, newPurchased, credits, userId]
      );

      // Log transaction
      const txResult = await client.query(
        `INSERT INTO playground_credit_transactions
         (user_id, amount, balance_after, transaction_type, description, metadata, session_id)
         VALUES ($1, $2, $3, 'spend', $4, $5, $6)
         RETURNING id, created_at`,
        [userId, -credits, newBalance, description, JSON.stringify(metadata || {}), sessionId]
      );

      await client.query('COMMIT');

      const transaction: CreditTransaction = {
        id: txResult.rows[0].id,
        user_id: userId,
        amount: -credits,
        balance_after: newBalance,
        type: 'spend',
        description,
        metadata,
        session_id: sessionId,
        created_at: txResult.rows[0].created_at,
      };

      this.server.log.info(
        {
          userId,
          credits,
          newBalance,
          sessionId,
          breakdown: {
            monthly: newMonthlyUsed - current.monthly_credits_used,
            rollover: current.rollover_credits - newRollover,
            purchased: current.purchased_credits - newPurchased,
          },
        },
        'Credits spent successfully'
      );

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      this.server.log.error({ error, userId, credits }, 'Failed to spend credits');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add credits to user's balance
   * Used for purchases, bonuses, monthly allocations
   */
  async addCredits(
    userId: string,
    credits: number,
    type: 'purchase' | 'monthly' | 'bonus' | 'admin',
    description: string,
    metadata?: {
      stripePaymentIntentId?: string;
      purchaseId?: string;
      orgId?: string;
    }
  ): Promise<CreditTransaction> {
    if (credits <= 0) {
      throw new Error('Credits must be positive');
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Lock user's credit row
      const lockResult = await client.query(
        `SELECT balance, purchased_credits, lifetime_earned
         FROM playground_credits
         WHERE user_id = $1
         FOR UPDATE`,
        [userId]
      );

      if (lockResult.rows.length === 0) {
        throw new Error('User credits not found');
      }

      const current = lockResult.rows[0];
      const newBalance = current.balance + credits;

      // Update based on type
      if (type === 'purchase' || type === 'bonus') {
        await client.query(
          `UPDATE playground_credits
           SET
             balance = $1,
             purchased_credits = purchased_credits + $2,
             lifetime_earned = lifetime_earned + $2,
             lifetime_purchased = lifetime_purchased + $2,
             updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, credits, userId]
        );
      } else {
        // monthly or admin credits
        await client.query(
          `UPDATE playground_credits
           SET
             balance = $1,
             lifetime_earned = lifetime_earned + $2,
             updated_at = NOW()
           WHERE user_id = $3`,
          [newBalance, credits, userId]
        );
      }

      // Log transaction
      const txResult = await client.query(
        `INSERT INTO playground_credit_transactions
         (user_id, org_id, amount, balance_after, transaction_type, description, metadata, purchase_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, created_at`,
        [
          userId,
          metadata?.orgId || null,
          credits,
          newBalance,
          type,
          description,
          JSON.stringify(metadata || {}),
          metadata?.purchaseId || null,
        ]
      );

      await client.query('COMMIT');

      const transaction: CreditTransaction = {
        id: txResult.rows[0].id,
        user_id: userId,
        amount: credits,
        balance_after: newBalance,
        type,
        description,
        metadata,
        purchase_id: metadata?.purchaseId,
        created_at: txResult.rows[0].created_at,
      };

      this.server.log.info(
        { userId, credits, newBalance, type },
        'Credits added successfully'
      );

      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      this.server.log.error({ error, userId, credits, type }, 'Failed to add credits');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Grant monthly credits to PRPM+ verified org members
   * Called when subscription starts or renews
   */
  async grantMonthlyCredits(userId: string, orgId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE playground_credits
         SET
           monthly_credits = 200,
           monthly_credits_used = 0,
           monthly_reset_at = NOW() + INTERVAL '1 month',
           balance = balance + 200,
           lifetime_earned = lifetime_earned + 200,
           updated_at = NOW()
         WHERE user_id = $1
         RETURNING balance`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User credits not found');
      }

      // Log transaction
      await client.query(
        `INSERT INTO playground_credit_transactions
         (user_id, org_id, amount, balance_after, transaction_type, description)
         VALUES ($1, $2, 200, $3, 'monthly', 'PRPM+ monthly credits allocated')`,
        [userId, orgId, result.rows[0].balance]
      );

      await client.query('COMMIT');

      this.server.log.info({ userId, orgId }, 'Monthly credits granted');
    } catch (error) {
      await client.query('ROLLBACK');
      this.server.log.error({ error, userId, orgId }, 'Failed to grant monthly credits');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove monthly credits allocation (subscription canceled)
   * Keeps existing balance but stops future allocations
   */
  async removeMonthlyCredits(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE playground_credits
       SET
         monthly_credits = 0,
         monthly_credits_used = 0,
         monthly_reset_at = NULL,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    this.server.log.info({ userId }, 'Monthly credits allocation removed');
  }

  /**
   * Get transaction history for user
   */
  async getTransactionHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
    } = {}
  ): Promise<{ transactions: CreditTransaction[]; total: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Build query
    let query = `
      SELECT
        id, user_id, amount, balance_after, transaction_type,
        description, metadata, session_id, purchase_id, created_at
      FROM playground_credit_transactions
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (options.type) {
      params.push(options.type);
      query += ` AND transaction_type = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);

    // Get total count
    const countQuery = options.type
      ? 'SELECT COUNT(*) FROM playground_credit_transactions WHERE user_id = $1 AND transaction_type = $2'
      : 'SELECT COUNT(*) FROM playground_credit_transactions WHERE user_id = $1';
    const countParams = options.type ? [userId, options.type] : [userId];
    const countResult = await this.db.query(countQuery, countParams);

    const transactions: CreditTransaction[] = result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      amount: row.amount,
      balance_after: row.balance_after,
      type: row.transaction_type,
      description: row.description,
      metadata: row.metadata,
      session_id: row.session_id,
      purchase_id: row.purchase_id,
      created_at: row.created_at,
    }));

    return {
      transactions,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Process monthly credit reset (cron job)
   * Calculates rollover and resets monthly allocation
   */
  async processMonthlyReset(): Promise<number> {
    const client = await this.db.connect();
    let processedCount = 0;

    try {
      // Find all users who need reset
      const users = await client.query(
        `SELECT
          id, user_id, balance, monthly_credits, monthly_credits_used,
          rollover_credits, purchased_credits
         FROM playground_credits
         WHERE monthly_reset_at <= NOW()
           AND monthly_reset_at IS NOT NULL
         FOR UPDATE`
      );

      for (const user of users.rows) {
        await client.query('BEGIN');

        try {
          // Calculate unused monthly credits
          const unusedMonthly = user.monthly_credits - user.monthly_credits_used;
          // Cap rollover at 200 credits (1 month's allocation)
          const newRollover = Math.min(unusedMonthly, 200);

          // Expire old rollover
          const rolloverToExpire = user.rollover_credits;
          const balanceChange = newRollover - rolloverToExpire + 200; // +200 for new month

          // Update credits
          await client.query(
            `UPDATE playground_credits
             SET
               monthly_credits = 200,
               monthly_credits_used = 0,
               monthly_reset_at = NOW() + INTERVAL '1 month',
               rollover_credits = $1,
               rollover_expires_at = NOW() + INTERVAL '1 month',
               balance = balance + $2,
               lifetime_earned = lifetime_earned + 200,
               updated_at = NOW()
             WHERE id = $3`,
            [newRollover, balanceChange, user.id]
          );

          // Log monthly reset transaction
          await client.query(
            `INSERT INTO playground_credit_transactions
             (user_id, amount, balance_after, transaction_type, description, metadata)
             SELECT $1, 200, balance, 'monthly', 'Monthly credits reset', $2
             FROM playground_credits WHERE id = $3`,
            [
              user.user_id,
              JSON.stringify({
                unusedMonthly,
                newRollover,
                expiredRollover: rolloverToExpire,
              }),
              user.id,
            ]
          );

          await client.query('COMMIT');
          processedCount++;

          this.server.log.info(
            {
              userId: user.user_id,
              unusedMonthly,
              newRollover,
              expiredRollover: rolloverToExpire,
            },
            'Monthly credits reset completed'
          );
        } catch (error) {
          await client.query('ROLLBACK');
          this.server.log.error(
            { error, userId: user.user_id },
            'Failed to reset monthly credits for user'
          );
        }
      }

      this.server.log.info({ count: processedCount }, 'Monthly credit reset job completed');
      return processedCount;
    } catch (error) {
      this.server.log.error({ error }, 'Monthly credit reset job failed');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Expire old rollover credits (cron job)
   * Removes rollover credits that are >1 month old
   */
  async expireRolloverCredits(): Promise<number> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE playground_credits
         SET
           balance = balance - rollover_credits,
           rollover_credits = 0,
           rollover_expires_at = NULL,
           updated_at = NOW()
         WHERE rollover_expires_at <= NOW()
           AND rollover_credits > 0
         RETURNING id, user_id, rollover_credits, balance`
      );

      // Log expirations
      for (const row of result.rows) {
        await client.query(
          `INSERT INTO playground_credit_transactions
           (user_id, amount, balance_after, transaction_type, description)
           VALUES ($1, $2, $3, 'expire', 'Rollover credits expired')`,
          [row.user_id, -row.rollover_credits, row.balance]
        );
      }

      await client.query('COMMIT');

      this.server.log.info(
        { count: result.rows.length },
        'Expired rollover credits job completed'
      );

      return result.rows.length;
    } catch (error) {
      await client.query('ROLLBACK');
      this.server.log.error({ error }, 'Failed to expire rollover credits');
      throw error;
    } finally {
      client.release();
    }
  }
}
