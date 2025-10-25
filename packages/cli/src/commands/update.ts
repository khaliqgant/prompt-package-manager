/**
 * Update command - Update packages to latest compatible versions
 */

import { Command } from 'commander';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { listPackages } from '../core/lockfile';
import { handleInstall } from './install';
import { telemetry } from '../core/telemetry';

/**
 * Update packages to latest minor/patch versions
 */
export async function handleUpdate(
  packageName?: string,
  options: { all?: boolean } = {}
): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let updatedCount = 0;

  try {
    const config = await getConfig();
    const client = getRegistryClient(config);
    const installedPackages = await listPackages();

    if (installedPackages.length === 0) {
      console.log('No packages installed.');
      success = true;
      return;
    }

    // Determine which packages to update
    let packagesToUpdate = installedPackages;

    if (packageName) {
      // Update specific package
      packagesToUpdate = installedPackages.filter(p => p.id === packageName);
      if (packagesToUpdate.length === 0) {
        throw new Error(`Package ${packageName} is not installed`);
      }
    }

    console.log('🔄 Checking for updates...\n');

    for (const pkg of packagesToUpdate) {
      try {
        // Get package info from registry
        const registryPkg = await client.getPackage(pkg.id);

        if (!registryPkg.latest_version || !pkg.version) {
          continue;
        }

        const currentVersion = pkg.version;
        const latestVersion = registryPkg.latest_version.version;

        // Only update if it's a minor or patch update (not major)
        const updateType = getUpdateType(currentVersion, latestVersion);

        if (updateType === 'major') {
          console.log(`⏭️  Skipping ${pkg.id} (major update ${currentVersion} → ${latestVersion}, use upgrade)`);
          continue;
        }

        if (currentVersion === latestVersion) {
          console.log(`✅ ${pkg.id} is already up to date (${currentVersion})`);
          continue;
        }

        console.log(`\n📦 Updating ${pkg.id}: ${currentVersion} → ${latestVersion}`);

        // Install new version
        await handleInstall(`${pkg.id}@${latestVersion}`, {});

        updatedCount++;
      } catch (err) {
        console.error(`   ❌ Failed to update ${pkg.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (updatedCount === 0) {
      console.log('\n✅ All packages are up to date!\n');
    } else {
      console.log(`\n✅ Updated ${updatedCount} package(s)\n`);
    }

    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Update failed: ${error}`);
    process.exit(1);
  } finally {
    await telemetry.track({
      command: 'update',
      success,
      error,
      duration: Date.now() - startTime,
      data: {
        packageName,
        updatedCount,
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
 * Create the update command
 */
export function createUpdateCommand(): Command {
  return new Command('update')
    .description('Update packages to latest compatible versions (minor/patch only)')
    .argument('[package]', 'Specific package to update (optional)')
    .option('--all', 'Update all packages')
    .action(handleUpdate);
}
