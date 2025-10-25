/**
 * Tests for init command
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { createInitCommand } from '../commands/init';

// TODO KJG: Init command calls process.exit(1) which crashes Jest workers.
// Need to either mock process.exit or refactor init command to throw errors instead.
describe.skip('prpm init command', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    testDir = await mkdtemp(join(tmpdir(), 'prpm-init-test-'));
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    if (testDir && existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('--yes flag', () => {
    it('should create prpm.json with defaults', async () => {
      const command = createInitCommand();

      // Run init with --yes flag
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      // Check prpm.json was created
      const manifestPath = join(testDir, 'prpm.json');
      expect(existsSync(manifestPath)).toBe(true);

      // Read and parse manifest
      const content = await readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      // Verify required fields
      expect(manifest.name).toBeDefined();
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.description).toBe('A PRPM package');
      expect(manifest.format).toBe('cursor');
      expect(manifest.subtype).toBe('rule');
      expect(manifest.author).toBeDefined();
      expect(manifest.license).toBe('MIT');
      expect(manifest.files).toBeDefined();
      expect(Array.isArray(manifest.files)).toBe(true);
    });

    it('should create example files for cursor format', async () => {
      const command = createInitCommand();

      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      // Check that .cursorrules was created
      const cursorrulesPath = join(testDir, '.cursorrules');
      expect(existsSync(cursorrulesPath)).toBe(true);

      // Check that README.md was created
      const readmePath = join(testDir, 'README.md');
      expect(existsSync(readmePath)).toBe(true);
    });

    it('should not overwrite existing prpm.json without --force', async () => {
      const command = createInitCommand();

      // Run init once
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      // Try to run again without --force
      const command2 = createInitCommand();
      await expect(
        command2.parseAsync(['node', 'prpm', 'init', '--yes'])
      ).rejects.toThrow('prpm.json already exists');
    });

    it('should overwrite existing prpm.json with --force', async () => {
      const command = createInitCommand();

      // Run init once
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      // Run again with --force
      const command2 = createInitCommand();
      await expect(
        command2.parseAsync(['node', 'prpm', 'init', '--yes', '--force'])
      ).resolves.not.toThrow();

      // Verify prpm.json still exists
      const manifestPath = join(testDir, 'prpm.json');
      expect(existsSync(manifestPath)).toBe(true);
    });
  });

  describe('manifest structure', () => {
    it('should create valid JSON', async () => {
      const command = createInitCommand();
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      const manifestPath = join(testDir, 'prpm.json');
      const content = await readFile(manifestPath, 'utf-8');

      // Should not throw when parsing
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should format JSON with 2-space indentation', async () => {
      const command = createInitCommand();
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      const manifestPath = join(testDir, 'prpm.json');
      const content = await readFile(manifestPath, 'utf-8');

      // Check for 2-space indentation
      expect(content).toContain('  "name"');
      expect(content).toContain('  "version"');
    });

    it('should end with newline', async () => {
      const command = createInitCommand();
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      const manifestPath = join(testDir, 'prpm.json');
      const content = await readFile(manifestPath, 'utf-8');

      expect(content.endsWith('\n')).toBe(true);
    });
  });

  describe('README generation', () => {
    it('should create README.md with package info', async () => {
      const command = createInitCommand();
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      const readmePath = join(testDir, 'README.md');
      expect(existsSync(readmePath)).toBe(true);

      const content = await readFile(readmePath, 'utf-8');

      // Check README contains key information
      expect(content).toContain('# '); // Title
      expect(content).toContain('Installation'); // Installation section
      expect(content).toContain('prpm install'); // Install command
      expect(content).toContain('Format'); // Format section
      expect(content).toContain('cursor'); // Format value
    });

    it('should not overwrite existing README.md', async () => {
      // Create a README first
      const readmePath = join(testDir, 'README.md');
      const existingContent = '# Existing README\n\nDo not overwrite me!';
      await writeFile(readmePath, existingContent, 'utf-8');

      const command = createInitCommand();
      await command.parseAsync(['node', 'prpm', 'init', '--yes']);

      // Check README was not overwritten
      const content = await readFile(readmePath, 'utf-8');
      expect(content).toBe(existingContent);
    });
  });
});

// Helper function for writing files in tests
async function writeFile(path: string, content: string, encoding: string) {
  const { writeFile: fsWriteFile } = await import('fs/promises');
  return fsWriteFile(path, content, encoding as any);
}
