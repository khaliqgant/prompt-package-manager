/**
 * Popular packages command implementation
 * Shows all-time popular packages (delegates to trending)
 */

import { Command } from 'commander';
import { handleTrending } from './trending';
import { Format, Subtype } from '../types';

/**
 * Show popular packages (wrapper around trending)
 */
export async function handlePopular(options: { format?: string; subtype?: string }): Promise<void> {
  // Delegate to trending command
  console.log('📊 Popular Packages (All Time)\n');
  await handleTrending({
    format: options.format as Format | undefined,
    subtype: options.subtype as Subtype | undefined
  });
}

/**
 * Create the popular command
 */
export function createPopularCommand(): Command {
  return new Command('popular')
    .description('Show popular packages (all time)')
    .option('--format <format>', 'Filter by format (cursor, claude, continue, windsurf, copilot, kiro, generic)')
    .option('--subtype <subtype>', 'Filter by subtype (rule, agent, skill, slash-command, prompt, workflow, tool, template, collection)')
    .action(handlePopular);
}
