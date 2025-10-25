/**
 * Search and discovery types
 */

import { Format, Subtype } from './package';
import { Package } from './package';
import { Collection } from './collection';
import { CollectionCategory } from './collection';

export type SortType = 'downloads' | 'created' | 'updated' | 'quality' | 'rating';

/**
 * Package search filters
 */
export interface SearchFilters {
  format?: Format | Format[];
  subtype?: Subtype | Subtype[];
  tags?: string[];
  category?: string;
  author?: string; // Filter by author username
  verified?: boolean;
  featured?: boolean;
  sort?: SortType;
  limit?: number;
  offset?: number;
}

/**
 * Package search parameters
 */
export interface SearchPackagesParams {
  q?: string;
  format?: Format | Format[];
  subtype?: Subtype | Subtype[];
  tags?: string[];
  category?: string;
  author?: string;
  verified?: boolean;
  featured?: boolean;
  sort?: SortType;
  limit?: number;
  offset?: number;
}

/**
 * Package search result
 */
export interface SearchResult {
  packages: Package[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Package search response
 */
export interface SearchPackagesResponse {
  packages: Package[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Collection search query
 */
export interface CollectionSearchQuery {
  category?: CollectionCategory;
  tag?: string;
  tags?: string[];
  framework?: string;
  official?: boolean;
  verified?: boolean;
  scope?: string;
  author?: string;
  query?: string; // Full-text search
  limit?: number;
  offset?: number;
  sortBy?: 'downloads' | 'stars' | 'created' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Collection search parameters
 */
export interface SearchCollectionsParams {
  query?: string;
  category?: string;
  tag?: string;
  framework?: string;
  official?: boolean;
  verified?: boolean;
  scope?: string;
  author?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'downloads' | 'stars' | 'created' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Collection search response
 */
export interface SearchCollectionsResponse {
  collections: Collection[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}
