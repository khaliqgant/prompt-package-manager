/**
 * Taxonomy Routes
 * Endpoints for browsing categories and use cases
 */

import type { FastifyInstance } from 'fastify';
import { TaxonomyService } from '../services/taxonomy.js';

export async function taxonomyRoutes(server: FastifyInstance) {
  const taxonomyService = new TaxonomyService(server);

  /**
   * GET /taxonomy/categories
   * Get all categories as hierarchical tree
   */
  server.get('/categories', {
    schema: {
      description: 'Get all categories in hierarchical tree structure',
      tags: ['taxonomy'],
      querystring: {
        type: 'object',
        properties: {
          include_counts: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            categories: { type: 'array' },
            total_categories: { type: 'number' },
            total_packages: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { include_counts } = request.query as { include_counts?: boolean };

    const tree = await taxonomyService.getCategoryTree(include_counts || false);
    return reply.code(200).send(tree);
  });

  /**
   * GET /taxonomy/categories/:slug
   * Get a specific category with its children
   */
  server.get('/categories/:slug', {
    schema: {
      description: 'Get a specific category by slug with its children',
      tags: ['taxonomy'],
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          include_counts: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            level: { type: 'number' },
            description: { type: 'string', nullable: true },
            icon: { type: 'string', nullable: true },
            children: { type: 'array' },
            package_count: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { include_counts } = request.query as { include_counts?: boolean };

    const category = await taxonomyService.getCategoryBySlug(slug, include_counts || false);

    if (!category) {
      return reply.code(404).send({ error: 'Category not found' });
    }

    return reply.code(200).send(category);
  });

  /**
   * GET /taxonomy/categories/:slug/packages
   * Get packages for a specific category
   */
  server.get('/categories/:slug/packages', {
    schema: {
      description: 'Get packages for a specific category',
      tags: ['taxonomy'],
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          offset: { type: 'number', default: 0, minimum: 0 },
          include_children: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            packages: { type: 'array' },
            total: { type: 'number' },
            category_slug: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { limit, offset, include_children } = request.query as {
      limit?: number;
      offset?: number;
      include_children?: boolean;
    };

    const result = await taxonomyService.getPackagesByCategory(slug, {
      limit,
      offset,
      includeChildren: include_children
    });

    return reply.code(200).send(result);
  });

  /**
   * GET /taxonomy/use-cases
   * Get all use cases
   */
  server.get('/use-cases', {
    schema: {
      description: 'Get all use cases',
      tags: ['taxonomy'],
      querystring: {
        type: 'object',
        properties: {
          include_counts: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            use_cases: { type: 'array' },
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { include_counts } = request.query as { include_counts?: boolean };

    const result = await taxonomyService.getUseCases(include_counts || false);
    return reply.code(200).send(result);
  });

  /**
   * GET /taxonomy/use-cases/:slug
   * Get packages for a specific use case
   */
  server.get('/use-cases/:slug', {
    schema: {
      description: 'Get packages for a specific use case',
      tags: ['taxonomy'],
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
          offset: { type: 'number', default: 0, minimum: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            packages: { type: 'array' },
            total: { type: 'number' },
            use_case_slug: { type: 'string' },
            use_case: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string', nullable: true },
                example_query: { type: 'string', nullable: true }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { limit, offset } = request.query as {
      limit?: number;
      offset?: number;
    };

    const result = await taxonomyService.getPackagesByUseCase(slug, {
      limit,
      offset
    });

    return reply.code(200).send(result);
  });

  /**
   * GET /taxonomy/search/categories
   * Search categories by name
   */
  server.get('/search/categories', {
    schema: {
      description: 'Search categories by name or description',
      tags: ['taxonomy'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'number', default: 10, minimum: 1, maximum: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: { type: 'array' },
            query: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { q, limit } = request.query as { q: string; limit?: number };

    const results = await taxonomyService.searchCategories(q, limit);
    return reply.code(200).send({ results, query: q });
  });

  /**
   * GET /taxonomy/search/use-cases
   * Search use cases by name or description
   */
  server.get('/search/use-cases', {
    schema: {
      description: 'Search use cases by name or description',
      tags: ['taxonomy'],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'number', default: 10, minimum: 1, maximum: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: { type: 'array' },
            query: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { q, limit } = request.query as { q: string; limit?: number };

    const results = await taxonomyService.searchUseCases(q, limit);
    return reply.code(200).send({ results, query: q });
  });
}
