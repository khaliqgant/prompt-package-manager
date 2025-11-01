#!/usr/bin/env tsx
/**
 * Batch Generate Test Cases + Quality Scores
 *
 * Uses COMBINED AI call to generate both test cases AND quality scores
 * More efficient than separate calls!
 *
 * Usage:
 *   npm run generate-combined
 *   npm run generate-combined -- --limit 10
 *   npm run generate-combined -- --packages-only
 *   npm run generate-combined -- --force
 */

import { build } from '../src/server.js';
import { query } from '../src/db/index.js';
import { CombinedTestCaseGeneratorService } from '../src/services/test-case-generator-combined.js';
import type { Package } from '@pr-pm/types';

interface BatchOptions {
  limit?: number;
  packagesOnly?: boolean;
  force?: boolean;
  skipErrors?: boolean;
}

interface PackageRow {
  id: string;
  name: string;
  description: string;
  format: string;
  subtype: string;
  category: string;
  tags: string[];
  keywords: string[];
  latest_version: string;
  content: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: BatchOptions = {
    limit: undefined,
    packagesOnly: args.includes('--packages-only'),
    force: args.includes('--force'),
    skipErrors: args.includes('--skip-errors'),
  };

  // Parse limit
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1], 10);
  }

  console.log('🚀 Starting COMBINED batch generation (test cases + quality scores)');
  console.log('Options:', options);
  console.log('');

  // Build server
  const server = await build();
  const generator = new CombinedTestCaseGeneratorService(server);

  let packagesProcessed = 0;
  let packagesSucceeded = 0;
  let packagesFailed = 0;
  let totalTestCases = 0;
  let totalQualityScores = 0;

  try {
    console.log('📦 Processing packages...\n');

    const packages = await getPackages(server, options.limit);
    console.log(`Found ${packages.length} packages to process\n`);

    for (const pkg of packages) {
      packagesProcessed++;
      console.log(`[${packagesProcessed}/${packages.length}] ${pkg.name}`);

      try {
        const result = await generator.generateWithQuality(
          pkg as any,
          pkg.content,
          pkg.latest_version,
          { forceRegenerate: options.force }
        );

        packagesSucceeded++;
        totalTestCases += result.testCases.length;
        if (result.qualityScore > 0) totalQualityScores++;

        console.log(`  ✓ ${result.testCases.length} test cases`);
        console.log(`  ✓ Quality: ${result.qualityScore.toFixed(3)}/1.000`);
        console.log(`  → ${result.qualityReasoning.substring(0, 80)}...`);
      } catch (error) {
        packagesFailed++;
        console.error(`  ✗ ${error instanceof Error ? error.message : String(error)}`);

        if (!options.skipErrors) {
          throw error;
        }
      }

      console.log('');

      // Rate limiting: wait 1.5 seconds between API calls
      // (longer because combined call does more work)
      if (packagesProcessed < packages.length) {
        await sleep(1500);
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Combined batch generation complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Packages:');
    console.log(`  Processed:     ${packagesProcessed}`);
    console.log(`  Succeeded:     ${packagesSucceeded}`);
    console.log(`  Failed:        ${packagesFailed}`);
    console.log('');
    console.log('Generated:');
    console.log(`  Test cases:    ${totalTestCases}`);
    console.log(`  Quality scores: ${totalQualityScores}`);
    console.log(`  Avg tests/pkg: ${(totalTestCases / packagesSucceeded).toFixed(1)}`);
    console.log('');
    console.log('Efficiency:');
    console.log(`  API calls saved: ${packagesSucceeded} (combined vs separate)`);
    console.log(`  Cost savings:    ~50% (one call instead of two)`);

  } catch (error) {
    console.error('');
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await server.close();
  }
}

/**
 * Get packages to process
 */
async function getPackages(
  server: any,
  limit?: number
): Promise<PackageRow[]> {
  const limitClause = limit ? `LIMIT ${limit}` : '';

  const result = await query<PackageRow>(
    server,
    `SELECT
       p.id,
       p.name,
       p.description,
       p.format,
       p.subtype,
       p.category,
       p.tags,
       p.keywords,
       pv.version as latest_version,
       pv.content_hash as content
     FROM packages p
     INNER JOIN LATERAL (
       SELECT version, content_hash
       FROM package_versions
       WHERE package_id = p.id
       ORDER BY published_at DESC
       LIMIT 1
     ) pv ON true
     WHERE p.visibility = 'public'
     ORDER BY p.total_downloads DESC
     ${limitClause}`
  );

  return result.rows;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
main().catch(console.error);
