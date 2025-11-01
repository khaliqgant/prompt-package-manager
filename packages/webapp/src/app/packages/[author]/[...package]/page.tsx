import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { PackageInfo } from '@pr-pm/types'
import CopyInstallCommand from '@/components/CopyInstallCommand'

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || process.env.REGISTRY_URL || 'https://registry.prpm.dev'
// During build, don't set a default S3 URL - we want to use local files only
// Only use S3 as fallback in runtime (client-side) if explicitly configured
const S3_SEO_DATA_URL = process.env.NEXT_PUBLIC_S3_SEO_DATA_URL || (typeof window !== 'undefined' ? 'https://prpm-prod-packages.s3.amazonaws.com/seo-data' : '')

// Allow dynamic rendering for params not in generateStaticParams
export const dynamicParams = true

// Helper to get package content - prefer full content, fall back to snippet
function getPackageContent(pkg: any): string | null {
  // Use fullContent if available (from S3), otherwise fall back to snippet
  return pkg.fullContent || pkg.snippet || null
}

// Generate static params for all packages
export async function generateStaticParams() {
  // Skip SSG entirely when explicitly disabled (for testing builds without S3 data)
  if (process.env.SKIP_SSG === 'true') {
    console.log('[SSG Packages] SSG disabled via SKIP_SSG=true')
    return []
  }

  try {
    console.log(`[SSG Packages] Starting - S3_SEO_DATA_URL: ${S3_SEO_DATA_URL}`)

    // Try to read from local filesystem first (for static builds with pre-downloaded data)
    const fs = await import('fs/promises')
    const path = await import('path')

    // Check if local SEO data exists (downloaded during CI build)
    const localPath = path.join(process.cwd(), 'public', 'seo-data', 'packages.json')
    console.log(`[SSG Packages] Checking for local file: ${localPath}`)

    let packages
    try {
      const fileContent = await fs.readFile(localPath, 'utf-8')
      packages = JSON.parse(fileContent)
      console.log(`[SSG Packages] ✅ Loaded ${packages.length} packages from local file`)
    } catch (fsError) {
      // Local file doesn't exist, try fetching from S3 if URL is configured
      if (!S3_SEO_DATA_URL) {
        console.error(`[SSG Packages] Local file not found and S3_SEO_DATA_URL not configured`)
        console.error(`[SSG Packages] Make sure to run prepare-ssg-data.sh before building`)
        return []
      }

      console.log(`[SSG Packages] Local file not found, fetching from S3`)

      const url = `${S3_SEO_DATA_URL}/packages.json`
      console.log(`[SSG Packages] Fetching from: ${url}`)

      const res = await fetch(url, {
        next: { revalidate: 3600 } // Revalidate every hour
      })

      if (!res.ok) {
        console.error(`[SSG Packages] HTTP ${res.status}: Failed to fetch packages from S3`)
        console.error(`[SSG Packages] Response headers:`, Object.fromEntries(res.headers.entries()))
        return []
      }

      packages = await res.json()
      console.log(`[SSG Packages] Received ${packages.length} packages from S3`)
    }

    if (!Array.isArray(packages)) {
      console.error('[SSG Packages] Invalid response format - expected array')
      return []
    }

    // Transform package data to author/package format
    const params = packages.map((pkg: any) => {
      const name = pkg.name
      if (name.startsWith('@')) {
        // Scoped package: @author/package/sub/path -> author + [package, sub, path]
        const withoutAt = name.substring(1) // Remove @
        const [author, ...packageParts] = withoutAt.split('/')
        return {
          author,
          package: packageParts, // Array for catch-all route
        }
      } else {
        // Unscoped package: assume prpm as default author
        return {
          author: 'prpm',
          package: [name], // Array for catch-all route
        }
      }
    })

    console.log(`[SSG Packages] ✅ Complete: ${params.length} packages for static generation`)
    return params

  } catch (outerError) {
    // Catch any unexpected errors and log them
    console.error('[SSG Packages] CRITICAL ERROR in generateStaticParams:', outerError)
    console.error('[SSG Packages] Error stack:', outerError instanceof Error ? outerError.stack : undefined)

    // Return empty array to prevent build failure
    console.log('[SSG Packages] Returning empty array due to error')
    return []
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { author: string; package: string[] } }): Promise<Metadata> {
  // Reconstruct full package name: author/[package, parts] -> @author/package/parts
  const packagePath = Array.isArray(params.package) ? params.package.join('/') : params.package
  const fullName = `@${params.author}/${packagePath}`

  const pkg = await getPackage(fullName)

  if (!pkg) {
    return {
      title: 'Package Not Found',
      description: 'The requested package could not be found.',
    }
  }

  return {
    title: `${pkg.name} ${pkg.format} ${pkg.subtype} - PRPM Package`,
    description: pkg.description || `Install ${pkg.name} with PRPM - ${pkg.format} ${pkg.subtype} for your AI coding workflow`,
    keywords: [...(pkg.tags || []), pkg.format, pkg.subtype, pkg.category, 'prpm', 'ai', 'coding'].filter((k): k is string => Boolean(k)),
    openGraph: {
      title: pkg.name,
      description: pkg.description || `${pkg.format} ${pkg.subtype} package`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: pkg.name,
      description: pkg.description || `${pkg.format} ${pkg.subtype} package`,
    },
  }
}

async function getPackage(name: string): Promise<PackageInfo | null> {
  try {
    let packages

    // Try to read from local filesystem first (for static builds)
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const localPath = path.join(process.cwd(), 'public', 'seo-data', 'packages.json')
      const fileContent = await fs.readFile(localPath, 'utf-8')
      packages = JSON.parse(fileContent)
      console.log(`[getPackage] Loaded from local file`)
    } catch (fsError) {
      // Local file doesn't exist, try fetching from S3 if URL is configured
      if (!S3_SEO_DATA_URL) {
        console.error(`[getPackage] Local file not found and S3_SEO_DATA_URL not configured`)
        return null
      }

      console.log(`[getPackage] Local file not found, fetching from S3`)
      const url = `${S3_SEO_DATA_URL}/packages.json`
      const res = await fetch(url, {
        next: { revalidate: 3600 } // Revalidate every hour
      })

      if (!res.ok) {
        console.error(`Error fetching packages from S3: ${res.status}`)
        return null
      }

      packages = await res.json()
    }

    if (!Array.isArray(packages)) {
      console.error('Invalid packages data format from S3')
      return null
    }

    // Find the package by name
    const pkg = packages.find((p: any) => p.name === name)
    return pkg || null
  } catch (error) {
    console.error('Error fetching package:', error)
    return null
  }
}

export default async function PackagePage({ params }: { params: { author: string; package: string[] } }) {
  // Reconstruct full package name: author/[package, parts] -> @author/package/parts
  const packagePath = Array.isArray(params.package) ? params.package.join('/') : params.package
  const fullName = `@${params.author}/${packagePath}`
  const pkg = await getPackage(fullName)

  if (!pkg) {
    notFound()
  }

  const content = getPackageContent(pkg)

  return (
    <main className="min-h-screen bg-prpm-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-prpm-accent">Home</Link>
          {' / '}
          <Link href="/search" className="hover:text-prpm-accent">Packages</Link>
          {' / '}
          <span className="text-white">{pkg.name}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-white">{pkg.name}</h1>
            {pkg.verified && (
              <svg className="w-8 h-8 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {pkg.featured && (
              <span className="px-3 py-1 bg-prpm-green/20 text-prpm-green text-sm rounded-full">
                Featured
              </span>
            )}
            {pkg.deprecated && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">
                Deprecated
              </span>
            )}
          </div>

          {pkg.description && (
            <p className="text-xl text-gray-300 mb-4">{pkg.description}</p>
          )}

          {pkg.deprecated_reason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400"><strong>Deprecation Notice:</strong> {pkg.deprecated_reason}</p>
            </div>
          )}

          {/* Install Command */}
          <CopyInstallCommand packageName={pkg.name} />

          {/* Stats */}
          <div className="flex flex-wrap gap-6 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span>{pkg.total_downloads.toLocaleString()} total downloads</span>
            </div>
            {pkg.weekly_downloads > 0 && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>{pkg.weekly_downloads.toLocaleString()} this week</span>
              </div>
            )}
            {(pkg.author as any)?.username && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <Link href={`/authors?author=${(pkg.author as any).username}`} className="hover:text-prpm-accent">
                  @{(pkg.author as any).username}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Full Package Content - Prominently displayed at the top */}
        {content && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">📄 Full Prompt Content</h2>
            <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                <code>{content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* README */}
        {pkg.readme && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">📖 README</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: pkg.readme }} />
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📦 Package Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-400">Format</dt>
                <dd className="text-white font-mono">{pkg.format}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-400">Type</dt>
                <dd className="text-white font-mono">{pkg.subtype}</dd>
              </div>
              {pkg.category && (
                <div>
                  <dt className="text-sm text-gray-400">Category</dt>
                  <dd className="text-white">{pkg.category}</dd>
                </div>
              )}
              {pkg.license && (
                <div>
                  <dt className="text-sm text-gray-400">License</dt>
                  <dd className="text-white">
                    <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-sm">
                      {pkg.license}
                    </span>
                  </dd>
                </div>
              )}
              {pkg.latest_version?.version && (
                <div>
                  <dt className="text-sm text-gray-400">Latest Version</dt>
                  <dd className="text-white font-mono">{pkg.latest_version.version}</dd>
                </div>
              )}
              {pkg.version_count > 0 && (
                <div>
                  <dt className="text-sm text-gray-400">Total Versions</dt>
                  <dd className="text-white">{pkg.version_count}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🔗 Links</h2>
            <dl className="space-y-3">
              {pkg.repository_url && (
                <div>
                  <dt className="text-sm text-gray-400">Repository</dt>
                  <dd>
                    <a
                      href={pkg.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-prpm-accent hover:text-prpm-accent-light break-all"
                    >
                      {pkg.repository_url}
                    </a>
                  </dd>
                </div>
              )}
              {pkg.homepage_url && (
                <div>
                  <dt className="text-sm text-gray-400">Homepage</dt>
                  <dd>
                    <a
                      href={pkg.homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-prpm-accent hover:text-prpm-accent-light break-all"
                    >
                      {pkg.homepage_url}
                    </a>
                  </dd>
                </div>
              )}
              {pkg.documentation_url && (
                <div>
                  <dt className="text-sm text-gray-400">Documentation</dt>
                  <dd>
                    <a
                      href={pkg.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-prpm-accent hover:text-prpm-accent-light break-all"
                    >
                      {pkg.documentation_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Version Info */}
        {pkg.latest_version && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">📋 Latest Version Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-400">Version</dt>
                <dd className="text-white font-mono text-lg">{pkg.latest_version.version}</dd>
              </div>
              {pkg.latest_version.published_at && (
                <div>
                  <dt className="text-sm text-gray-400">Published</dt>
                  <dd className="text-white">
                    {new Date(pkg.latest_version.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
              )}
              {pkg.latest_version.file_size && (
                <div>
                  <dt className="text-sm text-gray-400">Package Size</dt>
                  <dd className="text-white">{(pkg.latest_version.file_size / 1024).toFixed(2)} KB</dd>
                </div>
              )}
              {pkg.latest_version.downloads > 0 && (
                <div>
                  <dt className="text-sm text-gray-400">Version Downloads</dt>
                  <dd className="text-white">{pkg.latest_version.downloads.toLocaleString()}</dd>
                </div>
              )}
            </dl>
            {pkg.latest_version.changelog && (
              <div className="mt-4 pt-4 border-t border-prpm-border">
                <dt className="text-sm text-gray-400 mb-2">Changelog</dt>
                <dd className="text-white whitespace-pre-wrap text-sm">{pkg.latest_version.changelog}</dd>
              </div>
            )}
          </div>
        )}

        {/* Ratings */}
        {pkg.rating_count > 0 && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">⭐ User Ratings</h2>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-prpm-accent">
                {pkg.rating_average?.toFixed(1) || 'N/A'}
              </span>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(pkg.rating_average || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-600'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-400 mt-1">{pkg.rating_count} {pkg.rating_count === 1 ? 'rating' : 'ratings'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {pkg.tags && pkg.tags.length > 0 && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">🏷️ Tags</h2>
            <div className="flex flex-wrap gap-2">
              {pkg.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?tags=${tag}`}
                  className="px-3 py-1 bg-prpm-dark border border-prpm-border rounded-full text-sm text-gray-300 hover:border-prpm-accent hover:text-white transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Explore More */}
        <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">🔍 Explore More</h2>
          <div className="space-y-2">
            <Link
              href={`/search?format=${pkg.format}`}
              className="block text-prpm-accent hover:text-prpm-accent-light"
            >
              More {pkg.format} packages →
            </Link>
            <Link
              href={`/search?subtype=${pkg.subtype}`}
              className="block text-prpm-accent hover:text-prpm-accent-light"
            >
              More {pkg.subtype} packages →
            </Link>
            {pkg.category && (
              <Link
                href={`/search?category=${pkg.category}`}
                className="block text-prpm-accent hover:text-prpm-accent-light"
              >
                More {pkg.category} packages →
              </Link>
            )}
          </div>
        </div>

        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareSourceCode',
              name: pkg.name,
              description: pkg.description,
              author: {
                '@type': 'Person',
                name: (pkg.author as any)?.username || 'Unknown'
              },
              license: pkg.license,
              downloadUrl: pkg.repository_url,
              codeRepository: pkg.repository_url,
              programmingLanguage: pkg.format,
              keywords: pkg.tags?.join(', '),
              aggregateRating: pkg.rating_count > 0 ? {
                '@type': 'AggregateRating',
                ratingValue: pkg.rating_average,
                ratingCount: pkg.rating_count
              } : undefined
            })
          }}
        />
      </div>
    </main>
  )
}
