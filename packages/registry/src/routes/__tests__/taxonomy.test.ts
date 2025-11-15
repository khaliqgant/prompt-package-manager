/**
 * Taxonomy routes integration tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { taxonomyRoutes } from '../taxonomy';

describe('Taxonomy Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify();

    // Mock authenticate decorator
    server.decorate('authenticate', async () => {});

    // Create mock query function
    const mockQuery = async (sql: string, params?: unknown[]) => {
      // Mock categories query
      if (sql.includes('SELECT c.id, c.name, c.slug, c.parent_id, c.level') && sql.includes('FROM categories c')) {
        const includeCounts = sql.includes('COUNT(DISTINCT pc.package_id)');

        if (includeCounts) {
          return {
            rows: [
              {
                id: 'cat-1',
                name: 'Backend Development',
                slug: 'backend-development',
                parent_id: null,
                level: 1,
                description: 'Backend development tools and prompts',
                icon: 'server',
                display_order: 1,
                package_count: '25',
              },
              {
                id: 'cat-2',
                name: 'API Development',
                slug: 'api-development',
                parent_id: 'cat-1',
                level: 2,
                description: 'REST and GraphQL API development',
                icon: 'api',
                display_order: 1,
                package_count: '10',
              },
              {
                id: 'cat-3',
                name: 'Frontend Development',
                slug: 'frontend-development',
                parent_id: null,
                level: 1,
                description: 'Frontend development tools',
                icon: 'layout',
                display_order: 2,
                package_count: '30',
              },
            ],
          };
        }

        return {
          rows: [
            {
              id: 'cat-1',
              name: 'Backend Development',
              slug: 'backend-development',
              parent_id: null,
              level: 1,
              description: 'Backend development tools and prompts',
              icon: 'server',
              display_order: 1,
            },
            {
              id: 'cat-2',
              name: 'API Development',
              slug: 'api-development',
              parent_id: 'cat-1',
              level: 2,
              description: 'REST and GraphQL API development',
              icon: 'api',
              display_order: 1,
            },
          ],
        };
      }

      // Mock single category lookup by slug
      if (sql.includes('WHERE c.slug = $1')) {
        const slug = params?.[0] as string;

        if (slug === 'backend-development') {
          return {
            rows: [
              {
                id: 'cat-1',
                name: 'Backend Development',
                slug: 'backend-development',
                parent_id: null,
                level: 1,
                description: 'Backend development tools and prompts',
                icon: 'server',
                display_order: 1,
                package_count: '25',
              },
            ],
          };
        }

        if (slug === 'non-existent') {
          return { rows: [] };
        }
      }

      // Mock children categories
      if (sql.includes('WHERE parent_id = $1')) {
        return {
          rows: [
            {
              id: 'cat-2',
              name: 'API Development',
              slug: 'api-development',
              parent_id: 'cat-1',
              level: 2,
              description: 'REST and GraphQL API development',
              icon: 'api',
              display_order: 1,
              package_count: '10',
            },
            {
              id: 'cat-4',
              name: 'Database Development',
              slug: 'database-development',
              parent_id: 'cat-1',
              level: 2,
              description: 'Database design and queries',
              icon: 'database',
              display_order: 2,
              package_count: '8',
            },
          ],
        };
      }

      // Mock packages by category
      if (sql.includes('FROM packages p') && sql.includes('JOIN package_categories pc')) {
        return {
          rows: [
            {
              id: 'pkg-1',
              name: '@backend/api-template',
              description: 'REST API template',
              format: 'generic',
              subtype: 'prompt',
              total_downloads: 1500,
              weekly_downloads: 150,
              quality_score: 4.5,
              rating_average: 4.8,
              rating_count: 25,
              verified: true,
              featured: true,
            },
            {
              id: 'pkg-2',
              name: '@backend/database-prompt',
              description: 'Database design prompts',
              format: 'cursor',
              subtype: 'rule',
              total_downloads: 800,
              weekly_downloads: 80,
              quality_score: 4.2,
              rating_average: 4.5,
              rating_count: 15,
              verified: false,
              featured: false,
            },
          ],
        };
      }

      // Mock package count for category
      if (sql.includes('COUNT(DISTINCT p.id) as count') && sql.includes('package_categories pc')) {
        return {
          rows: [{ count: '2' }],
        };
      }

      // Mock use cases query
      if (sql.includes('FROM use_cases')) {
        const includeCounts = sql.includes('COUNT(DISTINCT puc.package_id)');

        if (includeCounts) {
          return {
            rows: [
              {
                id: 'uc-1',
                name: 'Building REST APIs',
                slug: 'building-rest-apis',
                description: 'Create REST API endpoints with authentication',
                icon: 'api',
                example_query: 'REST API with JWT authentication',
                display_order: 1,
                package_count: '12',
              },
              {
                id: 'uc-2',
                name: 'Testing Automation',
                slug: 'testing-automation',
                description: 'Automate testing workflows',
                icon: 'test',
                example_query: 'automated testing with Jest',
                display_order: 2,
                package_count: '18',
              },
            ],
          };
        }

        return {
          rows: [
            {
              id: 'uc-1',
              name: 'Building REST APIs',
              slug: 'building-rest-apis',
              description: 'Create REST API endpoints with authentication',
              icon: 'api',
              example_query: 'REST API with JWT authentication',
              display_order: 1,
            },
          ],
        };
      }

      // Mock use case lookup by slug
      if (sql.includes('FROM use_cases') && sql.includes('WHERE slug = $1')) {
        const slug = params?.[0] as string;

        if (slug === 'building-rest-apis') {
          return {
            rows: [
              {
                id: 'uc-1',
                name: 'Building REST APIs',
                slug: 'building-rest-apis',
                description: 'Create REST API endpoints with authentication',
                icon: 'api',
                example_query: 'REST API with JWT authentication',
                display_order: 1,
              },
            ],
          };
        }

        if (slug === 'non-existent') {
          return { rows: [] };
        }
      }

      // Mock packages by use case
      if (sql.includes('FROM packages p') && sql.includes('JOIN package_use_cases puc')) {
        return {
          rows: [
            {
              id: 'pkg-3',
              name: '@api/rest-template',
              description: 'REST API template with authentication',
              format: 'generic',
              subtype: 'prompt',
              total_downloads: 2000,
              weekly_downloads: 200,
              quality_score: 4.8,
              rating_average: 4.9,
              rating_count: 45,
              verified: true,
              featured: true,
            },
          ],
        };
      }

      return { rows: [] };
    };

    // Mock pg client
    server.decorate('pg', {
      query: mockQuery,
    } as any);

    // Register routes
    await server.register(taxonomyRoutes, { prefix: '/api/v1/taxonomy' });
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /categories', () => {
    it('should return hierarchical category tree', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('categories');
      expect(Array.isArray(body.categories)).toBe(true);
      expect(body.categories.length).toBeGreaterThan(0);

      // Check hierarchy
      const backendCat = body.categories.find((c: any) => c.slug === 'backend-development');
      expect(backendCat).toBeDefined();
      expect(backendCat.children).toBeDefined();
      expect(Array.isArray(backendCat.children)).toBe(true);
    });

    it('should include package counts when requested', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories?include_counts=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.total_packages).toBeDefined();
      expect(typeof body.total_packages).toBe('number');

      const categories = body.categories;
      expect(categories[0].package_count).toBeDefined();
    });
  });

  describe('GET /categories/:slug', () => {
    it('should return category with children', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/backend-development',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.name).toBe('Backend Development');
      expect(body.slug).toBe('backend-development');
      expect(body.children).toBeDefined();
      expect(Array.isArray(body.children)).toBe(true);
      expect(body.children.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/non-existent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });
  });

  describe('GET /categories/:slug/packages', () => {
    it('should return packages for a category', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/backend-development/packages',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.category).toBeDefined();
      expect(body.category.slug).toBe('backend-development');
      expect(body.packages).toBeDefined();
      expect(Array.isArray(body.packages)).toBe(true);
      expect(body.total).toBeDefined();
      expect(body.limit).toBe(20); // Default limit
      expect(body.offset).toBe(0);
    });

    it('should support pagination parameters', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/backend-development/packages?limit=10&offset=5',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.limit).toBe(10);
      expect(body.offset).toBe(5);
    });

    it('should support include_children parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/backend-development/packages?include_children=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.packages).toBeDefined();
    });

    it('should return 404 for non-existent category', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/non-existent/packages',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /use-cases', () => {
    it('should return all use cases', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('use_cases');
      expect(Array.isArray(body.use_cases)).toBe(true);
      expect(body.use_cases.length).toBeGreaterThan(0);

      const useCase = body.use_cases[0];
      expect(useCase).toHaveProperty('name');
      expect(useCase).toHaveProperty('slug');
      expect(useCase).toHaveProperty('description');
      expect(useCase).toHaveProperty('example_query');
    });

    it('should include package counts when requested', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases?include_counts=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.use_cases[0].package_count).toBeDefined();
      expect(typeof body.use_cases[0].package_count).toBe('number');
    });
  });

  describe('GET /use-cases/:slug', async () => {
    it('should return use case details', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases/building-rest-apis',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.name).toBe('Building REST APIs');
      expect(body.slug).toBe('building-rest-apis');
      expect(body.description).toBeDefined();
      expect(body.example_query).toBeDefined();
    });

    it('should return 404 for non-existent use case', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /use-cases/:slug/packages', () => {
    it('should return packages for a use case', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases/building-rest-apis/packages',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.use_case).toBeDefined();
      expect(body.use_case.slug).toBe('building-rest-apis');
      expect(body.packages).toBeDefined();
      expect(Array.isArray(body.packages)).toBe(true);
      expect(body.total).toBeDefined();
      expect(body.limit).toBe(20);
      expect(body.offset).toBe(0);
    });

    it('should support pagination', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases/building-rest-apis/packages?limit=5&offset=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.limit).toBe(5);
      expect(body.offset).toBe(10);
    });

    it('should return 404 for non-existent use case', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/use-cases/non-existent/packages',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Query Parameter Validation', () => {
    it('should validate limit parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/backend-development/packages?limit=-1',
      });

      // Should either clamp to valid range or return 400
      expect([200, 400]).toContain(response.statusCode);
    });

    it('should validate offset parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories/backend-development/packages?offset=-10',
      });

      // Should either clamp to valid range or return 400
      expect([200, 400]).toContain(response.statusCode);
    });

    it('should handle invalid boolean for include_counts', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/taxonomy/categories?include_counts=invalid',
      });

      // Should treat as false or return 400
      expect([200, 400]).toContain(response.statusCode);
    });
  });
});
