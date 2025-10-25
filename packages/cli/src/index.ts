#!/usr/bin/env node

/**
 * Prompt Package Manager CLI entry point
 */

import { Command } from 'commander';
import { createListCommand } from './commands/list';
import { createUninstallCommand } from './commands/uninstall';
import { createIndexCommand } from './commands/index';
import { createTelemetryCommand } from './commands/telemetry';
import { createPopularCommand } from './commands/popular';
import { createSearchCommand } from './commands/search';
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
import { telemetry } from './core/telemetry';

const program = new Command();

program
  .name('prpm')
  .description('Prompt Package Manager - Install and manage prompt-based files')
  .version('0.0.1');

// Package creation commands
program.addCommand(createInitCommand());

// Registry commands (new)
program.addCommand(createSearchCommand());
program.addCommand(createInstallCommand());
program.addCommand(createInfoCommand());
program.addCommand(createTrendingCommand());
program.addCommand(createPublishCommand());
program.addCommand(createLoginCommand());
program.addCommand(createWhoamiCommand());
program.addCommand(createCollectionsCommand());
program.addCommand(createOutdatedCommand());
program.addCommand(createUpdateCommand());
program.addCommand(createUpgradeCommand());

// Local file commands (existing)
program.addCommand(createListCommand());
program.addCommand(createUninstallCommand());
program.addCommand(createIndexCommand());
program.addCommand(createTelemetryCommand());

// Utility commands
program.addCommand(createSchemaCommand());

// Parse command line arguments
program.parse();

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
