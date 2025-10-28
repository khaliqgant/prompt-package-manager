import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Collection } from '@pr-pm/types'

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || process.env.REGISTRY_URL || 'https://registry.prpm.dev'
const S3_SEO_DATA_URL = process.env.NEXT_PUBLIC_S3_SEO_DATA_URL || 'https://prpm-prod-packages.s3.amazonaws.com/seo-data'

// Allow dynamic rendering for params not in generateStaticParams
export const dynamicParams = true

// Generate static params for all collections
export async function generateStaticParams() {
  // During CI, return mock data to test static generation without hitting API
  if (process.env.CI === 'true' || process.env.SKIP_SSG === 'true') {
    console.log('[SSG Collections] Using mock data for CI build')
    return [
      { slug: 'test-collection' },
      { slug: 'another-collection' },
    ]
  }

  try {
    console.log(`[SSG Collections] Starting - S3_SEO_DATA_URL: ${S3_SEO_DATA_URL}`)

    // Fetch collection data from S3 (uploaded by Lambda)
    const url = `${S3_SEO_DATA_URL}/collections.json`
    console.log(`[SSG Collections] Fetching from S3: ${url}`)

    const res = await fetch(url, {
      next: { revalidate: 3600 } // Revalidate every hour
    })

    if (!res.ok) {
      console.error(`[SSG Collections] HTTP ${res.status}: Failed to fetch collections from S3`)
      console.error(`[SSG Collections] Response headers:`, Object.fromEntries(res.headers.entries()))
      return []
    }

    const collections = await res.json()
    console.log(`[SSG Collections] Received ${collections.length} collections from S3`)

    if (!Array.isArray(collections)) {
      console.error('[SSG Collections] Invalid response format - expected array')
      return []
    }

    // Map to slug params
    const params = collections.map((collection: any) => ({
      slug: encodeURIComponent(collection.name_slug),
    }))

    console.log(`[SSG Collections] ✅ Complete: ${params.length} collections for static generation`)
    return params

  } catch (outerError) {
    // Catch any unexpected errors and log them
    console.error('[SSG Collections] CRITICAL ERROR in generateStaticParams:', outerError)
    console.error('[SSG Collections] Error stack:', outerError instanceof Error ? outerError.stack : undefined)

    // Return empty array to prevent build failure
    console.log('[SSG Collections] Returning empty array due to error')
    return []
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const decodedSlug = decodeURIComponent(params.slug)
  const collection = await getCollection(decodedSlug)

  if (!collection) {
    return {
      title: 'Collection Not Found',
      description: 'The requested collection could not be found.',
    }
  }

  return {
    title: `${collection.name_slug} - PRPM Collection`,
    description: collection.description || `Install ${collection.name_slug} collection with PRPM - curated package collection`,
    keywords: [...(collection.tags || []), collection.category, collection.framework, 'prpm', 'collection', 'ai', 'coding'].filter((k): k is string => Boolean(k)),
    openGraph: {
      title: collection.name_slug,
      description: collection.description || 'Curated package collection',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: collection.name_slug,
      description: collection.description || 'Curated package collection',
    },
  }
}

async function getCollection(slug: string): Promise<Collection | null> {
  try {
    // Fetch collections data from S3
    const url = `${S3_SEO_DATA_URL}/collections.json`
    const res = await fetch(url, {
      next: { revalidate: 3600 } // Revalidate every hour
    })

    if (!res.ok) {
      console.error(`Error fetching collections from S3: ${res.status}`)
      return null
    }

    const collections = await res.json()

    if (!Array.isArray(collections)) {
      console.error('Invalid collections data format from S3')
      return null
    }

    // Find the collection by slug
    const collection = collections.find((c: any) => c.name_slug === slug)
    return collection || null
  } catch (error) {
    console.error('Error fetching collection:', error)
    return null
  }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const decodedSlug = decodeURIComponent(params.slug)
  const collection = await getCollection(decodedSlug)

  if (!collection) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-prpm-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-prpm-accent">Home</Link>
          {' / '}
          <Link href="/search?tab=collections" className="hover:text-prpm-accent">Collections</Link>
          {' / '}
          <span className="text-white">{collection.name_slug}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-white">{collection.name_slug}</h1>
            {collection.verified && (
              <svg className="w-8 h-8 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {collection.official && (
              <span className="px-3 py-1 bg-prpm-accent/20 text-prpm-accent text-sm rounded-full">
                Official
              </span>
            )}
          </div>

          {collection.description && (
            <p className="text-xl text-gray-300 mb-4">{collection.description}</p>
          )}

          {/* Install Command */}
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 mb-6">
            <code className="text-prpm-accent-light text-lg">prpm install {collection.name_slug}</code>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{collection.package_count} packages</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span>{collection.downloads.toLocaleString()} installs</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span>{collection.stars} stars</span>
            </div>
            {collection.author && (
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <Link href={`/authors?author=${collection.author}`} className="hover:text-prpm-accent">
                  @{collection.author}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Packages in Collection */}
        {collection.packages && collection.packages.length > 0 && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">📦 Packages ({collection.packages.length})</h2>
            <div className="space-y-3">
              {collection.packages
                .sort((a, b) => (a.installOrder || 999) - (b.installOrder || 999))
                .map((pkg, index) => (
                <div
                  key={pkg.packageId}
                  className="bg-prpm-dark border border-prpm-border rounded-lg p-4 hover:border-prpm-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-500 text-sm font-mono">#{index + 1}</span>
                        <h3 className="text-lg font-semibold text-white">
                          {(pkg as any).package?.name || pkg.packageId}
                        </h3>
                        {pkg.required && (
                          <span className="px-2 py-0.5 bg-prpm-accent/20 text-prpm-accent text-xs rounded-full">
                            Required
                          </span>
                        )}
                        {!pkg.required && (
                          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                            Optional
                          </span>
                        )}
                      </div>
                      {(pkg as any).package?.description && (
                        <p className="text-gray-400 text-sm mb-2">{(pkg as any).package.description}</p>
                      )}
                      {pkg.reason && (
                        <p className="text-gray-500 text-sm italic">
                          <span className="font-semibold">Why included:</span> {pkg.reason}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>Version: {pkg.version || 'latest'}</span>
                        {pkg.formatOverride && (
                          <span className="px-2 py-0.5 bg-prpm-dark border border-prpm-border rounded">
                            Format: {pkg.formatOverride}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Collection Info</h2>
            <dl className="space-y-3">
              {collection.scope && (
                <div>
                  <dt className="text-sm text-gray-400">Scope</dt>
                  <dd className="text-white font-mono">{collection.scope}</dd>
                </div>
              )}
              {collection.category && (
                <div>
                  <dt className="text-sm text-gray-400">Category</dt>
                  <dd className="text-white">{collection.category}</dd>
                </div>
              )}
              {collection.framework && (
                <div>
                  <dt className="text-sm text-gray-400">Framework</dt>
                  <dd className="text-white">{collection.framework}</dd>
                </div>
              )}
              {collection.version && (
                <div>
                  <dt className="text-sm text-gray-400">Version</dt>
                  <dd className="text-white font-mono">{collection.version}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Links</h2>
            <dl className="space-y-3">
              {(collection as any).repository_url && (
                <div>
                  <dt className="text-sm text-gray-400">Repository</dt>
                  <dd>
                    <a
                      href={(collection as any).repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-prpm-accent hover:text-prpm-accent-light break-all"
                    >
                      {(collection as any).repository_url}
                    </a>
                  </dd>
                </div>
              )}
              {(collection as any).homepage_url && (
                <div>
                  <dt className="text-sm text-gray-400">Homepage</dt>
                  <dd>
                    <a
                      href={(collection as any).homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-prpm-accent hover:text-prpm-accent-light break-all"
                    >
                      {(collection as any).homepage_url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Tags */}
        {collection.tags && collection.tags.length > 0 && (
          <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {collection.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?tab=collections&tags=${tag}`}
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
          <h2 className="text-xl font-semibold text-white mb-4">Explore More</h2>
          <div className="space-y-2">
            {collection.category && (
              <Link
                href={`/search?tab=collections&category=${collection.category}`}
                className="block text-prpm-accent hover:text-prpm-accent-light"
              >
                More {collection.category} collections →
              </Link>
            )}
            {collection.framework && (
              <Link
                href={`/search?tab=collections&framework=${collection.framework}`}
                className="block text-prpm-accent hover:text-prpm-accent-light"
              >
                More {collection.framework} collections →
              </Link>
            )}
            <Link
              href="/search?tab=collections"
              className="block text-prpm-accent hover:text-prpm-accent-light"
            >
              Browse all collections →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
