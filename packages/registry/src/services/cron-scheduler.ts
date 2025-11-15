/**
 * Centralized Cron Job Scheduler
 *
 * Manages all scheduled background jobs for PRPM Registry:
 * - Analytics aggregation
 * - Playground credits reset
 * - Cost monitoring and analytics refresh
 * - Batch embedding generation for AI search
 */

import cron, { ScheduledTask } from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { PlaygroundCreditsService } from './playground-credits.js';
import { CostMonitoringService } from './cost-monitoring.js';
import { EmbeddingGenerationService } from './embedding-generation.js';

interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  cronInstance?: ScheduledTask;
}

export class CronScheduler {
  private server: FastifyInstance;
  private jobs: CronJob[] = [];
  private creditsService: PlaygroundCreditsService;
  private costMonitoring: CostMonitoringService;
  private embeddingService?: EmbeddingGenerationService;

  constructor(server: FastifyInstance) {
    this.server = server;
    this.creditsService = new PlaygroundCreditsService(server);
    this.costMonitoring = new CostMonitoringService(server);

    // Only initialize embedding service if OpenAI API key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        this.embeddingService = new EmbeddingGenerationService(server);
      } catch (error) {
        this.server.log.warn({ error }, 'Failed to initialize EmbeddingGenerationService - embeddings cron will be disabled');
      }
    }
  }

  /**
   * Initialize and start all cron jobs
   */
  start() {
    this.registerJobs();
    this.scheduleJobs();
    this.runStartupJobs();
    this.registerShutdownHooks();

    this.server.log.info(
      { jobCount: this.jobs.length },
      '⏰ Cron scheduler started with all jobs'
    );
  }

  /**
   * Register all cron jobs
   */
  private registerJobs() {
    this.jobs = [
      // =====================================================
      // ANALYTICS AGGREGATION
      // Daily at 1:00 AM UTC
      // =====================================================
      {
        name: 'Analytics Aggregation',
        schedule: '0 1 * * *', // Every day at 1 AM UTC
        task: async () => {
          try {
            this.server.log.info('🔄 Starting daily analytics aggregation...');

            // Get yesterday's date
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const targetDate = yesterday.toISOString().split('T')[0];

            // Call the aggregate_daily_stats function
            await this.server.pg.query(
              'SELECT aggregate_daily_stats($1::date)',
              [targetDate]
            );

            this.server.log.info(
              { date: targetDate },
              '✅ Daily analytics aggregation completed'
            );
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Daily analytics aggregation failed'
            );
          }
        },
      },

      // =====================================================
      // MONTHLY CREDITS RESET
      // Daily at 12:00 AM UTC (checks if reset needed)
      // =====================================================
      {
        name: 'Monthly Credits Reset',
        schedule: '0 0 * * *', // Every day at midnight UTC
        task: async () => {
          try {
            this.server.log.info('🔄 Starting monthly credits reset check...');

            const processedCount = await this.creditsService.processMonthlyReset();

            if (processedCount > 0) {
              this.server.log.info(
                { processedCount },
                '✅ Monthly credits reset completed'
              );
            } else {
              this.server.log.debug('No users needed monthly credit reset');
            }
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Monthly credits reset failed'
            );
          }
        },
      },

      // =====================================================
      // ROLLOVER CREDITS EXPIRATION
      // Daily at 12:05 AM UTC (after monthly reset)
      // =====================================================
      {
        name: 'Rollover Credits Expiration',
        schedule: '5 0 * * *', // Every day at 12:05 AM UTC
        task: async () => {
          try {
            this.server.log.info('🔄 Starting rollover credits expiration...');

            const expiredCount = await this.creditsService.expireRolloverCredits();

            if (expiredCount > 0) {
              this.server.log.info(
                { expiredCount },
                '✅ Rollover credits expiration completed'
              );
            } else {
              this.server.log.debug('No rollover credits to expire');
            }
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Rollover credits expiration failed'
            );
          }
        },
      },

      // =====================================================
      // MONTHLY API COST RESET
      // Daily at 12:10 AM UTC (after credits reset)
      // =====================================================
      {
        name: 'Monthly API Cost Reset',
        schedule: '10 0 * * *', // Every day at 12:10 AM UTC
        task: async () => {
          try {
            this.server.log.info('🔄 Starting monthly API cost reset check...');

            const resetCount = await this.costMonitoring.resetMonthlyCosts();

            if (resetCount > 0) {
              this.server.log.info(
                { resetCount },
                '✅ Monthly API cost reset completed'
              );
            } else {
              this.server.log.debug('No users needed monthly cost reset');
            }
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Monthly API cost reset failed'
            );
          }
        },
      },

      // =====================================================
      // COST ANALYTICS REFRESH
      // Hourly (on the hour)
      // =====================================================
      {
        name: 'Cost Analytics Refresh',
        schedule: '0 * * * *', // Every hour at :00
        task: async () => {
          try {
            this.server.log.info('🔄 Refreshing cost analytics...');

            await this.costMonitoring.refreshAnalytics();

            this.server.log.info('✅ Cost analytics refresh completed');
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Cost analytics refresh failed'
            );
          }
        },
      },

      // =====================================================
      // SHARED RESULTS ANALYTICS REFRESH
      // Hourly at :30 (offset from cost analytics)
      // =====================================================
      {
        name: 'Shared Results Analytics Refresh',
        schedule: '30 * * * *', // Every hour at :30
        task: async () => {
          try {
            this.server.log.info('🔄 Refreshing shared results analytics...');

            await this.server.pg.query('SELECT refresh_top_shared_results()');

            this.server.log.info('✅ Shared results analytics refresh completed');
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Shared results analytics refresh failed'
            );
          }
        },
      },
    ];

    // =====================================================
    // BATCH EMBEDDING GENERATION
    // Every 6 hours (catches packages without embeddings)
    // Only added if OpenAI API key is configured
    // =====================================================
    if (this.embeddingService) {
      this.jobs.push({
        name: 'Batch Embedding Generation',
        schedule: '0 */6 * * *', // Every 6 hours at :00
        task: async () => {
          try {
            this.server.log.info('🔄 Starting batch embedding generation...');

            // Find packages needing embeddings
            const packagesResult = await this.server.pg.query(`
              SELECT p.id, p.name
              FROM packages p
              WHERE p.visibility = 'public'
                AND p.deprecated = false
                AND needs_embedding_regeneration(p.id) = true
              ORDER BY p.total_downloads DESC
              LIMIT 50
            `);

            const packages = packagesResult.rows;

            if (packages.length === 0) {
              this.server.log.info('No packages need embedding generation');
              return;
            }

            this.server.log.info(
              { packageCount: packages.length },
              'Found packages needing embeddings'
            );

            let successful = 0;
            let failed = 0;
            let skipped = 0;

            // Process packages in batch with rate limiting
            for (const pkg of packages) {
              try {
                const result = await this.embeddingService!.generatePackageEmbedding({
                  package_id: pkg.id,
                  force_regenerate: false
                });

                if (result.success) {
                  if (result.skipped) {
                    skipped++;
                  } else {
                    successful++;
                    this.server.log.info(
                      { packageId: pkg.id, packageName: pkg.name },
                      'Generated embedding'
                    );
                  }
                } else {
                  failed++;
                  this.server.log.warn(
                    { packageId: pkg.id, packageName: pkg.name, error: result.error },
                    'Failed to generate embedding'
                  );
                }

                // Rate limiting: wait 200ms between API calls
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (error) {
                failed++;
                this.server.log.error(
                  { packageId: pkg.id, packageName: pkg.name, error },
                  'Exception generating embedding'
                );
              }
            }

            this.server.log.info(
              { total: packages.length, successful, failed, skipped },
              '✅ Batch embedding generation completed'
            );
          } catch (error) {
            this.server.log.error(
              { error },
              '❌ Batch embedding generation failed'
            );
          }
        },
      });
    }
  }

  /**
   * Schedule all jobs with node-cron
   */
  private scheduleJobs() {
    for (const job of this.jobs) {
      try {
        job.cronInstance = cron.schedule(job.schedule, job.task, {
          timezone: 'UTC',
        });

        this.server.log.info(
          { name: job.name, schedule: job.schedule },
          `⏰ Scheduled cron job`
        );
      } catch (error) {
        this.server.log.error(
          { error, jobName: job.name },
          '❌ Failed to schedule cron job'
        );
      }
    }
  }

  /**
   * Run initial jobs on startup (catch up)
   */
  private runStartupJobs() {
    // Run analytics aggregation after 5 seconds
    setTimeout(async () => {
      try {
        this.server.log.info('🔄 Running initial analytics aggregation on startup...');

        // Aggregate yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];

        await this.server.pg.query(
          'SELECT aggregate_daily_stats($1::date)',
          [yesterdayDate]
        );

        // Aggregate today (partial)
        const today = new Date().toISOString().split('T')[0];
        await this.server.pg.query(
          'SELECT aggregate_daily_stats($1::date)',
          [today]
        );

        this.server.log.info('✅ Initial analytics aggregation completed');
      } catch (error) {
        this.server.log.error({ error }, '❌ Initial analytics aggregation failed');
      }
    }, 5000);

    // Refresh cost analytics after 10 seconds
    setTimeout(async () => {
      try {
        this.server.log.info('🔄 Initial cost analytics refresh on startup...');
        await this.costMonitoring.refreshAnalytics();
        this.server.log.info('✅ Initial cost analytics refresh completed');
      } catch (error) {
        this.server.log.error({ error }, '❌ Initial cost analytics refresh failed');
      }
    }, 10000);

    // Refresh shared results analytics after 15 seconds
    setTimeout(async () => {
      try {
        this.server.log.info('🔄 Initial shared results analytics refresh on startup...');
        await this.server.pg.query('SELECT refresh_top_shared_results()');
        this.server.log.info('✅ Initial shared results analytics refresh completed');
      } catch (error) {
        this.server.log.error({ error }, '❌ Initial shared results analytics refresh failed');
      }
    }, 15000);
  }

  /**
   * Register shutdown hooks to stop all cron jobs gracefully
   */
  private registerShutdownHooks() {
    this.server.addHook('onClose', async () => {
      this.server.log.info('🛑 Stopping all cron jobs...');

      for (const job of this.jobs) {
        if (job.cronInstance) {
          job.cronInstance.stop();
          this.server.log.info({ name: job.name }, '🛑 Cron job stopped');
        }
      }

      this.server.log.info('✅ All cron jobs stopped gracefully');
    });
  }

  /**
   * Get status of all scheduled jobs
   */
  getJobsStatus() {
    return this.jobs.map(job => ({
      name: job.name,
      schedule: job.schedule,
      isRunning: job.cronInstance ? true : false,
    }));
  }
}

/**
 * Start the cron scheduler
 * Call this from index.ts after server is ready
 */
export function startCronScheduler(server: FastifyInstance) {
  const scheduler = new CronScheduler(server);
  scheduler.start();
  return scheduler;
}
