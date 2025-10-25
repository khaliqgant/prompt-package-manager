/**
 * List command implementation
 */

import { Command } from 'commander';
import { listPackages } from '../core/lockfile';
import { telemetry } from '../core/telemetry';
import { promises as fs } from 'fs';
import path from 'path';
import { Format, Subtype } from '../types';

/**
 * Get destination directory based on package type
 */
function getDestinationDir(type: string): string {
  switch (type) {
    case 'cursor':
      return '.cursor/rules';
    case 'claude':
      return '.claude/agents';
    case 'claude-agent':
      return '.claude/agents';
    case 'claude-skill':
      return '.claude/skills';
    case 'claude-slash-command':
      return '.claude/commands';
    case 'continue':
      return '.continue/rules';
    case 'windsurf':
      return '.windsurf/rules';
    case 'generic':
      return '.prompts';
    case 'mcp':
      return '.mcp';
    default:
      return '.prompts';
  }
}

/**
 * Find the actual file location for a package
 */
async function findPackageLocation(id: string, type?: string): Promise<string | null> {
  if (!type) return null;

  const baseDir = getDestinationDir(type);

  // Try direct file: <dir>/<id>.md
  const directPath = path.join(baseDir, `${id}.md`);
  try {
    await fs.access(directPath);
    return directPath;
  } catch {
    // File doesn't exist, try subdirectory
  }

  // Try subdirectory: <dir>/<id>/SKILL.md or <dir>/<id>/AGENT.md
  if (type === 'claude-skill') {
    const skillPath = path.join(baseDir, id, 'SKILL.md');
    try {
      await fs.access(skillPath);
      return skillPath;
    } catch {
      // Not found
    }
  }

  if (type === 'claude') {
    const agentPath = path.join(baseDir, id, 'AGENT.md');
    try {
      await fs.access(agentPath);
      return agentPath;
    } catch {
      // Not found
    }
  }

  return null;
}

/**
 * Display packages in a formatted table
 */
async function displayPackages(packages: Array<{id: string; version: string; resolved: string; format?: string; subtype?: string}>): Promise<void> {
  if (packages.length === 0) {
    console.log('📦 No packages installed');
    return;
  }

  console.log('📦 Installed packages:');
  console.log('');

  // Find file locations
  const packagesWithLocations = await Promise.all(
    packages.map(async pkg => ({
      ...pkg,
      location: await findPackageLocation(pkg.id, `${pkg.format}-${pkg.subtype}`)
    }))
  );

  // Calculate column widths
  const idWidth = Math.max(8, ...packagesWithLocations.map(p => p.id.length));
  const versionWidth = Math.max(7, ...packagesWithLocations.map(p => p.version.length));
  const typeWidth = Math.max(6, ...packagesWithLocations.map(p => (`${p.format || ''}-${p.subtype || ''}`).length));
  const locationWidth = Math.max(8, ...packagesWithLocations.map(p => (p.location || 'N/A').length));

  // Header
  const header = [
    'ID'.padEnd(idWidth),
    'VERSION'.padEnd(versionWidth),
    'TYPE'.padEnd(typeWidth),
    'LOCATION'.padEnd(locationWidth)
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(header.length));

  // Rows
  packagesWithLocations.forEach(pkg => {
    const row = [
      pkg.id.padEnd(idWidth),
      pkg.version.padEnd(versionWidth),
      (`${pkg.format}-${pkg.subtype}` || '').padEnd(typeWidth),
      (pkg.location || 'N/A').padEnd(locationWidth)
    ].join(' | ');

    console.log(row);
  });

  console.log('');
  console.log(`Total: ${packages.length} package${packages.length === 1 ? '' : 's'}`);
}

/**
 * Handle the list command
 */
export async function handleList(): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;
  let packageCount = 0;

  try {
    const packages = await listPackages();
    packageCount = packages.length;
    await displayPackages(packages);
    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to list packages: ${error}`);
    process.exit(1);
  } finally {
    // Track telemetry
    await telemetry.track({
      command: 'list',
      success,
      error,
      duration: Date.now() - startTime,
      data: {
        packageCount,
      },
    });
    await telemetry.shutdown();
  }
}

/**
 * Create the list command
 */
export function createListCommand(): Command {
  const command = new Command('list');
  
  command
    .description('List all installed prompt packages')
    .action(handleList);
  
  return command;
}
