/**
 * Strongly typed request/response interfaces
 */

import { Format, Subtype, PackageVisibility } from '../types.js';

// Query string types
export interface ListPackagesQuery {
  search?: string;
  format?: Format;
  subtype?: Subtype;
  category?: string;
  featured?: boolean;
  verified?: boolean;
  sort?: 'downloads' | 'created' | 'updated' | 'quality' | 'rating';
  limit?: number;
  offset?: number;
}

export interface SearchQuery {
  q?: string;
  format?: Format;
  subtype?: Subtype;
  category?: string;
  tags?: string | string[];
  verified?: boolean;
  featured?: boolean;
  sort?: 'downloads' | 'created' | 'updated' | 'quality' | 'rating';
  limit?: number;
  offset?: number;
}

export interface TrendingQuery {
  format?: Format;
  subtype?: Subtype;
  limit?: number;
  offset?: number;
}

export interface ResolveQuery {
  version?: string;
}

// Route params
export interface PackageParams {
  id: string;
}

export interface PackageVersionParams {
  id: string;
  version: string;
}

// Database query results
export interface CountResult {
  count: string;
}

export interface VersionRow {
  version: string;
  published_at: string;
  is_prerelease: boolean;
}

export interface DependenciesRow {
  dependencies: Record<string, string> | null;
  peer_dependencies: Record<string, string> | null;
}

export interface LatestVersionRow {
  latest_version: string;
}

// API Response types
export interface PackageVersionsResponse {
  package_id: string;
  versions: VersionRow[];
  total: number;
}

export interface PackageDependenciesResponse {
  package_id: string;
  version: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

export interface ResolveResponse {
  package_id: string;
  version: string;
  resolved: Record<string, string>;
  tree: Record<string, {
    version: string;
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
  }>;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
