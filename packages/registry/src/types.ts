/**
 * Core types for PRMP Registry
 */

// Package types
export type Format = 'cursor' | 'claude' | 'continue' | 'windsurf' | 'copilot' | 'kiro' | 'agents.md' | 'generic' | 'mcp';
export type Subtype = 'rule' | 'agent' | 'skill' | 'slash-command' | 'prompt' | 'workflow' | 'tool' | 'template' | 'collection' | 'chatmode';

export type PackageVisibility = 'public' | 'private' | 'unlisted';
export type OrgRole = 'owner' | 'admin' | 'maintainer' | 'member';

// User & Authentication
export interface User {
  id: string;
  username: string;
  email: string;
  github_id?: string;
  github_username?: string;
  avatar_url?: string;
  password_hash?: string;
  nango_connection_id?: string;
  incoming_connection_id?: string | null;
  website?: string;
  verified_author: boolean;
  is_admin: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  website_url?: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  joined_at: Date;
}

// Package
export interface Package {
  id: string;
  name: string;
  description?: string;
  author_id?: string;
  author_username?: string;
  org_id?: string;
  org_name?: string;
  format: Format;
  subtype: Subtype;
  license?: string;
  license_text?: string;
  license_url?: string;
  snippet?: string;
  repository_url?: string;
  homepage_url?: string;
  documentation_url?: string;
  tags: string[];
  keywords: string[];
  category?: string;
  visibility: PackageVisibility;
  deprecated: boolean;
  deprecated_reason?: string;
  verified: boolean;
  featured: boolean;
  official?: boolean;
  total_downloads: number;
  weekly_downloads: number;
  monthly_downloads: number;
  version_count: number;
  quality_score?: number;
  rating_average?: number;
  rating_count: number;
  install_count?: number;
  view_count?: number;
  created_at: Date;
  updated_at: Date;
  last_published_at?: Date;
}

export interface PackageVersion {
  id: string;
  package_id: string;
  version: string;
  description?: string;
  changelog?: string;
  tarball_url: string;
  content_hash: string;
  file_size: number;
  dependencies: Record<string, string>;
  peer_dependencies: Record<string, string>;
  engines: Record<string, string>;
  metadata: Record<string, any>;
  is_prerelease: boolean;
  is_deprecated: boolean;
  downloads: number;
  published_by?: string;
  published_at: Date;
}

// Package manifest (from prpm.json)
export interface PackageManifest {
  name: string;
  version: string;
  description: string;
  author: string | PackageAuthor;
  license?: string;
  repository?: string;
  homepage?: string;
  documentation?: string;
  format: Format;
  subtype?: Subtype;
  tags?: string[];
  keywords?: string[];
  category?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  files: string[];
  main?: string;
}

export interface PackageAuthor {
  name: string;
  email?: string;
  url?: string;
}

// Reviews & Ratings
export interface PackageReview {
  id: string;
  package_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  helpful_count: number;
  created_at: Date;
  updated_at: Date;
}

// Statistics
export interface PackageStats {
  package_id: string;
  version: string;
  date: Date;
  downloads: number;
}

// Access Tokens
export interface AccessToken {
  id: string;
  user_id?: string;
  org_id?: string;
  token_hash: string;
  name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: Date;
  expires_at?: Date;
  created_at: Date;
}

// API Request/Response types
export interface SearchFilters {
  format?: Format | Format[];
  subtype?: Subtype | Subtype[];
  tags?: string[];
  category?: string;
  author?: string;  // Filter by author username
  verified?: boolean;
  featured?: boolean;
  sort?: 'downloads' | 'created' | 'updated' | 'quality' | 'rating';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  packages: Package[];
  total: number;
  offset: number;
  limit: number;
}

export interface PackageInfo extends Package {
  author?: User;
  organization?: Organization;
  versions: PackageVersion[];
  latest_version?: PackageVersion;
  readme?: string;
}

export interface PublishRequest {
  manifest: PackageManifest;
  tarball: Buffer;
  readme?: string;
}

export interface PublishResponse {
  success: boolean;
  package_id: string;
  version: string;
  message: string;
}

// Audit log
export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// JWT Payload
export interface JWTPayload {
  user_id: string;
  username: string;
  email: string;
  is_admin: boolean;
  scopes: string[];
  iat: number;
  exp: number;
}

// Configuration
export interface RegistryConfig {
  env?: string;
  port: number;
  host: string;
  logLevel: string;
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  search: {
    engine: 'postgres' | 'opensearch';
    opensearch: {
      endpoint: string;
      region: string;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  nango: {
    apiKey: string;
    host: string;
    integrationId: string;
  };
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  rateLimit: {
    max: number;
    window: number;
  };
  packages: {
    maxSize: number;
    allowedExtensions: string[];
  };
  ai: {
    anthropicApiKey: string;
    evaluationEnabled: boolean;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  frontend: {
    url: string;
  };
}
