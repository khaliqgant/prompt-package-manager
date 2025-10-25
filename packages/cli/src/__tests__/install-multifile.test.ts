/**
 * Tests for multi-file package installation
 */

import { handleInstall } from '../commands/install';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { saveFile } from '../core/filesystem';
import { readLockfile, writeLockfile, addToLockfile, createLockfile, setPackageIntegrity } from '../core/lockfile';
import { gzipSync } from 'zlib';
import * as tar from 'tar';
import { Readable } from 'stream';
import * as path from 'path';

// Mock dependencies
jest.mock('@pr-pm/registry-client');
jest.mock('../core/user-config');
jest.mock('../core/lockfile');
jest.mock('../core/telemetry', () => ({
  telemetry: {
    track: jest.fn(),
    shutdown: jest.fn(),
  },
}));

jest.mock('../core/filesystem', () => {
  const actual = jest.requireActual('../core/filesystem');
  return {
    ...actual,
    saveFile: jest.fn(actual.saveFile),
    ensureDirectoryExists: jest.fn(actual.ensureDirectoryExists),
  };
});

/**
 * Helper to create a tar.gz archive from multiple files
 */
async function createTarGz(files: Record<string, string>): Promise<Buffer> {
  const fs = await import('fs');
  const os = await import('os');
  const path = await import('path');

  // Create temp directory
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'prpm-test-'));

  try {
    // Write all files to temp directory
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(tmpDir, filename);
      const fileDir = path.dirname(filePath);
      await fs.promises.mkdir(fileDir, { recursive: true });
      await fs.promises.writeFile(filePath, content);
    }

    // Create tar.gz using tar.create
    const chunks: Buffer[] = [];
    const stream = tar.create(
      {
        gzip: true,
        cwd: tmpDir,
      },
      Object.keys(files)
    );

    // Collect chunks
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    // Cleanup
    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    return Buffer.concat(chunks);
  } catch (error) {
    // Cleanup on error
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

describe('install command - multi-file packages', () => {
  const mockClient = {
    getPackage: jest.fn(),
    getPackageVersion: jest.fn(),
    downloadPackage: jest.fn(),
    trackDownload: jest.fn(),
  };

  const mockConfig = {
    registryUrl: 'https://test-registry.com',
    token: 'test-token',
  };

  beforeEach(() => {
    (getRegistryClient as jest.Mock).mockReturnValue(mockClient);
    (getConfig as jest.Mock).mockResolvedValue(mockConfig);
    (readLockfile as jest.Mock).mockResolvedValue(null);
    (writeLockfile as jest.Mock).mockResolvedValue(undefined);
    (addToLockfile as jest.Mock).mockImplementation(() => {});
    (createLockfile as jest.Mock).mockReturnValue({ packages: {} });
    (setPackageIntegrity as jest.Mock).mockImplementation(() => {});
    (saveFile as jest.Mock).mockResolvedValue(undefined);
    mockClient.trackDownload.mockResolvedValue(undefined);

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Single file packages', () => {
    it('should install single-file package as before', async () => {
      const mockPackage = {
        id: 'test-skill',
        name: 'test-skill',
        format: 'claude', subtype: 'skill',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Test Skill\n\nSingle file content'));

      await handleInstall('test-skill', {});

      // Should save as single file
      expect(saveFile).toHaveBeenCalledTimes(1);
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/skills/test-skill.md',
        expect.stringContaining('Single file content')
      );
    });
  });

  describe('Multi-file packages', () => {
    it('should extract and save multi-file Claude skill to directory', async () => {
      const mockPackage = {
        id: 'complex-skill',
        name: 'complex-skill',
        format: 'claude', subtype: 'skill',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      const tarGz = await createTarGz({
        'skill.md': '# Main Skill File',
        'helpers/utils.md': '# Utility Functions',
        'examples/demo.md': '# Demo Examples',
      });

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(tarGz);

      await handleInstall('complex-skill', {});

      // Should save to directory with multiple files
      expect(saveFile).toHaveBeenCalledTimes(3);
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/skills/complex-skill/skill.md',
        '# Main Skill File'
      );
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/skills/complex-skill/helpers/utils.md',
        '# Utility Functions'
      );
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/skills/complex-skill/examples/demo.md',
        '# Demo Examples'
      );
    });

    it('should extract multi-file agent to .claude/agents directory', async () => {
      const mockPackage = {
        id: 'complex-agent',
        name: 'complex-agent',
        format: 'claude', subtype: 'agent',
        tags: [],
        total_downloads: 50,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/agent.tar.gz',
        },
      };

      const tarGz = await createTarGz({
        'agent.md': '# Agent Definition',
        'prompts/system.md': '# System Prompt',
        'prompts/user.md': '# User Prompt',
      });

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(tarGz);

      await handleInstall('complex-agent', {});

      expect(saveFile).toHaveBeenCalledTimes(3);
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/agents/complex-agent/agent.md',
        '# Agent Definition'
      );
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/agents/complex-agent/prompts/system.md',
        '# System Prompt'
      );
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/agents/complex-agent/prompts/user.md',
        '# User Prompt'
      );
    });

    it('should extract multi-file slash command to .claude/commands directory', async () => {
      const mockPackage = {
        id: 'complex-command',
        name: 'complex-command',
        format: 'claude', subtype: 'slash-command',
        tags: [],
        total_downloads: 75,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/command.tar.gz',
        },
      };

      const tarGz = await createTarGz({
        'command.md': '# Command Definition',
        'config.json': '{"name": "test"}',
      });

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(tarGz);

      await handleInstall('complex-command', {});

      expect(saveFile).toHaveBeenCalledTimes(2);
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/commands/complex-command/command.md',
        '# Command Definition'
      );
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/commands/complex-command/config.json',
        '{"name": "test"}'
      );
    });

    it('should handle multi-file package with --as cursor conversion', async () => {
      const mockPackage = {
        id: 'complex-skill',
        name: 'complex-skill',
        format: 'claude', subtype: 'skill',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      const tarGz = await createTarGz({
        'skill.md': '# Main Skill',
        'helper.md': '# Helper',
      });

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(tarGz);

      await handleInstall('complex-skill', { as: 'cursor' });

      // Should save to .cursor/rules directory
      expect(saveFile).toHaveBeenCalledTimes(2);
      expect(saveFile).toHaveBeenCalledWith(
        '.cursor/rules/complex-skill/skill.md',
        '# Main Skill'
      );
      expect(saveFile).toHaveBeenCalledWith(
        '.cursor/rules/complex-skill/helper.md',
        '# Helper'
      );
    });
  });

  describe('Backward compatibility', () => {
    it('should handle legacy single gzipped file (no tar)', async () => {
      const mockPackage = {
        id: 'legacy-skill',
        name: 'legacy-skill',
        format: 'claude', subtype: 'skill',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/legacy.gz',
        },
      };

      // Just gzipped content, not tarred
      const gzipped = gzipSync('# Legacy Skill\n\nOld format');

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipped);

      await handleInstall('legacy-skill', {});

      // Should work as single file
      expect(saveFile).toHaveBeenCalledTimes(1);
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/skills/legacy-skill.md',
        expect.stringContaining('Legacy Skill')
      );
    });
  });
});
