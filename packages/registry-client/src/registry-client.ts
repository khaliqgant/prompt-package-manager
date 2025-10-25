/**
 * Registry API Client
 * Handles all communication with the PRPM Registry
 */

import { Format, Subtype } from './types';
import type {
  DependencyTree,
  SearchResponse,
  PackageManifest,
  PublishResponse
} from './types/registry';

export interface RegistryPackage {
  id: string;
  name: string;
  description?: string;
  format: Format;
  subtype: Subtype;
  tags: string[];
  total_downloads: number;
  rating_average?: number;
  verified: boolean;
  official?: boolean;
  featured?: boolean;
  latest_version?: {
    version: string;
    tarball_url: string;
  };
}

export interface SearchResult {
  packages: RegistryPackage[];
  total: number;
  offset: number;
  limit: number;
}

export interface CollectionPackage {
  packageId: string;
  version?: string;
  required: boolean;
  reason?: string;
  package?: RegistryPackage;
}

export interface Collection {
  id: string;                 // UUID
  scope: string;
  name_slug: string;          // URL-friendly slug
  name: string;
  description: string;
  version: string;
  author: string;
  official: boolean;
  verified: boolean;
  category?: string;
  tags: string[];
  packages: CollectionPackage[];
  downloads: number;
  stars: number;
  icon?: string;
  package_count: number;
}

export interface CollectionsResult {
  collections: Collection[];
  total: number;
  offset: number;
  limit: number;
}

export interface CollectionInstallResult {
  collection: Collection;
  packagesToInstall: {
    packageId: string;
    version: string;
    format: string;
    required: boolean;
  }[];
}

export interface RegistryConfig {
  url: string;
  token?: string;
}

export class RegistryClient {
  private baseUrl: string;
  private token?: string;

  constructor(config: RegistryConfig) {
    this.baseUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token;
  }

  /**
   * Search for packages in the registry
   */
  async search(query: string, options?: {
    format?: Format;
    subtype?: Subtype;
    tags?: string[];
    author?: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResult> {
    const params = new URLSearchParams({ q: query });
    if (options?.format) params.append('format', options.format);
    if (options?.subtype) params.append('subtype', options.subtype);
    if (options?.tags) options.tags.forEach(tag => params.append('tags', tag));
    if (options?.author) params.append('author', options.author);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.fetch(`/api/v1/search?${params}`);
    return response.json() as Promise<SearchResult>;
  }

  /**
   * Get package information
   */
  async getPackage(packageId: string): Promise<RegistryPackage> {
    const response = await this.fetch(`/api/v1/packages/${encodeURIComponent(packageId)}`);
    return response.json() as Promise<RegistryPackage>;
  }

  /**
   * Get specific package version
   */
  async getPackageVersion(packageId: string, version: string): Promise<any> {
    const response = await this.fetch(`/api/v1/packages/${encodeURIComponent(packageId)}/${version}`);
    return response.json();
  }

  /**
   * Get package dependencies
   */
  async getPackageDependencies(packageId: string, version?: string): Promise<{
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
  }> {
    const versionPath = version ? `/${version}` : '';
    const response = await this.fetch(`/api/v1/packages/${encodeURIComponent(packageId)}${versionPath}/dependencies`);
    return response.json() as Promise<{ dependencies: Record<string, string>; peerDependencies: Record<string, string> }>;
  }

  /**
   * Get all versions for a package
   */
  async getPackageVersions(packageId: string): Promise<{ versions: string[] }> {
    const response = await this.fetch(`/api/v1/packages/${encodeURIComponent(packageId)}/versions`);
    return response.json() as Promise<{ versions: string[] }>;
  }

  /**
   * Resolve dependency tree
   */
  async resolveDependencies(packageId: string, version?: string): Promise<{
    resolved: Record<string, string>;
    tree: DependencyTree;
  }> {
    const params = new URLSearchParams();
    if (version) params.append('version', version);

    const response = await this.fetch(`/api/v1/packages/${encodeURIComponent(packageId)}/resolve?${params}`);
    return response.json() as Promise<{ resolved: Record<string, string>; tree: DependencyTree }>;
  }

  /**
   * Download package tarball
   */
  async downloadPackage(
    tarballUrl: string,
    options: { format?: string } = {}
  ): Promise<Buffer> {
    // Replace production registry URL with configured registry URL
    // This allows local development to work correctly
    let url = tarballUrl;
    const productionUrls = [
      'https://registry.prpm.dev',
      'http://registry.prpm.dev',
      'https://prpm.dev',
      'http://prpm.dev',
    ];

    for (const prodUrl of productionUrls) {
      if (url.startsWith(prodUrl)) {
        url = url.replace(prodUrl, this.baseUrl);
        // Fix URLs that are missing /api/v1 prefix
        // e.g., http://localhost:3000/packages/UUID/version.tar.gz
        // should be http://localhost:3000/api/v1/packages/UUID/version.tar.gz
        url = url.replace(/^(https?:\/\/[^/]+)\/packages\//, '$1/api/v1/packages/');
        break;
      }
    }

    // Parse URL
    const urlObj = new URL(url);

    // If format is specified, append format param
    if (options.format) {
      urlObj.searchParams.set('format', options.format);
    }

    const response = await fetch(urlObj.toString());
    if (!response.ok) {
      throw new Error(`Failed to download package: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Track package download
   */
  async trackDownload(
    packageId: string,
    options?: {
      version?: string;
      client?: string;
      format?: string;
      clientId?: string;
    }
  ): Promise<void> {
    try {
      // Map package type to analytics format
      const formatMap: Record<string, string> = {
        'cursor': 'cursor',
        'cursor-agent': 'cursor',
        'cursor-slash-command': 'cursor',
        'claude': 'claude',
        'claude-skill': 'claude',
        'claude-agent': 'claude',
        'claude-slash-command': 'claude',
        'continue': 'continue',
        'windsurf': 'windsurf',
        'generic': 'generic',
        'mcp': 'generic',
      };

      const analyticsFormat = options?.format ? formatMap[options.format] || 'generic' : 'generic';

      await this.fetch('/api/v1/analytics/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId,
          version: options?.version,
          client: options?.client || 'cli',
          format: analyticsFormat,
          clientId: options?.clientId,
        }),
      });
    } catch (error) {
      // Don't fail install if analytics tracking fails
      // Just log silently
    }
  }

  /**
   * Get trending packages
   */
  async getTrending(format?: Format, subtype?: Subtype, limit: number = 20): Promise<RegistryPackage[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (format) params.append('format', format);
    if (subtype) params.append('subtype', subtype);

    const response = await this.fetch(`/api/v1/search/trending?${params}`);
    const data = await response.json() as SearchResponse;
    return data.packages;
  }

  /**
   * Get featured packages
   */
  async getFeatured(format?: Format, subtype?: Subtype, limit: number = 20): Promise<RegistryPackage[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (format) params.append('format', format);
    if (subtype) params.append('subtype', subtype);

    const response = await this.fetch(`/api/v1/search/featured?${params}`);
    const data = await response.json() as SearchResponse;
    return data.packages;
  }

  /**
   * Publish a package (requires authentication)
   */
  async publish(manifest: PackageManifest, tarball: Buffer): Promise<PublishResponse> {
    if (!this.token) {
      throw new Error('Authentication required. Run `prpm login` first.');
    }

    // Normalize manifest for API - convert enhanced format to simple format for backend
    // The backend currently only accepts string[] for files
    const normalizedManifest = {
      ...manifest,
      files: manifest.files
        ? manifest.files.map(file =>
            typeof file === 'string' ? file : file.path
          )
        : [],
    };

    // Convert tarball to base64 string for JSON transport
    const tarballBase64 = tarball.toString('base64');

    const response = await this.fetch('/api/v1/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manifest: normalizedManifest,
        tarball: tarballBase64,
      }),
    });

    return response.json() as Promise<PublishResponse>;
  }

  /**
   * Login and get authentication token
   */
  async login(): Promise<string> {
    // This will open browser for GitHub OAuth
    // For now, return placeholder - will implement OAuth flow
    throw new Error('Login not yet implemented. Coming soon!');
  }

  /**
   * Get current user info
   */
  async whoami(): Promise<any> {
    if (!this.token) {
      throw new Error('Not authenticated. Run `prpm login` first.');
    }

    const response = await this.fetch('/api/v1/auth/me');
    return response.json();
  }

  /**
   * Get collections
   */
  async getCollections(options?: {
    query?: string;
    category?: string;
    tag?: string;
    official?: boolean;
    scope?: string;
    limit?: number;
    offset?: number;
  }): Promise<CollectionsResult> {
    const params = new URLSearchParams();
    if (options?.query) params.append('query', options.query);
    if (options?.category) params.append('category', options.category);
    if (options?.tag) params.append('tag', options.tag);
    if (options?.official) params.append('official', 'true');
    if (options?.scope) params.append('scope', options.scope);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.fetch(`/api/v1/collections?${params}`);
    return response.json() as Promise<CollectionsResult>;
  }

  /**
   * Get collection details
   */
  async getCollection(scope: string, id: string, version?: string): Promise<Collection> {
    const versionPath = version ? `/${version}` : '/1.0.0';
    const response = await this.fetch(`/api/v1/collections/${scope}/${id}${versionPath}`);
    return response.json() as Promise<Collection>;
  }

  /**
   * Install collection (get installation plan)
   */
  async installCollection(options: {
    scope: string;
    id: string;
    version?: string;
    format?: string;
    skipOptional?: boolean;
  }): Promise<CollectionInstallResult> {
    const response = await this.fetch(
      `/api/v1/collections/${options.scope}/${options.id}/install`,
      {
        method: 'POST',
        body: JSON.stringify({
          version: options.version,
          format: options.format,
          skipOptional: options.skipOptional,
        }),
      }
    );
    return response.json() as Promise<CollectionInstallResult>;
  }

  /**
   * Get user profile
   */
  async getUserProfile(username: string): Promise<{
    id: string;
    username: string;
    avatar_url?: string;
    verified_author: boolean;
    created_at: string;
    stats: {
      total_packages: number;
      total_downloads: number;
    };
    organizations?: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  }> {
    const response = await this.fetch(`/api/v1/users/${username}`);
    return response.json() as Promise<{
      id: string;
      username: string;
      avatar_url?: string;
      verified_author: boolean;
      created_at: string;
      stats: {
        total_packages: number;
        total_downloads: number;
      };
      organizations?: Array<{
        id: string;
        name: string;
        role: string;
      }>;
    }>;
  }

  /**
   * Create a collection (requires authentication)
   */
  async createCollection(data: {
    id: string;
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    packages: {
      packageId: string;
      version?: string;
      required?: boolean;
      reason?: string;
    }[];
    icon?: string;
  }): Promise<Collection> {
    if (!this.token) {
      throw new Error('Authentication required. Run `prpm login` first.');
    }

    const response = await this.fetch('/api/v1/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return response.json() as Promise<Collection>;
  }

  /**
   * Helper method for making authenticated requests with retry logic
   */
  private async fetch(path: string, options: RequestInit = {}, retries: number = 3): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // Only set Content-Type if not already set and body is not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Always add Authorization if we have a token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Use globalThis.fetch to ensure it works in both ESM and CommonJS
        const response = await globalThis.fetch(url, {
          ...options,
          headers,
        });

        // Handle rate limiting with retry
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        // Handle server errors with retry
        if (response.status >= 500 && response.status < 600 && attempt < retries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          let error: { error?: string; message?: string };
          try {
            error = await response.json() as { error?: string; message?: string };
          } catch {
            error = { error: response.statusText };
          }
          throw new Error(error.error || error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Network errors - retry with exponential backoff
        if (attempt < retries - 1 && (
          lastError.message.includes('fetch failed') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('ETIMEDOUT')
        )) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // If it's not a retryable error or we're out of retries, throw
        if (attempt === retries - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }
}

/**
 * Get registry client with configuration
 */
export function getRegistryClient(config: { registryUrl?: string; token?: string }): RegistryClient {
  return new RegistryClient({
    url: config.registryUrl || 'https://registry.prpm.dev',
    token: config.token,
  });
}
