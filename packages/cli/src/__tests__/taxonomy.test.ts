/**
 * Tests for format+subtype taxonomy
 */

import { handleSearch } from '../commands/search';
import { getRegistryClient } from '@pr-pm/registry-client';
import { getConfig } from '../core/user-config';

// Mock dependencies
jest.mock('@pr-pm/registry-client');
jest.mock('../core/user-config');
jest.mock('../core/telemetry', () => ({
  telemetry: {
    track: jest.fn(),
    shutdown: jest.fn(),
  },
}));

describe('Taxonomy - Format and Subtype', () => {
  const mockClient = {
    search: jest.fn(),
  };

  const mockConfig = {
    registryUrl: 'https://test-registry.com',
    token: 'test-token',
  };

  beforeEach(() => {
    (getRegistryClient as jest.Mock).mockReturnValue(mockClient);
    (getConfig as jest.Mock).mockResolvedValue(mockConfig);

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Format filtering', () => {
    it('should filter by format only', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('', { format: 'claude', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          format: 'claude'
        })
      );
    });

    it('should filter by cursor format', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('react', { format: 'cursor', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        'react',
        expect.objectContaining({
          format: 'cursor'
        })
      );
    });
  });

  describe('Subtype filtering', () => {
    it('should filter by subtype only', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('', { subtype: 'agent', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          subtype: 'agent'
        })
      );
    });

    it('should filter by skill subtype', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('testing', { subtype: 'skill', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        'testing',
        expect.objectContaining({
          subtype: 'skill'
        })
      );
    });

    it('should filter by slash-command subtype', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('', { subtype: 'slash-command', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          subtype: 'slash-command'
        })
      );
    });
  });

  describe('Combined format and subtype filtering', () => {
    it('should filter by both format and subtype', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('debugging', { format: 'claude', subtype: 'agent', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        'debugging',
        expect.objectContaining({
          format: 'claude',
          subtype: 'agent'
        })
      );
    });

    it('should filter cursor rules', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('react', { format: 'cursor', subtype: 'rule', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        'react',
        expect.objectContaining({
          format: 'cursor',
          subtype: 'rule'
        })
      );
    });

    it('should filter claude skills', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('', { format: 'claude', subtype: 'skill', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          format: 'claude',
          subtype: 'skill'
        })
      );
    });

    it('should filter windsurf agents', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('', { format: 'windsurf', subtype: 'agent', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          format: 'windsurf',
          subtype: 'agent'
        })
      );
    });
  });

  describe('All format values', () => {
    const formats = ['cursor', 'claude', 'continue', 'windsurf', 'copilot', 'kiro', 'generic', 'mcp'];

    formats.forEach(format => {
      it(`should support ${format} format`, async () => {
        const mockResults = {
          packages: [],
          total: 0,
          offset: 0,
          limit: 20,
        };

        mockClient.search.mockResolvedValue(mockResults);

        await handleSearch('', { format: format as any, interactive: false });

        expect(mockClient.search).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            format
          })
        );
      });
    });
  });

  describe('All subtype values', () => {
    const subtypes = ['rule', 'agent', 'skill', 'slash-command', 'prompt', 'workflow', 'tool', 'template', 'collection'];

    subtypes.forEach(subtype => {
      it(`should support ${subtype} subtype`, async () => {
        const mockResults = {
          packages: [],
          total: 0,
          offset: 0,
          limit: 20,
        };

        mockClient.search.mockResolvedValue(mockResults);

        await handleSearch('', { subtype: subtype as any, interactive: false });

        expect(mockClient.search).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            subtype
          })
        );
      });
    });
  });
});
