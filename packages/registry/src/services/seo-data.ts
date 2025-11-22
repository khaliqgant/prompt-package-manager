import { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { uploadJsonObject, s3Client } from '../storage/s3.js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

interface SeoPackageResponse {
  packages: any[];
  hasMore: boolean;
}

interface SeoCollectionResponse {
  collections: any[];
  hasMore: boolean;
}

export class SeoDataService {
  private server: FastifyInstance;
  private enabled: boolean;
  private bucket: string;
  private prefix: string;
  private cacheControl: string;
  private ssgToken?: string;
  private isRunning = false;
  private rerunRequested = false;

  constructor(server: FastifyInstance) {
    this.server = server;
    this.enabled = config.seoData?.enabled !== false;
    this.bucket = config.seoData?.bucket || config.s3.bucket;
    this.prefix = config.seoData?.prefix || 'seo-data';
    this.cacheControl = config.seoData?.cacheControl || 'public, max-age=300';
    this.ssgToken = process.env.SSG_DATA_TOKEN;

    if (!this.ssgToken) {
      this.server.log.warn('SEO data service disabled: SSG_DATA_TOKEN not configured');
      this.enabled = false;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  async updateSinglePackage(packageName: string) {
    if (!this.enabled) {
      this.server.log.debug({ packageName }, 'SEO data service disabled, skipping package update');
      return;
    }

    try {
      this.server.log.info({ packageName }, '🔄 Incremental SSG update for single package');

      const packageData = await this.fetchSinglePackage(packageName);

      if (!packageData) {
        this.server.log.warn({ packageName }, 'Package not found for SEO update');
        return;
      }

      // Incrementally update main packages.json
      await this.updateMainPackagesJson(packageData);

      // Generate SEO-optimized HTML page with client-side enrichment
      await this.generateAndUploadStaticPage(packageData);

      this.server.log.info({ packageName }, '✅ Incremental SSG update complete');
    } catch (error) {
      this.server.log.error(
        { packageName, error: error instanceof Error ? error.message : String(error) },
        'Failed to update SEO data for package'
      );
    }
  }

  /**
   * Incrementally update the main packages.json file
   * Downloads current packages.json, adds/updates the package, and re-uploads
   */
  private async updateMainPackagesJson(newPackage: any) {
    try {
      this.server.log.info({ packageName: newPackage.name }, '📝 Updating main packages.json');

      // Download current packages.json from S3
      let allPackages: any[] = [];
      try {
        const s3Data = await this.downloadJsonFromS3('packages.json');
        allPackages = Array.isArray(s3Data) ? s3Data : [];
        this.server.log.info(`Downloaded ${allPackages.length} packages from S3`);
      } catch (downloadError) {
        this.server.log.warn('Could not download packages.json from S3, will create new');
        allPackages = [];
      }

      // Find and update existing package, or append new one
      const existingIndex = allPackages.findIndex((pkg: any) => pkg.name === newPackage.name);
      if (existingIndex >= 0) {
        this.server.log.info(`Updating existing package at index ${existingIndex}`);
        allPackages[existingIndex] = newPackage;
      } else {
        this.server.log.info(`Adding new package (total: ${allPackages.length + 1})`);
        allPackages.push(newPackage);
      }

      // Sort by downloads (descending) to maintain consistency
      allPackages.sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0));

      // Upload updated packages.json
      await uploadJsonObject(this.server, 'packages.json', allPackages, {
        bucket: this.bucket,
        prefix: this.prefix,
        cacheControl: this.cacheControl,
      });

      this.server.log.info({ total: allPackages.length }, '✅ Main packages.json updated');
    } catch (error) {
      this.server.log.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to update main packages.json'
      );
      throw error;
    }
  }

  /**
   * Download JSON file from S3
   */
  private async downloadJsonFromS3(filename: string): Promise<any> {
    const key = this.prefix ? `${this.prefix.replace(/\/?$/, '/')}${filename}` : filename;

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }

    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString);
  }

  /**
   * Generate static HTML page for package and upload to S3
   * Fetches an existing page from webapp as template, then replaces package data
   */
  private async generateAndUploadStaticPage(packageData: any) {
    try {
      const packageName = packageData.name;
      this.server.log.info({ packageName }, '🎨 Generating static HTML page from webapp template');

      // Parse package name to get author and package path
      // Format: @author/package-name or @author/nested/package
      const match = packageName.match(/^@([^\/]+)\/(.+)$/);
      if (!match) {
        this.server.log.warn({ packageName }, 'Could not parse package name, skipping HTML generation');
        return;
      }

      const [, author, packagePath] = match;

      // Fetch a template page from an existing package (use a popular one as template)
      const webappUrl = process.env.WEBAPP_URL || 'https://prpm.dev';
      const templatePackage = process.env.TEMPLATE_PACKAGE || '@prpm/typescript-type-safety';

      // Convert @prpm/typescript-type-safety -> prpm/typescript-type-safety
      const templatePath = templatePackage.replace(/^@/, '');
      const templateUrl = `${webappUrl}/packages/${templatePath}`;

      this.server.log.info({ templateUrl }, 'Fetching template from existing package');

      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.status}`);
      }

      let html = await response.text();

      // Replace package-specific data in the HTML
      html = this.replacePackageDataInHtml(html, packageData, author, packagePath);

      // Upload HTML to S3
      const htmlKey = `packages/${author}/${packagePath}/index.html`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: htmlKey,
          Body: Buffer.from(html, 'utf-8'),
          ContentType: 'text/html',
          CacheControl: 'public, max-age=3600',
        })
      );

      this.server.log.info({ packageName, htmlKey }, '✅ Static HTML page uploaded (from template)');

      // Invalidate CloudFront cache for immediate availability
      await this.invalidateCloudFrontCache(htmlKey);
    } catch (error) {
      this.server.log.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to generate static page from template, falling back to simple version'
      );

      // Fallback to simple HTML generation
      await this.generateSimpleHtmlPage(packageData);
    }
  }

  /**
   * Replace package data in HTML template
   * Finds Next.js __NEXT_DATA__ script and replaces it with new package data
   */
  private replacePackageDataInHtml(html: string, packageData: any, author: string, packagePath: string): string {
    const webappUrl = process.env.WEBAPP_URL || 'https://prpm.dev';
    const packageUrl = `${webappUrl}/packages/${author}/${packagePath}`;
    const displayName = packageData.display_name || packageData.name;
    const description = packageData.description || 'Package for AI coding assistants';

    // Replace Next.js data
    html = html.replace(
      /<script id="__NEXT_DATA__"[^>]*>.*?<\/script>/s,
      `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
        props: {
          pageProps: packageData,
        },
      })}</script>`
    );

    // Replace meta tags
    html = html.replace(/<title>.*?<\/title>/, `<title>${this.escapeHtml(displayName)} - PRPM Package Registry</title>`);
    html = html.replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${this.escapeHtml(description)}"`);
    html = html.replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${this.escapeHtml(displayName)}"`);
    html = html.replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${this.escapeHtml(description)}"`);
    html = html.replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${packageUrl}"`);
    html = html.replace(/<meta property="twitter:title" content=".*?"/, `<meta property="twitter:title" content="${this.escapeHtml(displayName)}"`);
    html = html.replace(/<meta property="twitter:description" content=".*?"/, `<meta property="twitter:description" content="${this.escapeHtml(description)}"`);
    html = html.replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${packageUrl}"`);

    // Replace any hardcoded package names in the body
    // This is a simple approach - may need refinement based on actual HTML structure

    return html;
  }

  /**
   * Fallback: Generate simple HTML page if template fetching fails
   */
  private async generateSimpleHtmlPage(packageData: any) {
    const match = packageData.name.match(/^@([^\/]+)\/(.+)$/);
    if (!match) return;

    const [, author, packagePath] = match;
    const html = this.generatePackageHtml(packageData, author, packagePath);

    const htmlKey = `packages/${author}/${packagePath}/index.html`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: htmlKey,
        Body: Buffer.from(html, 'utf-8'),
        ContentType: 'text/html',
        CacheControl: 'public, max-age=3600',
      })
    );

    this.server.log.info({ htmlKey }, '✅ Simple HTML page uploaded (fallback)');
  }

  /**
   * HTML escape helper
   */
  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m));
  }

  /**
   * Generate SEO-optimized HTML for a package page
   * Includes SEO metadata + client-side rendering for full page display
   */
  private generatePackageHtml(pkg: any, author: string, packagePath: string): string {
    const displayName = pkg.display_name || pkg.name;
    const description = pkg.description || 'Package for AI coding assistants';
    const webappUrl = process.env.WEBAPP_URL || 'https://prpm.dev';
    const registryUrl = process.env.REGISTRY_URL || 'https://registry.prpm.dev';
    const packageUrl = `${webappUrl}/packages/${author}/${packagePath}`;
    const apiUrl = `${registryUrl}/api/v1/packages/${encodeURIComponent(pkg.name)}`;

    // Escape data for safe JSON embedding
    const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(displayName)} - PRPM Package Registry</title>
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${packageUrl}">
  <meta property="og:title" content="${escapeHtml(displayName)}">
  <meta property="og:description" content="${escapeHtml(description)}">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${packageUrl}">
  <meta property="twitter:title" content="${escapeHtml(displayName)}">
  <meta property="twitter:description" content="${escapeHtml(description)}">

  <!-- Canonical URL -->
  <link rel="canonical" href="${packageUrl}">

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "name": "${escapeHtml(displayName)}",
    "description": "${escapeHtml(description)}",
    "url": "${packageUrl}",
    "applicationCategory": "DeveloperApplication"
  }
  </script>

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
    }
    .loading { color: #666; font-style: italic; }
    .package-header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .package-meta { color: #666; font-size: 14px; }
    .package-content { margin-top: 30px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .tag { display: inline-block; background: #e1e8ed; padding: 4px 12px; border-radius: 12px; margin: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div id="app">
    <div class="package-header">
      <h1>${escapeHtml(displayName)}</h1>
      <p>${escapeHtml(description)}</p>
      <div class="package-meta">
        <span>Format: ${escapeHtml(pkg.format || 'N/A')}</span> •
        <span>Type: ${escapeHtml(pkg.subtype || 'N/A')}</span>
        ${pkg.total_downloads ? ` • <span>Downloads: ${pkg.total_downloads}</span>` : ''}
      </div>
    </div>
    <div class="package-content">
      <p class="loading">Loading package details...</p>
    </div>
  </div>

  <script>
    // Embedded package data for faster initial render
    const PACKAGE_DATA = ${JSON.stringify(pkg)};
    const API_URL = '${apiUrl}';

    // Render package details from embedded data
    function renderPackage(data) {
      const content = document.querySelector('.package-content');

      let html = '';

      // Tags
      if (data.tags && data.tags.length > 0) {
        html += '<div style="margin-bottom: 20px;">';
        data.tags.forEach(tag => {
          html += \`<span class="tag">\${tag}</span>\`;
        });
        html += '</div>';
      }

      // Installation
      html += '<h2>Installation</h2>';
      html += \`<pre>prpm install \${data.name}</pre>\`;

      // Content/Documentation
      if (data.fullContent || data.full_content) {
        html += '<h2>Documentation</h2>';
        html += \`<pre>\${data.fullContent || data.full_content}</pre>\`;
      }

      // Repository
      if (data.repository_url) {
        html += \`<p><a href="\${data.repository_url}" target="_blank">View on GitHub →</a></p>\`;
      }

      content.innerHTML = html;
    }

    // Render immediately with embedded data
    renderPackage(PACKAGE_DATA);

    // Optionally fetch fresh data in background to update download counts etc
    fetch(API_URL)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.total_downloads !== PACKAGE_DATA.total_downloads) {
          // Update if data changed
          renderPackage(data);
        }
      })
      .catch(() => {
        // Embedded data is fine, no need to show error
      });
  </script>

  <noscript>
    <p>This page requires JavaScript. Please enable JavaScript or visit <a href="${packageUrl}">the main site</a>.</p>
  </noscript>
</body>
</html>`;
  }

  /**
   * Invalidate CloudFront cache for a specific path
   */
  private async invalidateCloudFrontCache(path: string) {
    const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
    if (!distributionId) {
      this.server.log.debug('CLOUDFRONT_DISTRIBUTION_ID not set, skipping cache invalidation');
      return;
    }

    try {
      const { CloudFrontClient, CreateInvalidationCommand } = await import('@aws-sdk/client-cloudfront');
      const client = new CloudFrontClient({});

      await client.send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: `pkg-${Date.now()}`,
            Paths: {
              Quantity: 1,
              Items: [`/${path}`],
            },
          },
        })
      );

      this.server.log.info({ path }, '🔄 CloudFront cache invalidated');
    } catch (error) {
      this.server.log.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to invalidate CloudFront cache'
      );
    }
  }

  async queueFullRebuild(trigger: string) {
    if (!this.enabled) {
      this.server.log.debug({ trigger }, 'SEO data service disabled, skipping rebuild');
      return;
    }

    if (this.isRunning) {
      this.rerunRequested = true;
      this.server.log.info({ trigger }, 'SEO data rebuild already in progress, will rerun once finished');
      return;
    }

    this.isRunning = true;
    do {
      this.rerunRequested = false;
      try {
        await this.rebuildAll(trigger);
      } catch (error) {
        this.server.log.error({ error: error instanceof Error ? error.message : String(error) }, 'SEO data rebuild failed');
      }
    } while (this.rerunRequested);
    this.isRunning = false;
  }

  private async rebuildAll(trigger: string) {
    this.server.log.info({ trigger }, '🔄 Rebuilding SEO data (packages & collections)');

    const [packages, collections] = await Promise.all([
      this.fetchAllPackages(),
      this.fetchAllCollections(),
    ]);

    await Promise.all([
      uploadJsonObject(this.server, 'packages.json', packages, {
        bucket: this.bucket,
        prefix: this.prefix,
        cacheControl: this.cacheControl,
      }),
      uploadJsonObject(this.server, 'collections.json', collections, {
        bucket: this.bucket,
        prefix: this.prefix,
        cacheControl: this.cacheControl,
      }),
    ]);

    this.server.log.info(
      { trigger, packages: packages.length, collections: collections.length },
      '✅ SEO data uploaded'
    );
  }

  private async fetchAllPackages() {
    const allPackages: any[] = [];
    let offset = 0;
    const limit = 500;

    while (true) {
      const response = await this.fetchPackages(limit, offset);
      if (!Array.isArray(response.packages) || response.packages.length === 0) {
        break;
      }

      allPackages.push(...response.packages);

      if (!response.hasMore) {
        break;
      }

      offset += limit;
    }

    return allPackages;
  }

  private async fetchPackages(limit: number, offset: number): Promise<SeoPackageResponse> {
    const response = await this.server.inject({
      method: 'GET',
      url: `/api/v1/packages/ssg-data?limit=${limit}&offset=${offset}`,
      headers: {
        'x-ssg-token': this.ssgToken!,
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch packages for SEO data (status ${response.statusCode})`);
    }

    return response.json() as SeoPackageResponse;
  }

  private async fetchSinglePackage(packageName: string): Promise<any | null> {
    const response = await this.server.inject({
      method: 'GET',
      url: `/api/v1/packages/ssg-data?packageName=${encodeURIComponent(packageName)}`,
      headers: {
        'x-ssg-token': this.ssgToken!,
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch package ${packageName} for SEO data (status ${response.statusCode})`);
    }

    const data = response.json() as SeoPackageResponse;

    // Should return exactly one package when filtered by name
    if (!data.packages || data.packages.length === 0) {
      return null;
    }

    return data.packages[0];
  }

  private async fetchAllCollections() {
    const allCollections: any[] = [];
    let offset = 0;
    const limit = 500;

    while (true) {
      const response = await this.fetchCollections(limit, offset);
      if (!Array.isArray(response.collections) || response.collections.length === 0) {
        break;
      }

      allCollections.push(...response.collections);

      if (!response.hasMore) {
        break;
      }

      offset += limit;
    }

    return allCollections;
  }

  private async fetchCollections(limit: number, offset: number): Promise<SeoCollectionResponse> {
    const response = await this.server.inject({
      method: 'GET',
      url: `/api/v1/collections/ssg-data?limit=${limit}&offset=${offset}`,
      headers: {
        'x-ssg-token': this.ssgToken!,
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch collections for SEO data (status ${response.statusCode})`);
    }

    return response.json() as SeoCollectionResponse;
  }
}
