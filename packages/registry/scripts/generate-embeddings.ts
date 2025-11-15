/**
 * Generate embeddings for all packages
 *
 * Usage:
 *   npm run script:generate-embeddings                    # Process all packages needing embeddings
 *   npm run script:generate-embeddings -- --force         # Force regenerate all
 *   npm run script:generate-embeddings -- --dry-run       # Show what would be processed
 *   npm run script:generate-embeddings -- --batch-size 50 # Process 50 at a time
 *   npm run script:generate-embeddings -- --package-id abc-123  # Single package
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from app root (../../.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

import pg from 'pg';
import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import { EmbeddingGenerationService } from '../src/services/embedding-generation.js';
import type { BatchEmbeddingGenerationResult } from '@pr-pm/types';

const { Pool } = pg;

interface ScriptOptions {
  force: boolean;
  dryRun: boolean;
  batchSize: number;
  packageId?: string;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '25'),
    packageId: args.find(a => a.startsWith('--package-id='))?.split('=')[1]
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs();

  console.log('🚀 Starting embedding generation...\n');
  console.log('Options:');
  console.log(`  Force regenerate: ${options.force}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log(`  Batch size: ${options.batchSize}`);
  if (options.packageId) {
    console.log(`  Package ID: ${options.packageId}`);
  }
  console.log('');

  // Verify OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable required');
  }

  // Setup Fastify instance with postgres plugin (needed for service)
  const server = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    }
  });

  // Use DATABASE_URL if available, otherwise individual params
  const dbConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434'),
        database: process.env.DB_NAME || 'prpm',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      };

  await server.register(fastifyPostgres, dbConfig);

  try {
    // Test connection
    await server.pg.query('SELECT 1');
    console.log('✓ Connected to database\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.log('\nℹ️  Make sure your database is running and .env is configured');
    process.exit(1);
  }

  // Initialize service
  const embeddingService = new EmbeddingGenerationService(server);

  const startTime = Date.now();
  const result: BatchEmbeddingGenerationResult = {
    total_packages: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration_ms: 0,
    estimated_cost_usd: 0
  };

  try {
    if (options.packageId) {
      // Single package mode
      console.log(`📦 Processing single package: ${options.packageId}\n`);

      if (!options.dryRun) {
        const genResult = await embeddingService.generatePackageEmbedding({
          package_id: options.packageId,
          force_regenerate: options.force
        });

        result.total_packages = 1;
        result.processed = 1;

        if (genResult.success) {
          if (genResult.skipped) {
            result.skipped = 1;
            console.log(`⏭️  Skipped: ${genResult.skip_reason}`);
          } else {
            result.successful = 1;
            console.log(`✅ Success: ${genResult.package_name}`);
          }
        } else {
          result.failed = 1;
          result.errors.push({ package_id: options.packageId, error: genResult.error || 'Unknown error' });
          console.error(`❌ Failed: ${genResult.error}`);
        }
      }
    } else {
      // Batch mode - find packages needing embeddings
      console.log('📦 Loading packages...\n');

      let query: string;
      let params: any[] = [];

      if (options.force) {
        // Force regenerate all public, non-deprecated packages
        query = `
          SELECT id, name
          FROM packages
          WHERE visibility = 'public' AND deprecated = false
          ORDER BY total_downloads DESC
        `;
      } else {
        // Only packages needing regeneration
        query = `
          SELECT p.id, p.name
          FROM packages p
          WHERE p.visibility = 'public'
            AND p.deprecated = false
            AND needs_embedding_regeneration(p.id) = true
          ORDER BY p.total_downloads DESC
        `;
      }

      const packagesResult = await server.pg.query(query, params);
      const packages = packagesResult.rows;

      result.total_packages = packages.length;

      console.log(`Found ${packages.length} packages to process\n`);

      if (packages.length === 0) {
        console.log('✅ All embeddings are up to date!');
        return;
      }

      // Estimate cost
      result.estimated_cost_usd = embeddingService.estimateCost(packages.length);
      console.log(`💰 Estimated cost: $${result.estimated_cost_usd.toFixed(4)}\n`);

      if (options.dryRun) {
        console.log('🔍 Dry run - showing first 10 packages that would be processed:\n');
        packages.slice(0, 10).forEach((pkg, i) => {
          console.log(`  ${i + 1}. ${pkg.name} (${pkg.id})`);
        });
        if (packages.length > 10) {
          console.log(`  ... and ${packages.length - 10} more`);
        }
        console.log('\n✓ Dry run complete. Remove --dry-run to actually process.');
        return;
      }

      // Process in batches
      console.log(`Processing in batches of ${options.batchSize}...\n`);

      for (let i = 0; i < packages.length; i += options.batchSize) {
        const batch = packages.slice(i, i + options.batchSize);
        const batchNum = Math.floor(i / options.batchSize) + 1;
        const totalBatches = Math.ceil(packages.length / options.batchSize);

        console.log(`\n📦 Batch ${batchNum}/${totalBatches} (packages ${i + 1}-${Math.min(i + options.batchSize, packages.length)})`);
        console.log('─'.repeat(60));

        for (const pkg of batch) {
          result.processed++;

          try {
            const genResult = await embeddingService.generatePackageEmbedding({
              package_id: pkg.id,
              force_regenerate: options.force
            });

            if (genResult.success) {
              if (genResult.skipped) {
                result.skipped++;
                console.log(`  ⏭️  [${result.processed}/${result.total_packages}] Skipped: ${genResult.package_name}`);
              } else {
                result.successful++;
                console.log(`  ✅ [${result.processed}/${result.total_packages}] ${genResult.package_name}`);
              }
            } else {
              result.failed++;
              result.errors.push({ package_id: pkg.id, error: genResult.error || 'Unknown error' });
              console.error(`  ❌ [${result.processed}/${result.total_packages}] Failed: ${pkg.name} - ${genResult.error}`);
            }

            // Rate limiting: wait 100ms between API calls (OpenAI allows 3000 RPM)
            await sleep(100);
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push({ package_id: pkg.id, error: errorMsg });
            console.error(`  ❌ [${result.processed}/${result.total_packages}] Exception: ${pkg.name} - ${errorMsg}`);
          }
        }

        // Longer pause between batches
        if (i + options.batchSize < packages.length) {
          console.log('\n  ⏸️  Pausing 2 seconds between batches...');
          await sleep(2000);
        }
      }
    }

    result.duration_ms = Date.now() - startTime;

    // Print summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total packages:     ${result.total_packages}`);
    console.log(`Processed:          ${result.processed}`);
    console.log(`✅ Successful:      ${result.successful}`);
    console.log(`⏭️  Skipped:         ${result.skipped}`);
    console.log(`❌ Failed:          ${result.failed}`);
    console.log(`⏱️  Duration:        ${(result.duration_ms / 1000).toFixed(1)}s`);
    console.log(`💰 Estimated cost:  $${result.estimated_cost_usd.toFixed(4)}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.slice(0, 5).forEach(e => {
        console.log(`  - ${e.package_id}: ${e.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`);
      }
    }

    console.log('\n✅ Embedding generation complete!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
