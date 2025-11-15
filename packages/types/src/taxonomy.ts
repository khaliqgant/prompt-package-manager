/**
 * Taxonomy types for hierarchical categories and use cases
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: number; // 1, 2, or 3
  description: string | null;
  icon: string | null;
  display_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  package_count?: number;
}

export interface CategoryTree {
  category: CategoryWithChildren;
  total_packages: number;
}

export interface UseCase {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  example_query: string | null;
  display_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UseCaseWithPackages extends UseCase {
  package_count?: number;
  related_categories?: string[]; // Category slugs
}

export interface PackageCategory {
  package_id: string;
  category_id: string;
  created_at: Date | string;
}

export interface PackageUseCase {
  package_id: string;
  use_case_id: string;
  created_at: Date | string;
}

/**
 * Request/response types
 */

export interface CategoryListResponse {
  categories: CategoryWithChildren[];
  total_categories: number;
  total_packages: number;
}

export interface UseCaseListResponse {
  use_cases: UseCaseWithPackages[];
  total: number;
}

export interface CategoryBrowseRequest {
  slug?: string;
  level?: number;
  include_children?: boolean;
  include_package_counts?: boolean;
}

export interface UseCaseBrowseRequest {
  slug?: string;
  include_package_counts?: boolean;
  limit?: number;
}

/**
 * Taxonomy generation types
 */

export interface TaxonomyGenerationConfig {
  seed_categories: Array<{
    name: string;
    icon: string;
  }>;
  max_subcategories_per_parent: number;
  max_depth: number;
}

export interface ProposedSubcategory {
  name: string;
  description: string;
  package_count: number;
  specific_categories?: string[]; // Level 3
}

export interface ProposedTaxonomy {
  [topLevel: string]: {
    subcategories: { [name: string]: ProposedSubcategory };
    use_cases: string[];
  };
}

export interface TaxonomyProposal {
  generated_at: string;
  total_packages: number;
  seed_categories: Array<{ name: string; icon: string }>;
  proposed_taxonomy: ProposedTaxonomy;
}
