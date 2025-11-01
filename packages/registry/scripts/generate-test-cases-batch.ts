#!/usr/bin/env tsx
/**
 * Batch Generate Test Cases Script
 *
 * Generates AI test cases for all existing packages and collections.
 * Run this once to populate test cases for the existing catalog.
 *
 * Usage:
 *   npm run generate-test-cases
 *   npm run generate-test-cases -- --limit 10        # Test with 10 packages
 *   npm run generate-test-cases -- --packages-only   # Only packages
 *   npm run generate-test-cases -- --collections-only # Only collections
 *   npm run generate-test-cases -- --force           # Regenerate existing
 */

import { build } from '../src/server.js';
import { query } from '../src/db/index.js';
import { TestCaseGeneratorService } from '../src/services/test-case-generator.js';
import type { Package } from '@pr-pm/types';

interface BatchOptions {
  limit?: number;
  packagesOnly?: boolean;
  collectionsOnly?: boolean;
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

interface CollectionRow {
  id: string;
  name: string;
  description: string;
  package_names: string[];
  version: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: BatchOptions = {
    limit: undefined,
    packagesOnly: args.includes('--packages-only'),
    collectionsOnly: args.includes('--collections-only'),
    force: args.includes('--force'),
    skipErrors: args.includes('--skip-errors'),
  };

  // Parse limit
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1], 10);
  }

  console.log('🚀 Starting batch test case generation');
  console.log('Options:', options);
  console.log('');

  // Build server
  const server = await build();
  const generator = new TestCaseGeneratorService(server);

  let packagesProcessed = 0;
  let packagesSucceeded = 0;
  let packagesFailed = 0;
  let collectionsProcessed = 0;
  let collectionsSucceeded = 0;
  let collectionsFailed = 0;

  try {
    // Generate for packages
    if (!options.collectionsOnly) {
      console.log('📦 Processing packages...\n');

      const packages = await getPackages(server, options.limit);
      console.log(`Found ${packages.length} packages to process\n`);

      for (const pkg of packages) {
        packagesProcessed++;
        console.log(`[${packagesProcessed}/${packages.length}] Processing: ${pkg.name}`);

        try {
          const testCases = await generator.generateForPackage(
            pkg as any,
            pkg.content,
            pkg.latest_version,
            { forceRegenerate: options.force }
          );

          packagesSucceeded++;
          console.log(`  ✓ Generated ${testCases.length} test cases`);
        } catch (error) {
          packagesFailed++;
          console.error(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);

          if (!options.skipErrors) {
            throw error;
          }
        }

        console.log('');

        // Rate limiting: wait 1 second between API calls
        if (packagesProcessed < packages.length) {
          await sleep(1000);
        }
      }
    }

    // Generate for collections
    if (!options.packagesOnly) {
      console.log('📚 Processing collections...\n');

      const collections = await getCollections(server, options.limit);
      console.log(`Found ${collections.length} collections to process\n`);

      for (const collection of collections) {
        collectionsProcessed++;
        console.log(`[${collectionsProcessed}/${collections.length}] Processing: ${collection.name}`);

        try {
          const testCases = await generator.generateForCollection(
            collection.id,
            collection.name,
            collection.description,
            collection.package_names,
            collection.version || '1.0.0',
            { forceRegenerate: options.force }
          );

          collectionsSucceeded++;
          console.log(`  ✓ Generated ${testCases.length} test cases`);
        } catch (error) {
          collectionsFailed++;
          console.error(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);

          if (!options.skipErrors) {
            throw error;
          }
        }

        console.log('');

        // Rate limiting
        if (collectionsProcessed < collections.length) {
          await sleep(1000);
        }
      }
    }

    // Summary
    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ Batch generation complete!');
    console.log('=' .repeat(60));
    console.log('');
    console.log('Packages:');
    console.log(`  Processed: ${packagesProcessed}`);
    console.log(`  Succeeded: ${packagesSucceeded}`);
    console.log(`  Failed:    ${packagesFailed}`);
    console.log('');
    console.log('Collections:');
    console.log(`  Processed: ${collectionsProcessed}`);
    console.log(`  Succeeded: ${collectionsSucceeded}`);
    console.log(`  Failed:    ${collectionsFailed}`);
    console.log('');
    console.log('Total succeeded:', packagesSucceeded + collectionsSucceeded);
    console.log('Total failed:   ', packagesFailed + collectionsFailed);

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
  // Get packages with their latest version content
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
 * Get collections to process
 */
async function getCollections(
  server: any,
  limit?: number
): Promise<CollectionRow[]> {
  const limitClause = limit ? `LIMIT ${limit}` : '';

  const result = await query<CollectionRow>(
    server,
    `SELECT
       c.id,
       c.name,
       c.description,
       ARRAY_AGG(p.name) as package_names,
       '1.0.0' as version
     FROM collections c
     LEFT JOIN collection_packages cp ON c.id = cp.collection_id
     LEFT JOIN packages p ON cp.package_id = p.id
     WHERE c.visibility = 'public'
     GROUP BY c.id, c.name, c.description
     ORDER BY c.package_count DESC
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
