/**
 * Playground Credits Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaygroundCreditsService } from '../playground-credits.js';
import type { FastifyInstance } from 'fastify';

const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
const mockSessionId = '123e4567-e89b-12d3-a456-426614174001';

describe('PlaygroundCreditsService', () => {
  let service: PlaygroundCreditsService;
  let mockServer: any;
  let mockClient: any;

  beforeEach(() => {
    // Mock database client
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Mock Fastify server with pg pool
    mockServer = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      pg: {
        pool: {
          connect: vi.fn().mockResolvedValue(mockClient),
        },
        query: vi.fn(),
      },
    };

    service = new PlaygroundCreditsService(mockServer as unknown as FastifyInstance);
  });

  describe('initializeCredits', () => {
    it('should create credits record with 5 free credits for new user', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT credits
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT transaction
        .mockResolvedValueOnce(undefined); // COMMIT

      await service.initializeCredits(mockUserId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO playground_credits'),
        [mockUserId]
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO playground_credit_transactions'),
        [mockUserId]
      );
    });

    it('should not create duplicate credits for existing user', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }) // User exists
        .mockResolvedValueOnce(undefined); // ROLLBACK

      await service.initializeCredits(mockUserId);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO playground_credits'),
        expect.anything()
      );
    });
  });

  describe('getBalance', () => {
    it('should return credit balance breakdown', async () => {
      const mockBalance = {
        balance: 250,
        monthly_credits: 200,
        monthly_credits_used: 50,
        monthly_reset_at: new Date('2025-02-01'),
        rollover_credits: 50,
        rollover_expires_at: new Date('2025-02-15'),
        purchased_credits: 0,
      };

      mockServer.pg.query.mockResolvedValueOnce({
        rows: [mockBalance],
      });

      const balance = await service.getBalance(mockUserId);

      expect(balance.balance).toBe(250);
      expect(balance.monthly.allocated).toBe(200);
      expect(balance.monthly.used).toBe(50);
      expect(balance.monthly.remaining).toBe(150);
      expect(balance.rollover.amount).toBe(50);
      expect(balance.purchased).toBe(0);
      expect(balance.breakdown.monthly).toBe(150);
      expect(balance.breakdown.rollover).toBe(50);
      expect(balance.breakdown.purchased).toBe(0);
    });

    it('should initialize credits if user has none', async () => {
      mockServer.pg.query.mockResolvedValueOnce({ rows: [] });

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN from initializeCredits
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT credits
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT transaction
        .mockResolvedValueOnce(undefined); // COMMIT

      // After initialization, return the balance
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            balance: 5,
            monthly_credits: 0,
            monthly_credits_used: 0,
            monthly_reset_at: null,
            rollover_credits: 0,
            rollover_expires_at: null,
            purchased_credits: 5,
          },
        ],
      });

      const balance = await service.getBalance(mockUserId);

      expect(balance.balance).toBe(5);
      expect(balance.purchased).toBe(5);
    });
  });

  describe('canAfford', () => {
    it('should return true when user has sufficient credits', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            balance: 100,
            monthly_credits: 100,
            monthly_credits_used: 0,
            monthly_reset_at: new Date(),
            rollover_credits: 0,
            rollover_expires_at: null,
            purchased_credits: 0,
          },
        ],
      });

      const canAfford = await service.canAfford(mockUserId, 10);

      expect(canAfford).toBe(true);
    });

    it('should return false when user has insufficient credits', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            balance: 5,
            monthly_credits: 5,
            monthly_credits_used: 0,
            monthly_reset_at: new Date(),
            rollover_credits: 0,
            rollover_expires_at: null,
            purchased_credits: 0,
          },
        ],
      });

      const canAfford = await service.canAfford(mockUserId, 10);

      expect(canAfford).toBe(false);
    });

    it('should return false when user has zero credits', async () => {
      mockServer.pg.query.mockResolvedValueOnce({
        rows: [
          {
            balance: 0,
            monthly_credits: 0,
            monthly_credits_used: 0,
            monthly_reset_at: null,
            rollover_credits: 0,
            rollover_expires_at: null,
            purchased_credits: 0,
          },
        ],
      });

      const canAfford = await service.canAfford(mockUserId, 1);

      expect(canAfford).toBe(false);
    });
  });

  describe('spendCredits', () => {
    it('should deduct from monthly credits first', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          // Get current balance
          rows: [
            {
              balance: 250,
              monthly_credits: 200,
              monthly_credits_used: 50,
              rollover_credits: 50,
              purchased_credits: 0,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // UPDATE credits
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT transaction
        .mockResolvedValueOnce(undefined); // COMMIT

      await service.spendCredits(mockUserId, 10, mockSessionId, 'Test run');

      // Verify monthly_credits_used was incremented
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('monthly_credits_used'),
        expect.anything()
      );
    });

    it('should throw error when insufficient credits', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          // Get current balance
          rows: [
            {
              balance: 5,
              monthly_credits: 0,
              monthly_credits_used: 0,
              rollover_credits: 0,
              purchased_credits: 5,
            },
          ],
        });

      await expect(
        service.spendCredits(mockUserId, 10, mockSessionId, 'Test run')
      ).rejects.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({
          // Get current balance
          rows: [
            {
              balance: 100,
              monthly_credits: 100,
              monthly_credits_used: 0,
              rollover_credits: 0,
              purchased_credits: 0,
            },
          ],
        })
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE fails

      await expect(
        service.spendCredits(mockUserId, 10, mockSessionId, 'Test run')
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('addCredits', () => {
    it('should add credits to purchased balance', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // UPDATE credits
        .mockResolvedValueOnce({ rows: [{ balance: 110 }] }) // Get new balance
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT transaction
        .mockResolvedValueOnce(undefined); // COMMIT

      await service.addCredits(mockUserId, 100, 'purchase', 'Purchased 100 credits');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE playground_credits'),
        expect.anything()
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO playground_credit_transactions'),
        expect.anything()
      );
    });

    it('should include metadata in transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ balance: 100 }] }) // Get balance
        .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // INSERT transaction with metadata
        .mockResolvedValueOnce(undefined); // COMMIT

      const metadata = { stripePaymentIntentId: 'pi_123' };

      await service.addCredits(mockUserId, 50, 'purchase', 'Purchase', metadata);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO playground_credit_transactions'),
        expect.arrayContaining([expect.objectContaining(metadata)])
      );
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      const mockTransactions = [
        {
          id: '1',
          user_id: mockUserId,
          amount: -10,
          balance_after: 90,
          transaction_type: 'spend',
          description: 'Playground run',
          metadata: {},
          session_id: mockSessionId,
          purchase_id: null,
          created_at: new Date('2025-01-01'),
        },
        {
          id: '2',
          user_id: mockUserId,
          amount: 100,
          balance_after: 100,
          transaction_type: 'purchase',
          description: 'Purchased credits',
          metadata: {},
          session_id: null,
          purchase_id: 'pi_123',
          created_at: new Date('2025-01-01'),
        },
      ];

      mockServer.pg.query
        .mockResolvedValueOnce({ rows: mockTransactions }) // SELECT
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // COUNT

      const result = await service.getTransactionHistory(mockUserId, { limit: 50, offset: 0 });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.transactions[0].amount).toBe(-10);
      expect(result.transactions[1].amount).toBe(100);
    });

    it('should filter by transaction type', async () => {
      mockServer.pg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.getTransactionHistory(mockUserId, {
        limit: 50,
        offset: 0,
        type: 'purchase',
      });

      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('transaction_type = $4'),
        [mockUserId, 50, 0, 'purchase']
      );
    });

    it('should apply limit and offset', async () => {
      mockServer.pg.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.getTransactionHistory(mockUserId, { limit: 10, offset: 20 });

      expect(mockServer.pg.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [mockUserId, 10, 20]
      );
    });
  });
});
