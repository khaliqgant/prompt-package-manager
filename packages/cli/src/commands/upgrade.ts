/**
 * Upgrade command - Upgrade packages to latest versions (including major)
 */

import { Command } from 'commander';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { listPackages } from '../core/lockfile';
import { handleInstall } from './install';
import { telemetry } from '../core/telemetry';

/**
 * Upgrade packages to latest versions (including major updates)
 */
export async function handleUpgrade(
  packageName?: string,
  options: { all?: boolean; force?: boolean } = {}
): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let upgradedCount = 0;

  try {
    const config = await getConfig();
    const client = getRegistryClient(config);
    const installedPackages = await listPackages();

    if (installedPackages.length === 0) {
      console.log('No packages installed.');
      success = true;
      return;
    }

    // Determine which packages to upgrade
    let packagesToUpgrade = installedPackages;

    if (packageName) {
      // Upgrade specific package
      packagesToUpgrade = installedPackages.filter(p => p.id === packageName);
      if (packagesToUpgrade.length === 0) {
        throw new Error(`Package ${packageName} is not installed`);
      }
    }

    console.log('🚀 Checking for upgrades...\n');

    for (const pkg of packagesToUpgrade) {
      try {
        // Get package info from registry
        const registryPkg = await client.getPackage(pkg.id);

        if (!registryPkg.latest_version || !pkg.version) {
          continue;
        }

        const currentVersion = pkg.version;
        const latestVersion = registryPkg.latest_version.version;

        if (currentVersion === latestVersion) {
          console.log(`✅ ${pkg.id} is already at latest version (${currentVersion})`);
          continue;
        }

        const updateType = getUpdateType(currentVersion, latestVersion);
        const emoji = updateType === 'major' ? '🔴' : updateType === 'minor' ? '🟡' : '🟢';

        console.log(`\n${emoji} Upgrading ${pkg.id}: ${currentVersion} → ${latestVersion} (${updateType})`);

        if (updateType === 'major' && !options.force) {
          console.log(`   ⚠️  This is a major version upgrade and may contain breaking changes`);
        }

        // Install new version
        await handleInstall(`${pkg.id}@${latestVersion}`, {});

        upgradedCount++;
      } catch (err) {
        console.error(`   ❌ Failed to upgrade ${pkg.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (upgradedCount === 0) {
      console.log('\n✅ All packages are at the latest version!\n');
    } else {
      console.log(`\n✅ Upgraded ${upgradedCount} package(s)\n`);
    }

    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Upgrade failed: ${error}`);
    process.exit(1);
  } finally {
    await telemetry.track({
      command: 'upgrade',
      success,
      error,
      duration: Date.now() - startTime,
      data: {
        packageName,
        upgradedCount,
      },
    });
    await telemetry.shutdown();
  }
}

/**
 * Determine update type based on semver
 */
function getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  const [currMajor = 0, currMinor = 0, currPatch = 0] = currentParts;
  const [latestMajor = 0, latestMinor = 0, latestPatch = 0] = latestParts;

  if (latestMajor > currMajor) return 'major';
  if (latestMinor > currMinor) return 'minor';
  return 'patch';
}

/**
 * Create the upgrade command
 */
export function createUpgradeCommand(): Command {
  return new Command('upgrade')
    .description('Upgrade packages to latest versions (including major updates)')
    .argument('[package]', 'Specific package to upgrade (optional)')
    .option('--all', 'Upgrade all packages')
    .option('--force', 'Skip warning for major version upgrades')
    .action(handleUpgrade);
}
