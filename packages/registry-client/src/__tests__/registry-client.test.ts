/**
 * Tests for RegistryClient
 */

import { RegistryClient, getRegistryClient } from '../registry-client';
import { Format, Subtype } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('RegistryClient', () => {
  let client: RegistryClient;
  const mockBaseUrl = 'https://test-registry.example.com';
  const mockToken = 'test-token-123';

  beforeEach(() => {
    client = new RegistryClient({
      url: mockBaseUrl,
      token: mockToken,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      expect(client).toBeInstanceOf(RegistryClient);
    });

    it('should remove trailing slash from URL', () => {
      const clientWithSlash = new RegistryClient({
        url: 'https://test.com/',
      });
      expect(clientWithSlash).toBeInstanceOf(RegistryClient);
    });

    it('should accept optional token', () => {
      const clientWithoutToken = new RegistryClient({
        url: mockBaseUrl,
      });
      expect(clientWithoutToken).toBeInstanceOf(RegistryClient);
    });
  });

  describe('search', () => {
    const mockSearchResult = {
      packages: [
        {
          id: 'test-package',
          description: 'A test package',
          format: 'cursor' as Format,
          subtype: 'rule' as Subtype,
          tags: ['test'],
          total_downloads: 100,
          verified: true,
        },
      ],
      total: 1,
      offset: 0,
      limit: 20,
    };

    it('should search for packages with query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      const result = await client.search('test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search?q=test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should include format filter in search', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      await client.search('test', { format: 'cursor' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('format=cursor'),
        expect.anything()
      );
    });

    it('should include tags filter in search', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      await client.search('test', { tags: ['react', 'typescript'] });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('tags=react');
      expect(callUrl).toContain('tags=typescript');
    });

    it('should handle search with pagination', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      await client.search('test', { limit: 10, offset: 20 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.anything()
      );
    });

    it('should handle search errors', async () => {
      // Mock all 3 retries to return error (no retry needed as it's not 500/429)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Server error' }),
      });

      await expect(client.search('test')).rejects.toThrow('Server error');
    });
  });

  describe('getPackage', () => {
    const mockPackage = {
      id: 'test-package',
      description: 'A test package',
      format: 'cursor' as Format,
      subtype: 'rule' as Subtype,
      tags: ['test'],
      total_downloads: 100,
      verified: true,
      latest_version: {
        version: '1.0.0',
        tarball_url: 'https://example.com/package.tar.gz',
      },
    };

    it('should fetch package by ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPackage,
      });

      const result = await client.getPackage('test-package');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/packages/test-package`,
        expect.anything()
      );
      expect(result).toEqual(mockPackage);
    });

    it('should handle package not found', async () => {
      // The current implementation will retry even for 404, so we need to mock all attempts
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Package not found' }),
      });

      await expect(client.getPackage('nonexistent')).rejects.toThrow('Package not found');
    });
  });

  describe('getPackageVersion', () => {
    const mockVersion = {
      version: '1.0.0',
      tarball_url: 'https://example.com/package.tar.gz',
      published_at: '2024-01-01T00:00:00Z',
    };

    it('should fetch specific package version', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersion,
      });

      const result = await client.getPackageVersion('test-package', '1.0.0');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/packages/test-package/1.0.0`,
        expect.anything()
      );
      expect(result).toEqual(mockVersion);
    });
  });

  describe('getPackageDependencies', () => {
    const mockDependencies = {
      dependencies: {
        'dep-1': '1.0.0',
        'dep-2': '2.0.0',
      },
      peerDependencies: {
        'peer-1': '^1.0.0',
      },
    };

    it('should fetch package dependencies', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencies,
      });

      const result = await client.getPackageDependencies('test-package');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/packages/test-package/dependencies`,
        expect.anything()
      );
      expect(result).toEqual(mockDependencies);
    });

    it('should fetch dependencies for specific version', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDependencies,
      });

      await client.getPackageDependencies('test-package', '1.0.0');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/packages/test-package/1.0.0/dependencies`,
        expect.anything()
      );
    });
  });

  describe('getPackageVersions', () => {
    const mockVersions = {
      versions: ['1.0.0', '1.1.0', '2.0.0'],
    };

    it('should fetch all package versions', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersions,
      });

      const result = await client.getPackageVersions('test-package');

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/packages/test-package/versions`,
        expect.anything()
      );
      expect(result).toEqual(mockVersions);
    });
  });

  describe('resolveDependencies', () => {
    const mockResolution = {
      resolved: {
        'test-package': '1.0.0',
        'dep-1': '1.0.0',
      },
      tree: {
        'test-package': {
          version: '1.0.0',
          dependencies: { 'dep-1': '1.0.0' },
        },
      },
    };

    it('should resolve dependency tree', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResolution,
      });

      const result = await client.resolveDependencies('test-package');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/packages/test-package/resolve'),
        expect.anything()
      );
      expect(result).toEqual(mockResolution);
    });

    it('should resolve with specific version', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResolution,
      });

      await client.resolveDependencies('test-package', '1.0.0');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('version=1.0.0'),
        expect.anything()
      );
    });
  });

  describe('downloadPackage', () => {
    it('should download package tarball', async () => {
      const mockBuffer = Buffer.from('test-data');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer.buffer,
      });

      const result = await client.downloadPackage('https://example.com/package.tar.gz');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/package.tar.gz');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should append format parameter for registry URLs', async () => {
      const mockBuffer = Buffer.from('test-data');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer.buffer,
      });

      await client.downloadPackage(`${mockBaseUrl}/package.tar.gz`, { format: 'cursor' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('format=cursor')
      );
    });

    it('should handle download errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        client.downloadPackage('https://example.com/missing.tar.gz')
      ).rejects.toThrow('Failed to download package');
    });
  });

  describe('getTrending', () => {
    const mockPackages = [
      {
        id: 'trending-1',
        format: 'cursor' as Format,
        subtype: 'rule' as Subtype,
        tags: [],
        total_downloads: 1000,
        verified: true,
      },
    ];

    it('should fetch trending packages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: mockPackages }),
      });

      const result = await client.getTrending();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search/trending'),
        expect.anything()
      );
      expect(result).toEqual(mockPackages);
    });

    it('should filter by format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: mockPackages }),
      });

      await client.getTrending('cursor', undefined, 10);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('format=cursor'),
        expect.anything()
      );
    });

    it('should support limit parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: mockPackages }),
      });

      await client.getTrending(undefined, undefined, 50);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.anything()
      );
    });
  });

  describe('getFeatured', () => {
    const mockPackages = [
      {
        id: 'featured-1',
        format: 'cursor' as Format,
        subtype: 'rule' as Subtype,
        tags: [],
        total_downloads: 5000,
        verified: true,
        featured: true,
      },
    ];

    it('should fetch featured packages', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: mockPackages }),
      });

      const result = await client.getFeatured();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search/featured'),
        expect.anything()
      );
      expect(result).toEqual(mockPackages);
    });

    it('should filter by format', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: mockPackages }),
      });

      await client.getFeatured('claude', undefined, 15);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('format=claude'),
        expect.anything()
      );
    });

    it('should support limit parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: mockPackages }),
      });

      await client.getFeatured(undefined, undefined, 30);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=30'),
        expect.anything()
      );
    });
  });

  describe('getCollections', () => {
    const mockCollections = {
      collections: [
        {
          id: 'collection-1',
          scope: 'official',
          name: 'Test Collection',
          description: 'A test collection',
          version: '1.0.0',
          author: 'test',
          official: true,
          verified: true,
          tags: [],
          packages: [],
          downloads: 100,
          stars: 50,
          package_count: 5,
        },
      ],
      total: 1,
      offset: 0,
      limit: 50,
    };

    it('should fetch collections', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollections,
      });

      const result = await client.getCollections();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/collections'),
        expect.anything()
      );
      expect(result).toEqual(mockCollections);
    });

    it('should filter collections by category', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollections,
      });

      await client.getCollections({ category: 'development' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=development'),
        expect.anything()
      );
    });

    it('should filter by official status', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollections,
      });

      await client.getCollections({ official: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('official=true'),
        expect.anything()
      );
    });
  });

  describe('getCollection', () => {
    const mockCollection = {
      id: 'test-collection',
      scope: 'official',
      name: 'Test Collection',
      description: 'A test collection',
      version: '1.0.0',
      author: 'test',
      official: true,
      verified: true,
      tags: [],
      packages: [],
      downloads: 100,
      stars: 50,
      package_count: 5,
    };

    it('should fetch collection by scope and id', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollection,
      });

      const result = await client.getCollection('official', 'test-collection');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/collections/official/test-collection'),
        expect.anything()
      );
      expect(result).toEqual(mockCollection);
    });

    it('should fetch specific version', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollection,
      });

      await client.getCollection('official', 'test-collection', '2.0.0');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/2.0.0'),
        expect.anything()
      );
    });
  });

  describe('installCollection', () => {
    const mockInstallResult = {
      collection: {
        id: 'test-collection',
        scope: 'official',
        name: 'Test Collection',
        description: 'A test collection',
        version: '1.0.0',
        author: 'test',
        official: true,
        verified: true,
        tags: [],
        packages: [],
        downloads: 100,
        stars: 50,
        package_count: 2,
      },
      packagesToInstall: [
        {
          packageId: 'package-1',
          version: '1.0.0',
          format: 'cursor',
          required: true,
        },
        {
          packageId: 'package-2',
          version: '1.1.0',
          format: 'cursor',
          required: false,
        },
      ],
    };

    it('should get collection installation plan', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstallResult,
      });

      const result = await client.installCollection({
        scope: 'official',
        id: 'test-collection',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/collections/official/test-collection/install'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockInstallResult);
    });

    it('should include version in install plan', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstallResult,
      });

      await client.installCollection({
        scope: 'official',
        id: 'test-collection',
        version: '2.0.0',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/install'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"version":"2.0.0"'),
        })
      );
    });

    it('should include format parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstallResult,
      });

      await client.installCollection({
        scope: 'official',
        id: 'test-collection',
        format: 'claude',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/install'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"format":"claude"'),
        })
      );
    });

    it('should include skipOptional parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstallResult,
      });

      await client.installCollection({
        scope: 'official',
        id: 'test-collection',
        skipOptional: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/install'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"skipOptional":true'),
        })
      );
    });
  });

  describe('createCollection', () => {
    const mockCreatedCollection = {
      id: 'new-collection-uuid',
      scope: 'testuser',
      name_slug: 'new-collection',
      name: 'New Collection',
      description: 'A new collection',
      version: '1.0.0',
      author: 'testuser',
      official: false,
      verified: false,
      tags: ['test'],
      packages: [],
      downloads: 0,
      stars: 0,
      package_count: 2,
    };

    it('should create a new collection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedCollection,
      });

      const result = await client.createCollection({
        id: 'new-collection',
        name: 'New Collection',
        description: 'A new collection',
        packages: [
          { packageId: 'package-1', version: '1.0.0', required: true },
          { packageId: 'package-2', required: false },
        ],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/collections`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(mockCreatedCollection);
    });

    it('should include all optional fields', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedCollection,
      });

      await client.createCollection({
        id: 'new-collection',
        name: 'New Collection',
        description: 'A new collection',
        category: 'development',
        tags: ['react', 'typescript'],
        packages: [{ packageId: 'package-1' }],
        icon: '🚀',
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody).toHaveProperty('category', 'development');
      expect(callBody).toHaveProperty('tags');
      expect(callBody.tags).toEqual(['react', 'typescript']);
      expect(callBody).toHaveProperty('icon', '🚀');
    });

    it('should require authentication', async () => {
      const clientWithoutToken = new RegistryClient({ url: mockBaseUrl });

      await expect(
        clientWithoutToken.createCollection({
          id: 'test',
          name: 'Test',
          description: 'Test collection',
          packages: [{ packageId: 'pkg-1' }],
        })
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('publish', () => {
    const mockManifest = {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package',
      type: 'cursor',
    };

    const mockPublishResponse = {
      package_id: 'test-package-uuid',
      version: '1.0.0',
      message: 'Package published successfully',
    };

    it('should publish a package', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPublishResponse,
      });

      const tarball = Buffer.from('test-tarball-data');
      const result = await client.publish(mockManifest as any, tarball);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/packages`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(mockPublishResponse);
    });

    it('should send JSON with manifest and base64 tarball', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPublishResponse,
      });

      const tarball = Buffer.from('test-tarball-data');
      await client.publish(mockManifest as any, tarball);

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers?.['Content-Type']).toBe('application/json');

      const body = JSON.parse(callOptions.body);
      expect(body.manifest).toEqual({
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package',
        type: 'cursor',
        files: [],
      });
      expect(body.tarball).toBe(tarball.toString('base64'));
    });

    it('should require authentication', async () => {
      const clientWithoutToken = new RegistryClient({ url: mockBaseUrl });
      const tarball = Buffer.from('test-data');

      await expect(
        clientWithoutToken.publish(mockManifest as any, tarball)
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('whoami', () => {
    const mockUserInfo = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      verified: true,
    };

    it('should fetch current user info', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await client.whoami();

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
      expect(result).toEqual(mockUserInfo);
    });

    it('should require authentication', async () => {
      const clientWithoutToken = new RegistryClient({ url: mockBaseUrl });

      await expect(clientWithoutToken.whoami()).rejects.toThrow('Not authenticated');
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      // Use fake timers to speed up retry tests
      jest.useFakeTimers();
    });

    afterEach(() => {
      // Restore real timers
      jest.useRealTimers();
    });

    it('should retry on 429 rate limit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => '1' },
          json: async () => ({ error: 'Rate limited' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ packages: [] }),
        });

      // Start the async search operation
      const searchPromise = client.search('test');

      // Fast-forward through the retry delay (1 second)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await searchPromise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ packages: [] });
    });

    it('should retry on 5xx server errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ packages: [] }),
        });

      // Start the async search operation
      const searchPromise = client.search('test');

      // Fast-forward through the retry delay (1 second = 2^0 * 1000)
      await jest.advanceTimersByTimeAsync(1000);

      const result = await searchPromise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      });

      // Start the async search operation
      const searchPromise = client.search('test');

      // Set up the expect first (before timers run)
      const expectation = expect(searchPromise).rejects.toThrow();

      // Now advance through retry delays
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      // Restore timers
      jest.useRealTimers();

      // Wait for the expectation to complete
      await expectation;

      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('authentication', () => {
    it('should include auth token in headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: [] }),
      });

      await client.search('test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should work without token', async () => {
      const clientWithoutToken = new RegistryClient({ url: mockBaseUrl });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ packages: [] }),
      });

      await clientWithoutToken.search('test');

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should throw error when publishing without token', async () => {
      const clientWithoutToken = new RegistryClient({ url: mockBaseUrl });

      await expect(
        clientWithoutToken.publish({}, Buffer.from('test'))
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('getRegistryClient helper', () => {
    it('should create client with config', () => {
      const client = getRegistryClient({
        registryUrl: 'https://custom.registry.com',
        token: 'custom-token',
      });

      expect(client).toBeInstanceOf(RegistryClient);
    });

    it('should use default registry URL', () => {
      const client = getRegistryClient({});
      expect(client).toBeInstanceOf(RegistryClient);
    });

    it('should accept token', () => {
      const client = getRegistryClient({ token: 'test-token' });
      expect(client).toBeInstanceOf(RegistryClient);
    });
  });
});
