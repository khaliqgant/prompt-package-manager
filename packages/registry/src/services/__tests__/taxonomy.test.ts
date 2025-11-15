import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaxonomyService } from '../taxonomy';
import type { FastifyInstance } from 'fastify';

describe('TaxonomyService', () => {
  let service: TaxonomyService;
  let mockFastify: Partial<FastifyInstance>;
  let mockPg: any;

  beforeEach(() => {
    mockPg = {
      query: vi.fn(),
    };

    mockFastify = {
      pg: mockPg as any,
    };

    service = new TaxonomyService(mockFastify as FastifyInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategoryTree', () => {
    it('should return hierarchical category tree', async () => {
      const mockCategories = {
        rows: [
          {
            id: '1',
            name: 'Backend Development',
            slug: 'backend-development',
            parent_id: null,
            level: 1,
            description: 'Backend tools',
            icon: 'server',
            display_order: 1,
            package_count: '10',
          },
          {
            id: '2',
            name: 'API Development',
            slug: 'api-development',
            parent_id: '1',
            level: 2,
            description: 'API tools',
            icon: 'api',
            display_order: 1,
            package_count: '5',
          },
        ],
      };

      mockPg.query.mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree(true);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].name).toBe('Backend Development');
      expect(result.categories[0].children).toHaveLength(1);
      expect(result.categories[0].children![0].name).toBe('API Development');
      expect(mockPg.query).toHaveBeenCalled();
    });

    it('should handle categories without package counts', async () => {
      const mockCategories = {
        rows: [
          {
            id: '1',
            name: 'Frontend Development',
            slug: 'frontend-development',
            parent_id: null,
            level: 1,
            description: 'Frontend tools',
            icon: 'layout',
            display_order: 1,
          },
        ],
      };

      mockPg.query.mockResolvedValue(mockCategories);

      const result = await service.getCategoryTree(false);

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].package_count).toBeUndefined();
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return category with children', async () => {
      const mockCategory = {
        rows: [
          {
            id: '1',
            name: 'Backend Development',
            slug: 'backend-development',
            parent_id: null,
            level: 1,
            description: 'Backend tools',
            icon: 'server',
            display_order: 1,
            package_count: '10',
          },
        ],
      };

      const mockChildren = {
        rows: [
          {
            id: '2',
            name: 'API Development',
            slug: 'api-development',
            parent_id: '1',
            level: 2,
            description: 'API tools',
            icon: 'api',
            display_order: 1,
            package_count: '5',
          },
        ],
      };

      mockPg.query
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockChildren);

      const result = await service.getCategoryBySlug('backend-development', true);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Backend Development');
      expect(result!.children).toHaveLength(1);
      expect(result!.children![0].name).toBe('API Development');
    });

    it('should throw error when category not found', async () => {
      mockPg.query.mockResolvedValue({ rows: [] });

      await expect(
        service.getCategoryBySlug('non-existent', false)
      ).rejects.toThrow('Category not found');
    });
  });

  describe('getPackagesByCategory', () => {
    it('should return packages for a category', async () => {
      const mockCategoryId = {
        rows: [{ id: '1' }],
      };

      const mockPackages = {
        rows: [
          {
            id: 'pkg-1',
            name: '@test/package-1',
            description: 'Test package',
            format: 'cursor',
            subtype: 'rule',
            total_downloads: 100,
          },
        ],
      };

      const mockCount = {
        rows: [{ count: '1' }],
      };

      mockPg.query
        .mockResolvedValueOnce(mockCategoryId)
        .mockResolvedValueOnce(mockPackages)
        .mockResolvedValueOnce(mockCount);

      const result = await service.getPackagesByCategory('backend-development', {
        limit: 20,
        offset: 0,
        includeChildren: false,
      });

      expect(result.packages).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.packages[0].name).toBe('@test/package-1');
    });

    it('should include child category packages when includeChildren=true', async () => {
      const mockCategoryId = {
        rows: [{ id: '1' }],
      };

      const mockChildIds = {
        rows: [{ id: '2' }, { id: '3' }],
      };

      const mockPackages = {
        rows: [
          {
            id: 'pkg-1',
            name: '@test/package-1',
            description: 'Test package',
            format: 'cursor',
            subtype: 'rule',
            total_downloads: 100,
          },
          {
            id: 'pkg-2',
            name: '@test/package-2',
            description: 'Test package 2',
            format: 'claude',
            subtype: 'agent',
            total_downloads: 200,
          },
        ],
      };

      const mockCount = {
        rows: [{ count: '2' }],
      };

      mockPg.query
        .mockResolvedValueOnce(mockCategoryId)
        .mockResolvedValueOnce(mockChildIds)
        .mockResolvedValueOnce(mockPackages)
        .mockResolvedValueOnce(mockCount);

      const result = await service.getPackagesByCategory('backend-development', {
        limit: 20,
        offset: 0,
        includeChildren: true,
      });

      expect(result.packages).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getUseCases', () => {
    it('should return all use cases', async () => {
      const mockUseCases = {
        rows: [
          {
            id: '1',
            name: 'Building REST APIs',
            slug: 'building-rest-apis',
            description: 'Build REST APIs',
            icon: 'api',
            example_query: 'REST API with authentication',
            display_order: 1,
            package_count: '15',
          },
        ],
      };

      mockPg.query.mockResolvedValue(mockUseCases);

      const result = await service.getUseCases(true);

      expect(result.use_cases).toHaveLength(1);
      expect(result.use_cases[0].name).toBe('Building REST APIs');
      expect(result.use_cases[0].package_count).toBe(15);
    });
  });

  describe('getPackagesByUseCase', () => {
    it('should return packages for a use case', async () => {
      const mockUseCaseId = {
        rows: [
          {
            id: '1',
            name: 'Building REST APIs',
            slug: 'building-rest-apis',
            description: 'Build REST APIs',
            icon: 'api',
            example_query: 'REST API with authentication',
            display_order: 1,
          },
        ],
      };

      const mockPackages = {
        rows: [
          {
            id: 'pkg-1',
            name: '@test/api-package',
            description: 'API package',
            format: 'generic',
            subtype: 'prompt',
            total_downloads: 500,
          },
        ],
      };

      const mockCount = {
        rows: [{ count: '1' }],
      };

      mockPg.query
        .mockResolvedValueOnce(mockUseCaseId)
        .mockResolvedValueOnce(mockPackages)
        .mockResolvedValueOnce(mockCount);

      const result = await service.getPackagesByUseCase('building-rest-apis', {
        limit: 20,
        offset: 0,
      });

      expect(result.use_case.name).toBe('Building REST APIs');
      expect(result.packages).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw error when use case not found', async () => {
      mockPg.query.mockResolvedValue({ rows: [] });

      await expect(
        service.getPackagesByUseCase('non-existent', {
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow('Use case not found');
    });
  });
});
