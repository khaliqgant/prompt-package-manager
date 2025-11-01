/**
 * Playground Credits Cron Jobs
 *
 * - Monthly credit reset: Allocates new monthly credits and calculates rollover
 * - Rollover expiration: Removes expired rollover credits
 *
 * Run these jobs daily at midnight UTC via cron or scheduler
 */

import { FastifyInstance } from 'fastify';
import { PlaygroundCreditsService } from '../services/playground-credits.js';

/**
 * Reset monthly credits for PRPM+ users
 * Should run daily at midnight UTC
 */
export async function runMonthlyCreditsReset(server: FastifyInstance): Promise<void> {
  const startTime = Date.now();

  try {
    server.log.info('Starting monthly credits reset job');

    const creditsService = new PlaygroundCreditsService(server);
    const processedCount = await creditsService.processMonthlyReset();

    const duration = Date.now() - startTime;

    server.log.info(
      {
        processedCount,
        durationMs: duration,
      },
      `✅ Monthly credits reset completed: ${processedCount} users processed in ${duration}ms`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    server.log.error(
      {
        error,
        durationMs: duration,
      },
      '❌ Monthly credits reset job failed'
    );
    throw error;
  }
}

/**
 * Expire old rollover credits
 * Should run daily at midnight UTC (after monthly reset)
 */
export async function runExpireRolloverCredits(server: FastifyInstance): Promise<void> {
  const startTime = Date.now();

  try {
    server.log.info('Starting rollover credits expiration job');

    const creditsService = new PlaygroundCreditsService(server);
    const expiredCount = await creditsService.expireRolloverCredits();

    const duration = Date.now() - startTime;

    server.log.info(
      {
        expiredCount,
        durationMs: duration,
      },
      `✅ Rollover expiration completed: ${expiredCount} users processed in ${duration}ms`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    server.log.error(
      {
        error,
        durationMs: duration,
      },
      '❌ Rollover expiration job failed'
    );
    throw error;
  }
}

/**
 * Run both jobs in sequence
 * Use this as the main cron job entry point
 */
export async function runAllPlaygroundCreditJobs(server: FastifyInstance): Promise<void> {
  server.log.info('🔄 Running playground credit maintenance jobs');

  try {
    // Run monthly reset first
    await runMonthlyCreditsReset(server);

    // Then expire old rollovers
    await runExpireRolloverCredits(server);

    server.log.info('✅ All playground credit jobs completed successfully');
  } catch (error) {
    server.log.error({ error }, '❌ Playground credit jobs failed');
    throw error;
  }
}
