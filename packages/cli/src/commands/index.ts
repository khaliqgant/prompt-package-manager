/**
 * Index command implementation
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { listPackages, addPackage } from '../core/lockfile';
import { generateId } from '../core/filesystem';
import { Format, Subtype } from '../types';

/**
 * Scan directory for files and return file information
 * Recursively scans subdirectories for Claude skills/agents
 */
async function scanDirectory(dirPath: string, format: Format, subtype: Subtype): Promise<Array<{ filePath: string; filename: string; id: string }>> {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const results: Array<{ filePath: string; filename: string; id: string }> = [];

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);

      if (file.isFile()) {
        // Direct file in the directory
        const id = generateId(file.name);
        results.push({
          filePath: fullPath,
          filename: file.name,
          id
        });
      } else if (file.isDirectory()) {
        // For Claude/Cursor skills/agents, scan subdirectories for structured packages
        const isClaudeType = format === 'claude';
        const isCursorAgent = format === 'cursor' && subtype === 'agent';

        if (isClaudeType || isCursorAgent) {
          try {
            const subFiles = await fs.readdir(fullPath, { withFileTypes: true });
            for (const subFile of subFiles) {
              const isValidFile = subFile.isFile() && (
                subFile.name === 'SKILL.md' ||
                subFile.name === 'AGENT.md' ||
                subFile.name === 'skill.md' ||
                subFile.name === 'agent.md'
              );

              if (isValidFile) {
                const subFilePath = path.join(fullPath, subFile.name);
                const id = file.name; // Use directory name as package ID
                results.push({
                  filePath: subFilePath,
                  filename: `${file.name}/${subFile.name}`,
                  id
                });
              }
            }
          } catch {
            // Subdirectory can't be read, skip it
          }
        }
      }
    }

    return results;
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Check if a package is already registered
 */
function isPackageRegistered(packages: Array<{id: string}>, id: string): boolean {
  return packages.some(pkg => pkg.id === id);
}

/**
 * Handle the index command
 */
export async function handleIndex(options: { verbose?: boolean } = {}): Promise<void> {
  try {
    console.log('🔍 Scanning AI editor directories for prompt files...\n');

    // Get currently registered packages
    const existingPackages = await listPackages();
    if (options.verbose) {
      console.log(`📋 Currently registered: ${existingPackages.length} packages\n`);
    }

    let totalFound = 0;
    let totalAdded = 0;
    const summary: Array<{ dir: string; found: number; added: number }> = [];

    // Define directories to scan with their format and subtype
    const dirsToScan: Array<{ path: string; format: Format; subtype: Subtype; label: string }> = [
      { path: '.cursor/rules', format: 'cursor', subtype: 'rule', label: 'Cursor Rules' },
      { path: '.cursor/agents', format: 'cursor', subtype: 'agent', label: 'Cursor Agents' },
      { path: '.cursor/commands', format: 'cursor', subtype: 'slash-command', label: 'Cursor Slash Commands' },
      { path: '.claude/agents', format: 'claude', subtype: 'agent', label: 'Claude Agents' },
      { path: '.claude/skills', format: 'claude', subtype: 'skill', label: 'Claude Skills' },
      { path: '.claude/commands', format: 'claude', subtype: 'slash-command', label: 'Claude Slash Commands' },
      { path: '.continue/rules', format: 'continue', subtype: 'rule', label: 'Continue Rules' },
      { path: '.windsurf/rules', format: 'windsurf', subtype: 'rule', label: 'Windsurf Rules' },
      { path: '.prompts', format: 'generic', subtype: 'prompt', label: 'Generic Prompts' },
      { path: '.mcp', format: 'mcp', subtype: 'tool', label: 'MCP Servers' },
    ];

    // Scan each directory
    for (const dir of dirsToScan) {
      const files = await scanDirectory(dir.path, dir.format, dir.subtype);

      if (files.length === 0) {
        if (options.verbose) {
          console.log(`📁 ${dir.path}/ - No files found`);
        }
        continue;
      }

      console.log(`📁 ${dir.path}/ (${dir.label}) - Found ${files.length} file(s)`);

      let dirAdded = 0;
      totalFound += files.length;

      for (const file of files) {
        if (!isPackageRegistered(existingPackages, file.id)) {
          await addPackage({
            id: file.id,
            version: '0.0.0', // Local files don't have versions
            tarballUrl: `file://${path.resolve(file.filePath)}`,
            format: dir.format,
            subtype: dir.subtype,
          });
          if (options.verbose) {
            console.log(`  ✅ Added: ${file.filename} (${file.id})`);
          }
          totalAdded++;
          dirAdded++;
        } else if (options.verbose) {
          console.log(`  ⏭️  Skipped: ${file.filename} (already registered)`);
        }
      }

      if (dirAdded > 0) {
        console.log(`  ➕ Added ${dirAdded} new package(s)\n`);
      } else if (!options.verbose) {
        console.log(`  ✓ All files already registered\n`);
      }

      summary.push({ dir: dir.path, found: files.length, added: dirAdded });
    }
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Index Summary\n');
    console.log(`   📁 Total files found:      ${totalFound}`);
    console.log(`   ➕ New packages added:     ${totalAdded}`);
    console.log(`   ⏭️  Already registered:    ${totalFound - totalAdded}`);

    if (options.verbose && summary.length > 0) {
      console.log('\n   Breakdown by directory:');
      summary.filter(s => s.found > 0).forEach(s => {
        console.log(`     ${s.dir}: ${s.found} found, ${s.added} added`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (totalAdded > 0) {
      console.log(`\n✅ Successfully indexed ${totalAdded} new package(s)`);
      console.log('   Run `prpm list` to see all registered packages');
    } else if (totalFound > 0) {
      console.log('\n✨ All existing files are already registered');
    } else {
      console.log('\n💡 No prompt files found in standard directories');
      console.log('   Install packages with: prpm install <package-name>');
    }

  } catch (error) {
    console.error(`❌ Failed to index packages: ${error}`);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

/**
 * Create the index command
 */
export function createIndexCommand(): Command {
  const command = new Command('index');
  
  command
    .description('Scan AI editor directories and register untracked prompt files in prpm-lock.json')
    .option('-v, --verbose', 'Show detailed output for each file scanned')
    .action(handleIndex);
  
  return command;
}
