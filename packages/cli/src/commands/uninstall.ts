/**
 * Uninstall command implementation
 */

import { Command } from 'commander';
import { removePackage } from '../core/lockfile';
import { getDestinationDir, deleteFile, fileExists, stripAuthorNamespace } from '../core/filesystem';
import { promises as fs } from 'fs';
import { Format, Subtype } from '../types';

/**
 * Handle the uninstall command
 */
export async function handleUninstall(name: string): Promise<void> {
  try {
    console.log(`🗑️  Uninstalling package: ${name}`);

    // Remove from lockfile and get package info
    const pkg = await removePackage(name);

    if (!pkg) {
      console.error(`❌ Package "${name}" not found`);
      process.exit(1);
    }

    // Get destination directory using format and subtype
    const format = pkg.format || 'generic';
    const subtype = pkg.subtype || 'rule';
    const packageName = stripAuthorNamespace(name);
    const destDir = getDestinationDir(format as Format, subtype as Subtype, packageName);
    const fileExtension = pkg.format === 'cursor' ? 'mdc' : 'md';

    // For Claude skills, check the directory structure first (since they use SKILL.md)
    if (format === 'claude' && subtype === 'skill') {
      // Claude skills are in .claude/skills/${packageName}/ with SKILL.md file
      const skillPath = `${destDir}/SKILL.md`;

      if (await fileExists(skillPath)) {
        // Delete the SKILL.md file
        await deleteFile(skillPath);
        console.log(`   🗑️  Deleted file: ${skillPath}`);

        // If the directory is empty or only contains SKILL.md, delete the directory too
        try {
          const dirContents = await fs.readdir(destDir);
          if (dirContents.length === 0) {
            await fs.rmdir(destDir);
            console.log(`   🗑️  Deleted empty directory: ${destDir}`);
          }
        } catch (error) {
          // Directory doesn't exist or can't be deleted, that's okay
        }
      } else {
        // Try the whole directory
        try {
          const stats = await fs.stat(destDir);
          if (stats.isDirectory()) {
            await fs.rm(destDir, { recursive: true, force: true });
            console.log(`   🗑️  Deleted directory: ${destDir}`);
          }
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code !== 'ENOENT') {
            console.warn(`   ⚠️  Could not delete package files: ${err.message}`);
          }
        }
      }
    } else {
      // For other formats, try single file first
      const singleFilePath = `${destDir}/${packageName}.${fileExtension}`;

      if (await fileExists(singleFilePath)) {
        // Single file package
        await deleteFile(singleFilePath);
        console.log(`   🗑️  Deleted file: ${singleFilePath}`);
      } else {
        // Try multi-file package directory
        const packageDir = `${destDir}/${packageName}`;

        try {
          const stats = await fs.stat(packageDir);
          if (stats.isDirectory()) {
            await fs.rm(packageDir, { recursive: true, force: true });
            console.log(`   🗑️  Deleted directory: ${packageDir}`);
          }
        } catch (error) {
          const err = error as NodeJS.ErrnoException;
          if (err.code !== 'ENOENT') {
            console.warn(`   ⚠️  Could not delete package files: ${err.message}`);
          }
        }
      }
    }

    console.log(`✅ Successfully uninstalled ${name}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to uninstall package: ${error}`);
    process.exit(1);
  }
}

/**
 * Create the uninstall command
 */
export function createUninstallCommand(): Command {
  const command = new Command('uninstall');

  command
    .description('Uninstall a prompt package')
    .argument('<id>', 'Package ID to uninstall')
    .alias('remove')  // Keep 'remove' as an alias for backwards compatibility
    .action(handleUninstall);

  return command;
}
