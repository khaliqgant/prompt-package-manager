#!/usr/bin/env node

/**
 * Prompt Package Manager CLI entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createListCommand } from './commands/list';
import { createUninstallCommand } from './commands/uninstall';
import { createIndexCommand } from './commands/index';
import { createTelemetryCommand } from './commands/telemetry';
import { createPopularCommand } from './commands/popular';
import { createSearchCommand } from './commands/search';
// Temporarily hidden while embeddings build up
// import { createAISearchCommand } from './commands/ai-search';
import { createInfoCommand } from './commands/info';
import { createInstallCommand } from './commands/install';
import { createTrendingCommand } from './commands/trending';
import { createPublishCommand } from './commands/publish';
import { createLoginCommand } from './commands/login';
import { createWhoamiCommand } from './commands/whoami';
import { createCollectionsCommand } from './commands/collections';
import { createOutdatedCommand } from './commands/outdated';
import { createUpdateCommand } from './commands/update';
import { createUpgradeCommand } from './commands/upgrade';
import { createSchemaCommand } from './commands/schema';
import { createInitCommand } from './commands/init';
import { createConfigCommand } from './commands/config';
import { createCatalogCommand } from './commands/catalog';
import { createPlaygroundCommand } from './commands/playground';
import { createCreditsCommand } from './commands/credits';
import { createSubscribeCommand } from './commands/subscribe';
import { createBuyCreditsCommand } from './commands/buy-credits';
import { createStarredCommand } from './commands/starred';
import { createConvertCommand } from './commands/convert';
import { telemetry } from './core/telemetry';
import { CLIError } from './core/errors';

// Read version from package.json
function getVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('prpm')
  .description('Prompt Package Manager - Install and manage prompt-based files')
  .version(getVersion());

// Package creation commands
program.addCommand(createInitCommand());
program.addCommand(createCatalogCommand());

// Registry commands (new)
program.addCommand(createSearchCommand());
// Temporarily hidden while embeddings build up
// program.addCommand(createAISearchCommand());
program.addCommand(createInstallCommand());
program.addCommand(createInfoCommand());
program.addCommand(createTrendingCommand());
program.addCommand(createPopularCommand());
program.addCommand(createPublishCommand());
program.addCommand(createLoginCommand());
program.addCommand(createWhoamiCommand());
program.addCommand(createCollectionsCommand());
program.addCommand(createStarredCommand());
program.addCommand(createOutdatedCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createUpgradeCommand());

// Local file commands (existing)
program.addCommand(createListCommand());
program.addCommand(createUninstallCommand());
program.addCommand(createIndexCommand());
program.addCommand(createTelemetryCommand());

// Playground commands
program.addCommand(createPlaygroundCommand());
program.addCommand(createCreditsCommand());
program.addCommand(createSubscribeCommand());
program.addCommand(createBuyCreditsCommand());

// Utility commands
program.addCommand(createSchemaCommand());
program.addCommand(createConfigCommand());
program.addCommand(createConvertCommand());

// Parse command line arguments with error handling
(async () => {
  try {
    await program.parseAsync();
    // Command completed successfully - let Node.js exit naturally
  } catch (error) {
    if (error instanceof CLIError) {
      // Print error message if present
      if (error.message) {
        console.error(error.message);
      }
      // Exit with the error's exit code
      process.exit(error.exitCode);
    } else {
      // Unexpected error - print and exit with code 1
      console.error('Unexpected error:', error);
      process.exit(1);
    }
  }
})();

// Cleanup telemetry on exit
process.on('exit', () => {
  telemetry.shutdown().catch(() => {
    // Silently fail
  });
});

process.on('SIGINT', () => {
  telemetry.shutdown().catch(() => {
    // Silently fail
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  telemetry.shutdown().catch(() => {
    // Silently fail
  });
  process.exit(0);
});
