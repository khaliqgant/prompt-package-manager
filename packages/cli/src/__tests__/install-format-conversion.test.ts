/**
 * Tests for install command format conversion with --as and --format flags
 */

import { handleInstall } from '../commands/install';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';
import { saveFile } from '../core/filesystem';
import { readLockfile, writeLockfile, addToLockfile, createLockfile, setPackageIntegrity } from '../core/lockfile';
import { gzipSync } from 'zlib';

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

describe('Install command - format conversion', () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('--as flag', () => {
    it('should convert Claude package to Cursor format using --as', async () => {
      const mockPackage = {
        id: 'claude-skill',
        name: 'claude-skill',
        format: 'claude',
        subtype: 'skill',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Claude Skill\n\nContent'));

      await handleInstall('claude-skill', { as: 'cursor' });

      // Should request conversion to cursor format
      expect(mockClient.downloadPackage).toHaveBeenCalledWith(
        'https://example.com/package.tar.gz',
        { format: 'cursor' }
      );

      // Should save to cursor directory
      expect(saveFile).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/rules'),
        expect.any(String)
      );
    });

    it('should convert Cursor package to Claude format using --as', async () => {
      const mockPackage = {
        id: 'cursor-rule',
        name: 'cursor-rule',
        format: 'cursor',
        subtype: 'rule',
        tags: [],
        total_downloads: 50,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Cursor Rule\n\nContent'));

      await handleInstall('cursor-rule', { as: 'claude' });

      expect(mockClient.downloadPackage).toHaveBeenCalledWith(
        'https://example.com/package.tar.gz',
        { format: 'claude' }
      );

      expect(saveFile).toHaveBeenCalledWith(
        expect.stringContaining('.claude/'),
        expect.any(String)
      );
    });

    it('should convert to Windsurf format using --as', async () => {
      const mockPackage = {
        id: 'generic-prompt',
        name: 'generic-prompt',
        format: 'generic',
        subtype: 'prompt',
        tags: [],
        total_downloads: 25,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Generic Prompt\n\nContent'));

      await handleInstall('generic-prompt', { as: 'windsurf' });

      expect(mockClient.downloadPackage).toHaveBeenCalledWith(
        'https://example.com/package.tar.gz',
        { format: 'windsurf' }
      );

      expect(saveFile).toHaveBeenCalledWith(
        expect.stringContaining('.windsurf/'),
        expect.any(String)
      );
    });

    it('should convert to Continue format using --as', async () => {
      const mockPackage = {
        id: 'claude-agent',
        name: 'claude-agent',
        format: 'claude',
        subtype: 'agent',
        tags: [],
        total_downloads: 75,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Claude Agent\n\nContent'));

      await handleInstall('claude-agent', { as: 'continue' });

      expect(mockClient.downloadPackage).toHaveBeenCalledWith(
        'https://example.com/package.tar.gz',
        { format: 'continue' }
      );

      expect(saveFile).toHaveBeenCalledWith(
        expect.stringContaining('.continue/'),
        expect.any(String)
      );
    });
  });

  describe('Install in native format', () => {
    it('should install Claude skill in native format without conversion', async () => {
      const mockPackage = {
        id: 'claude-skill',
        name: 'claude-skill',
        format: 'claude',
        subtype: 'skill',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Claude Skill\n\nContent'));

      await handleInstall('claude-skill', {});

      // Should request native format (claude)
      expect(mockClient.downloadPackage).toHaveBeenCalledWith(
        'https://example.com/package.tar.gz',
        { format: 'claude' }
      );

      // Should save to claude directory with skill subtype
      expect(saveFile).toHaveBeenCalledWith(
        '.claude/skills/claude-skill.md',
        expect.any(String)
      );
    });

    it('should install Cursor rule in native format', async () => {
      const mockPackage = {
        id: 'cursor-rule',
        name: 'cursor-rule',
        format: 'cursor',
        subtype: 'rule',
        tags: [],
        total_downloads: 50,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Cursor Rule\n\nContent'));

      await handleInstall('cursor-rule', {});

      // Should request native format (cursor)
      expect(mockClient.downloadPackage).toHaveBeenCalledWith(
        'https://example.com/package.tar.gz',
        { format: 'cursor' }
      );

      expect(saveFile).toHaveBeenCalledWith(
        '.cursor/rules/cursor-rule.mdc',
        expect.any(String)
      );
    });

    it('should install Windsurf agent in native format', async () => {
      const mockPackage = {
        id: 'windsurf-agent',
        name: 'windsurf-agent',
        format: 'windsurf',
        subtype: 'agent',
        tags: [],
        total_downloads: 30,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Windsurf Agent\n\nContent'));

      await handleInstall('windsurf-agent', {});

      expect(saveFile).toHaveBeenCalledWith(
        '.windsurf/rules/windsurf-agent.md',
        expect.any(String)
      );
    });
  });

  describe('Subtype preservation', () => {
    it('should preserve agent subtype when converting formats', async () => {
      const mockPackage = {
        id: 'claude-agent',
        name: 'claude-agent',
        format: 'claude',
        subtype: 'agent',
        tags: [],
        total_downloads: 100,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Agent\n\nContent'));

      await handleInstall('claude-agent', { as: 'cursor' });

      // Should save to cursor agents directory (preserving agent subtype)
      // Note: cursor uses .mdc for all files
      expect(saveFile).toHaveBeenCalledWith(
        '.cursor/agents/claude-agent.mdc',
        expect.any(String)
      );
    });

    it('should preserve slash-command subtype when converting', async () => {
      const mockPackage = {
        id: 'claude-command',
        name: 'claude-command',
        format: 'claude',
        subtype: 'slash-command',
        tags: [],
        total_downloads: 50,
        verified: true,
        latest_version: {
          version: '1.0.0',
          tarball_url: 'https://example.com/package.tar.gz',
        },
      };

      mockClient.getPackage.mockResolvedValue(mockPackage);
      mockClient.downloadPackage.mockResolvedValue(gzipSync('# Command\n\nContent'));

      await handleInstall('claude-command', { as: 'cursor' });

      // Should save to cursor commands directory
      // Note: cursor uses .mdc for all files
      expect(saveFile).toHaveBeenCalledWith(
        '.cursor/commands/claude-command.mdc',
        expect.any(String)
      );
    });
  });
});
