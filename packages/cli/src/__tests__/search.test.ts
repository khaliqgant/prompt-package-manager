/**
 * Tests for search command
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

describe('search command', () => {
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

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('basic search', () => {
    it('should search for packages', async () => {
      const mockResults = {
        packages: [
          {
            id: 'react-rules',
            name: 'react-rules',
            description: 'React coding rules',
            type: 'cursor',
            tags: ['react', 'javascript'],
            total_downloads: 1000,
            verified: true,
            rating_average: 4.5,
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('react', { interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith('react', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Results 1-1 of 1'));
    });

    it('should handle no results', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('nonexistent', { interactive: false });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No packages found'));
    });

    it('should display package details', async () => {
      const mockResults = {
        packages: [
          {
            id: 'test-package',
            name: 'test-package',
            description: 'A test package',
            type: 'cursor',
            tags: ['test'],
            total_downloads: 500,
            verified: false,
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('test', { interactive: false });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test-package'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('A test package'));
    });
  });

  describe('filtering', () => {
    it('should filter by type', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('react', { subtype: 'rule', interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        'react',
        expect.objectContaining({
          subtype: 'rule'
        })
      );
    });

    it('should support custom limit', async () => {
      const mockResults = {
        packages: [],
        total: 0,
        offset: 0,
        limit: 10,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('react', { limit: 10, interactive: false });

      expect(mockClient.search).toHaveBeenCalledWith(
        'react',
        expect.objectContaining({ limit: 10 })
      );
    });
  });

  describe('display formatting', () => {
    it('should show verified badge for verified packages', async () => {
      const mockResults = {
        packages: [
          {
            id: 'verified-package',
            type: 'cursor',
            tags: [],
            total_downloads: 1000,
            verified: true,
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('test', { interactive: false });

      // Check that verified badge is displayed
      const logCalls = (console.log as jest.Mock).mock.calls;
      const hasVerifiedBadge = logCalls.some(call =>
        call[0] && (call[0].includes('Verified') || call[0].includes('✓'))
      );
      expect(hasVerifiedBadge).toBe(true);
    });

    it('should format large download counts', async () => {
      const mockResults = {
        packages: [
          {
            id: 'popular-package',
            type: 'cursor',
            tags: [],
            total_downloads: 5000,
            verified: false,
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('test', { interactive: false });

      const logCalls = (console.log as jest.Mock).mock.calls;
      const hasFormattedDownloads = logCalls.some(call =>
        call[0] && call[0].includes('5.0k')
      );
      expect(hasFormattedDownloads).toBe(true);
    });

    it('should display rating if available', async () => {
      const mockResults = {
        packages: [
          {
            id: 'rated-package',
            type: 'cursor',
            tags: [],
            total_downloads: 100,
            verified: false,
            rating_average: 4.7,
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('test', { interactive: false });

      const logCalls = (console.log as jest.Mock).mock.calls;
      const hasRating = logCalls.some(call =>
        call[0] && call[0].includes('4.7')
      );
      expect(hasRating).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle search errors', async () => {
      mockClient.search.mockRejectedValue(new Error('Network error'));

      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(handleSearch('test', {})).rejects.toThrow('Process exited');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Search failed')
      );

      mockExit.mockRestore();
    });

    it('should handle timeout errors', async () => {
      mockClient.search.mockRejectedValue(new Error('Request timeout'));

      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(handleSearch('test', {})).rejects.toThrow('Process exited');

      mockExit.mockRestore();
    });
  });

  describe('pagination hints', () => {
    it('should show pagination message when results exceed limit', async () => {
      const mockResults = {
        packages: Array(20).fill({
          id: 'test',
          type: 'cursor',
          tags: [],
          total_downloads: 100,
          verified: false,
        }),
        total: 50,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('test', { interactive: false });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Page 1 of 3')
      );
    });

    it('should not show pagination for complete results', async () => {
      const mockResults = {
        packages: [
          {
            id: 'test',
            type: 'cursor',
            tags: [],
            total_downloads: 100,
            verified: false,
          },
        ],
        total: 1,
        offset: 0,
        limit: 20,
      };

      mockClient.search.mockResolvedValue(mockResults);

      await handleSearch('test', { interactive: false });

      const logCalls = (console.log as jest.Mock).mock.calls;
      const hasPagination = logCalls.some(call =>
        call[0] && call[0].includes('Showing')
      );
      expect(hasPagination).toBe(false);
    });
  });
});
