/**
 * Taxonomy Service
 * Handles category and use case browsing
 */

import type { FastifyInstance } from 'fastify';
import type {
  Category,
  CategoryWithChildren,
  CategoryListResponse,
  UseCase,
  UseCaseWithPackages,
  UseCaseListResponse
} from '@pr-pm/types';

export class TaxonomyService {
  private server: FastifyInstance;

  constructor(server: FastifyInstance) {
    this.server = server;
  }

  /**
   * Get all categories as a hierarchical tree
   */
  async getCategoryTree(includePackageCounts = false): Promise<CategoryListResponse> {
    // Get all categories
    const categoriesResult = await this.server.pg.query<Category>(`
      SELECT
        id, name, slug, parent_id, level,
        description, icon, display_order,
        created_at, updated_at
      FROM categories
      ORDER BY level ASC, display_order ASC, name ASC
    `);

    const categories = categoriesResult.rows;

    // Build package counts if requested
    const packageCounts: Record<string, number> = {};
    if (includePackageCounts) {
      const countsResult = await this.server.pg.query(`
        SELECT category_id, COUNT(DISTINCT package_id) as count
        FROM package_categories
        GROUP BY category_id
      `);

      countsResult.rows.forEach(row => {
        packageCounts[row.category_id] = parseInt(row.count);
      });
    }

    // Build hierarchy
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create all category objects
    categories.forEach(cat => {
      const categoryWithChildren: CategoryWithChildren = {
        ...cat,
        children: [],
        package_count: packageCounts[cat.id] || 0
      };
      categoryMap.set(cat.id, categoryWithChildren);
    });

    // Second pass: build parent-child relationships
    categories.forEach(cat => {
      const categoryWithChildren = categoryMap.get(cat.id)!;

      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children!.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    // Calculate total unique packages
    const totalPackagesResult = await this.server.pg.query(`
      SELECT COUNT(DISTINCT package_id) as total
      FROM package_categories
    `);

    return {
      categories: rootCategories,
      total_categories: categories.length,
      total_packages: parseInt(totalPackagesResult.rows[0]?.total || '0')
    };
  }

  /**
   * Get a single category by slug with its children
   */
  async getCategoryBySlug(slug: string, includePackageCounts = false): Promise<CategoryWithChildren | null> {
    const categoryResult = await this.server.pg.query<Category>(`
      SELECT
        id, name, slug, parent_id, level,
        description, icon, display_order,
        created_at, updated_at
      FROM categories
      WHERE slug = $1
    `, [slug]);

    if (categoryResult.rows.length === 0) {
      return null;
    }

    const category = categoryResult.rows[0];

    // Get children
    const childrenResult = await this.server.pg.query<Category>(`
      SELECT
        id, name, slug, parent_id, level,
        description, icon, display_order,
        created_at, updated_at
      FROM categories
      WHERE parent_id = $1
      ORDER BY display_order ASC, name ASC
    `, [category.id]);

    const children: CategoryWithChildren[] = childrenResult.rows.map(child => ({
      ...child,
      children: [],
      package_count: 0
    }));

    // Get package counts if requested
    if (includePackageCounts) {
      const categoryIds = [category.id, ...children.map(c => c.id)];
      const countsResult = await this.server.pg.query(`
        SELECT category_id, COUNT(DISTINCT package_id) as count
        FROM package_categories
        WHERE category_id = ANY($1::uuid[])
        GROUP BY category_id
      `, [categoryIds]);

      const counts: Record<string, number> = {};
      countsResult.rows.forEach(row => {
        counts[row.category_id] = parseInt(row.count);
      });

      children.forEach(child => {
        child.package_count = counts[child.id] || 0;
      });

      return {
        ...category,
        children,
        package_count: counts[category.id] || 0
      };
    }

    return {
      ...category,
      children
    };
  }

  /**
   * Get packages for a specific category
   */
  async getPackagesByCategory(
    categorySlug: string,
    options: {
      limit?: number;
      offset?: number;
      includeChildren?: boolean;
    } = {}
  ) {
    const { limit = 20, offset = 0, includeChildren = true } = options;

    // Find category
    const categoryResult = await this.server.pg.query(`
      SELECT id FROM categories WHERE slug = $1
    `, [categorySlug]);

    if (categoryResult.rows.length === 0) {
      return { packages: [], total: 0, category_slug: categorySlug };
    }

    const categoryId = categoryResult.rows[0].id;
    let categoryIds = [categoryId];

    // Include children if requested
    if (includeChildren) {
      const childrenResult = await this.server.pg.query(`
        SELECT id FROM categories WHERE parent_id = $1
        UNION ALL
        SELECT id FROM categories WHERE parent_id IN (
          SELECT id FROM categories WHERE parent_id = $1
        )
      `, [categoryId]);

      categoryIds = [...categoryIds, ...childrenResult.rows.map(r => r.id)];
    }

    // Get packages
    const packagesResult = await this.server.pg.query(`
      SELECT DISTINCT
        p.id, p.name, p.description, p.version,
        p.format, p.subtype, p.author_id,
        u.username as author_username,
        p.total_downloads, p.quality_score,
        p.created_at, p.updated_at
      FROM packages p
      JOIN package_categories pc ON p.id = pc.package_id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE pc.category_id = ANY($1::uuid[])
        AND p.visibility = 'public'
        AND p.deprecated = false
      ORDER BY p.total_downloads DESC, p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [categoryIds, limit, offset]);

    // Get total count
    const countResult = await this.server.pg.query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM packages p
      JOIN package_categories pc ON p.id = pc.package_id
      WHERE pc.category_id = ANY($1::uuid[])
        AND p.visibility = 'public'
        AND p.deprecated = false
    `, [categoryIds]);

    return {
      packages: packagesResult.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      category_slug: categorySlug
    };
  }

  /**
   * Get all use cases with package counts
   */
  async getUseCases(includePackageCounts = false): Promise<UseCaseListResponse> {
    const useCasesResult = await this.server.pg.query<UseCase>(`
      SELECT
        id, name, slug, description, icon,
        example_query, display_order,
        created_at, updated_at
      FROM use_cases
      ORDER BY display_order ASC, name ASC
    `);

    const useCases = useCasesResult.rows;

    if (includePackageCounts) {
      const countsResult = await this.server.pg.query(`
        SELECT use_case_id, COUNT(DISTINCT package_id) as count
        FROM package_use_cases
        GROUP BY use_case_id
      `);

      const counts: Record<string, number> = {};
      countsResult.rows.forEach(row => {
        counts[row.use_case_id] = parseInt(row.count);
      });

      const useCasesWithCounts: UseCaseWithPackages[] = useCases.map(uc => ({
        ...uc,
        package_count: counts[uc.id] || 0
      }));

      return {
        use_cases: useCasesWithCounts,
        total: useCases.length
      };
    }

    return {
      use_cases: useCases,
      total: useCases.length
    };
  }

  /**
   * Get packages for a specific use case
   */
  async getPackagesByUseCase(
    useCaseSlug: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { limit = 20, offset = 0 } = options;

    // Find use case
    const useCaseResult = await this.server.pg.query(`
      SELECT id, name, description, example_query
      FROM use_cases
      WHERE slug = $1
    `, [useCaseSlug]);

    if (useCaseResult.rows.length === 0) {
      return { packages: [], total: 0, use_case_slug: useCaseSlug, use_case: null };
    }

    const useCase = useCaseResult.rows[0];

    // Get packages
    const packagesResult = await this.server.pg.query(`
      SELECT DISTINCT
        p.id, p.name, p.description, p.version,
        p.format, p.subtype, p.author_id,
        u.username as author_username,
        p.total_downloads, p.quality_score,
        p.created_at, p.updated_at
      FROM packages p
      JOIN package_use_cases puc ON p.id = puc.package_id
      LEFT JOIN users u ON p.author_id = u.id
      WHERE puc.use_case_id = $1
        AND p.visibility = 'public'
        AND p.deprecated = false
      ORDER BY p.total_downloads DESC, p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [useCase.id, limit, offset]);

    // Get total count
    const countResult = await this.server.pg.query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM packages p
      JOIN package_use_cases puc ON p.id = puc.package_id
      WHERE puc.use_case_id = $1
        AND p.visibility = 'public'
        AND p.deprecated = false
    `, [useCase.id]);

    return {
      packages: packagesResult.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      use_case_slug: useCaseSlug,
      use_case: useCase
    };
  }

  /**
   * Search categories by name
   */
  async searchCategories(query: string, limit = 10): Promise<Category[]> {
    const result = await this.server.pg.query<Category>(`
      SELECT
        id, name, slug, parent_id, level,
        description, icon, display_order,
        created_at, updated_at
      FROM categories
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY level ASC, display_order ASC
      LIMIT $2
    `, [`%${query}%`, limit]);

    return result.rows;
  }

  /**
   * Search use cases by name or description
   */
  async searchUseCases(query: string, limit = 10): Promise<UseCase[]> {
    const result = await this.server.pg.query<UseCase>(`
      SELECT
        id, name, slug, description, icon,
        example_query, display_order,
        created_at, updated_at
      FROM use_cases
      WHERE name ILIKE $1 OR description ILIKE $1 OR example_query ILIKE $1
      ORDER BY display_order ASC
      LIMIT $2
    `, [`%${query}%`, limit]);

    return result.rows;
  }
}
