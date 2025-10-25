/**
 * Trending command - Show trending packages
 */

import { Command } from 'commander';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { telemetry } from '../core/telemetry';
import { Format, Subtype } from '../types';

export async function handleTrending(options: { format?: Format; subtype?: Subtype; limit?: number }): Promise<void> {
  const startTime = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    console.log(`🔥 Fetching trending packages...`);

    const config = await getConfig();
    const client = getRegistryClient(config);
    const packages = await client.getTrending(options.format, options.subtype, options.limit || 10);

    if (packages.length === 0) {
      console.log('\n❌ No trending packages found');
      return;
    }

    console.log(`\n✨ Trending packages (last 7 days):\n`);

    packages.forEach((pkg, index) => {
      const verified = pkg.verified ? '✓' : ' ';
      const rating = pkg.rating_average ? `⭐ ${pkg.rating_average.toFixed(1)}` : '';
      const downloads = pkg.total_downloads >= 1000
        ? `${(pkg.total_downloads / 1000).toFixed(1)}k`
        : pkg.total_downloads;

      console.log(`${index + 1}. [${verified}] ${pkg.name} ${rating}`);
      console.log(`   ${pkg.description || 'No description'}`);
      console.log(`   📥 ${downloads} downloads`);
      console.log();
    });

    console.log(`💡 Install a package: prpm install <package-id>`);

    success = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Failed to fetch trending packages: ${error}`);
    console.log(`\n💡 Tip: Check your internet connection`);
    process.exit(1);
  } finally {
    await telemetry.track({
      command: 'trending',
      success,
      error,
      duration: Date.now() - startTime,
      data: {
        format: options.format,
        subtype: options.subtype,
        limit: options.limit || 10,
      },
    });
    await telemetry.shutdown();
  }
}

export function createTrendingCommand(): Command {
  const command = new Command('trending');

  command
    .description('Show trending packages')
    .option('--format <format>', 'Filter by format (cursor, claude, continue, windsurf, copilot, kiro, generic)')
    .option('--subtype <subtype>', 'Filter by subtype (rule, agent, skill, slash-command, prompt, workflow, tool, template, collection)')
    .option('--limit <number>', 'Number of packages to show', '10')
    .action(async (options: { limit?: string; format?: string; subtype?: string }) => {
      const format = options.format as Format | undefined;
      const subtype = options.subtype as Subtype | undefined;
      const limit = options.limit ? parseInt(options.limit, 10) : 10;

      const validFormats = ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'];
      const validSubtypes = ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'];

      if (options.format && !validFormats.includes(format!)) {
        console.error(`❌ Format must be one of: ${validFormats.join(', ')}`);
        process.exit(1);
      }

      if (options.subtype && !validSubtypes.includes(subtype!)) {
        console.error(`❌ Subtype must be one of: ${validSubtypes.join(', ')}`);
        process.exit(1);
      }

      await handleTrending({ format, subtype, limit });
    });

  return command;
}
