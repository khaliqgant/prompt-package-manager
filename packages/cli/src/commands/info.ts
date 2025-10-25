/**
 * Info command - Display detailed package information
 */

import { Command } from 'commander';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { telemetry } from '../core/telemetry';

export async function handleInfo(packageName: string): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    console.log(`📦 Fetching package info for "${packageName}"...`);

    const config = await getConfig();
    const client = getRegistryClient(config);
    const pkg = await client.getPackage(packageName);

    console.log('\n' + '='.repeat(60));
    console.log(`  ${pkg.name} ${pkg.verified ? '✓ Verified' : ''}`);
    console.log('='.repeat(60));

    // Description
    if (pkg.description) {
      console.log(`\n📝 ${pkg.description}`);
    }

    // Stats
    console.log('\n📊 Stats:');
    console.log(`   Downloads: ${pkg.total_downloads.toLocaleString()}`);
    if (pkg.rating_average) {
      console.log(`   Rating: ${'⭐'.repeat(Math.round(pkg.rating_average))} (${pkg.rating_average.toFixed(1)}/5)`);
    }

    // Latest version
    if (pkg.latest_version) {
      console.log(`\n🏷️  Latest Version: ${pkg.latest_version.version}`);
    }

    // Tags
    if (pkg.tags && pkg.tags.length > 0) {
      console.log(`\n🏷️  Tags: ${pkg.tags.join(', ')}`);
    }

    // Type
    console.log(`\n📂 Type: ${`${pkg.format || 'unknown'} ${pkg.subtype || 'unknown'}`}`);

    // Installation
    console.log('\n💻 Installation:');
    console.log(`   prpm install ${pkg.name}`);
    console.log(`   prpm install ${pkg.name}@${pkg.latest_version?.version || 'latest'}`);

    console.log('\n' + '='.repeat(60));

    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Failed to fetch package info: ${error}`);
    console.log(`\n💡 Tips:`);
    console.log(`   - Check the package ID spelling`);
    console.log(`   - Search for packages: prpm search <query>`);
    console.log(`   - View trending: prpm trending`);
    process.exit(1);
  } finally {
    await telemetry.track({
      command: 'info',
      success,
      error,
      duration: Date.now() - startTime,
      data: {
        packageName,
      },
    });
    await telemetry.shutdown();
  }
}

export function createInfoCommand(): Command {
  const command = new Command('info');

  command
    .description('Display detailed package information')
    .argument('<package>', 'Package ID to get information about')
    .action(async (packageId: string) => {
      await handleInfo(packageId);
    });

  return command;
}
