/**
 * File system operations for managing prompt files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Format, Subtype } from '../types';

/**
 * Get the destination directory for a package based on format and subtype
 */
export function getDestinationDir(format: Format, subtype: Subtype): string {
  switch (format) {
    case 'cursor':
      if (subtype === 'agent') return '.cursor/agents';
      if (subtype === 'slash-command') return '.cursor/commands';
      return '.cursor/rules';

    case 'claude':
      if (subtype === 'skill') return '.claude/skills';
      if (subtype === 'slash-command') return '.claude/commands';
      if (subtype === 'agent') return '.claude/agents';
      return '.claude/agents'; // Default for claude

    case 'continue':
      return '.continue/rules';

    case 'windsurf':
      return '.windsurf/rules';

    case 'copilot':
      return '.github/instructions';

    case 'kiro':
      return '.kiro/steering';

    case 'generic':
      return '.prompts';

    case 'mcp':
      return '.mcp/tools';

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Ensure directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error}`);
  }
}

/**
 * Save content to a file
 */
export async function saveFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    await ensureDirectoryExists(dir);

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save file ${filePath}: ${error}`);
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      // File doesn't exist, that's fine
      return;
    }
    throw new Error(`Failed to delete file ${filePath}: ${error}`);
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique ID from filename
 */
export function generateId(filename: string): string {
  // Remove extension and convert to kebab-case
  const name = filename.replace(/\.[^/.]+$/, '');
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Strip author namespace from package ID and return just the package name
 * @example
 * stripAuthorNamespace('@community/git-workflow-manager') // 'git-workflow-manager'
 * stripAuthorNamespace('community/git-workflow-manager') // 'git-workflow-manager'
 * stripAuthorNamespace('@wshobson/commands/agent-orchestration/improve-agent') // 'improve-agent'
 * stripAuthorNamespace('git-workflow-manager') // 'git-workflow-manager'
 */
export function stripAuthorNamespace(packageId: string): string {
  // Split by '/' and get the last segment (the actual package name)
  const parts = packageId.split('/');
  return parts[parts.length - 1];
}
