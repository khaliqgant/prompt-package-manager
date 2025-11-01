'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  getTopAuthors,
  getAuthorProfile,
  getAuthorUnclaimedPackages,
  getAuthorDashboard,
  getAuthorPackages,
  getCurrentUser,
  type Author,
} from '@/lib/api'
import PackageModal from '@/components/PackageModal'

interface AuthorStats {
  total_packages: number
  total_downloads: number
  average_rating: number | null
  total_ratings: number
}

interface Package {
  id: string
  name: string
  description: string
  format: string
  subtype: string
  visibility: string
  total_downloads: number
  weekly_downloads: number
  monthly_downloads: number
  rating_average: number | null
  rating_count: number
  created_at: string
  updated_at: string
  tags: string[]
  license?: string
  license_url?: string
  license_text?: string
  snippet?: string
  repository_url?: string
  author_username?: string
}

interface AuthorData {
  author: {
    username: string
    verified: boolean
    github_username: string | null
    avatar_url?: string | null
    website?: string | null
    joined: string
    has_claimed_account: boolean
  }
  stats: AuthorStats
  packages: Package[]
  pagination: {
    showing: number
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

function AuthorsPageContent() {
  const searchParams = useSearchParams()
  const username = searchParams.get('username')
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '100')

  const [authors, setAuthors] = useState<Author[]>([])
  const [authorData, setAuthorData] = useState<AuthorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (username) {
      loadAuthorProfile(username, offset, limit)
    } else {
      loadAuthors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, offset, limit])

  async function loadAuthors() {
    try {
      setLoading(true)
      setError(null)
      const data = await getTopAuthors(100)
      setAuthors(data.authors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load authors')
    } finally {
      setLoading(false)
    }
  }

  async function loadAuthorProfile(username: string, offset: number = 0, limit: number = 100) {
    try {
      setLoading(true)
      setError(null)

      // Check if user is logged in and viewing their own profile
      const token = typeof window !== 'undefined' ? localStorage.getItem('prpm_token') : null
      let currentUsername = null

      if (token) {
        try {
          const user = await getCurrentUser(token)
          currentUsername = user.username

          // If viewing own profile, load analytics dashboard
          if (user.username.toLowerCase() === username.toLowerCase()) {
            setIsOwnProfile(true)
            const [profile, dashboard, packages] = await Promise.all([
              getAuthorProfile(username, 'downloads', limit, offset, token),
              getAuthorDashboard(token),
              getAuthorPackages(token, 'downloads'),
            ])
            setAuthorData(profile)
            setDashboardData(dashboard)
          }
        } catch (err) {
          // Not logged in or token expired, continue as guest
          console.error('Auth check failed:', err)
        }
      }

      if (!isOwnProfile) {
        // Load public profile (with token if available to show private packages)
        const profile = await getAuthorProfile(username, 'downloads', limit, offset, token || undefined)
        setAuthorData(profile)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-prpm-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent mb-4"></div>
          <p className="text-gray-400">{username ? 'Loading profile...' : 'Loading top authors...'}</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-prpm-dark flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold text-white mb-4">{username ? 'Author Not Found' : 'Error'}</h1>
          <p className="text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/authors"
            className="inline-block px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all"
          >
            Browse Authors
          </Link>
        </div>
      </main>
    )
  }

  // Show author profile view
  if (username && authorData) {
    const { author, stats, packages } = authorData

    return (
      <main className="min-h-screen bg-prpm-dark">
        {/* Header */}
        <div className="bg-prpm-dark-card border-b border-prpm-border">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <Link href="/authors" className="text-prpm-accent hover:bg-prpm-accent-light mb-4 inline-block">
              ← Back to Authors
            </Link>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-prpm-accent/20 border-2 border-prpm-accent flex items-center justify-center overflow-hidden">
                  {author.avatar_url ? (
                    <img
                      src={author.avatar_url}
                      alt={`${author.username}'s avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {author.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-white">{author.username}</h1>
                    {author.verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-prpm-accent/20 border border-prpm-accent/30 rounded-full text-prpm-accent text-sm font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {author.github_username && (
                      <a
                        href={`https://github.com/${author.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-prpm-accent transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                        @{author.github_username}
                      </a>
                    )}

                    {author.website && (
                      <a
                        href={author.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-prpm-accent transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}

                    <p className="text-gray-400 text-sm">
                      Joined {new Date(author.joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="px-4 py-2 bg-prpm-dark border border-prpm-border hover:border-prpm-accent text-white rounded-lg font-semibold transition-all text-sm"
                >
                  {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                </button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Packages</div>
                <div className="text-2xl font-bold text-white">{stats.total_packages}</div>
              </div>
              <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Downloads</div>
                <div className="text-2xl font-bold text-white">{stats.total_downloads.toLocaleString()}</div>
              </div>
              {stats.average_rating !== null && (
                <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Average Rating</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-1">
                    {stats.average_rating.toFixed(1)}
                    <span className="text-yellow-400 text-lg">★</span>
                  </div>
                </div>
              )}
              {stats.total_ratings > 0 && (
                <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-1">Total Ratings</div>
                  <div className="text-2xl font-bold text-white">{stats.total_ratings}</div>
                </div>
              )}
            </div>

            {/* Analytics Dashboard for Own Profile */}
            {isOwnProfile && showAnalytics && dashboardData && dashboardData.summary && (
              <div className="mt-8 p-6 bg-prpm-dark border border-prpm-border rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">📊 Your Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Downloads Today</div>
                    <div className="text-xl font-bold text-prpm-accent">{dashboardData.summary.downloads_today || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Downloads This Week</div>
                    <div className="text-xl font-bold text-prpm-accent">{dashboardData.summary.downloads_week || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Downloads This Month</div>
                    <div className="text-xl font-bold text-prpm-accent">{dashboardData.summary.downloads_month || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Total Views</div>
                    <div className="text-xl font-bold text-prpm-accent">{dashboardData.summary.total_views || 0}</div>
                  </div>
                </div>
                {dashboardData.most_popular && dashboardData.most_popular.downloads !== undefined && (
                  <div className="mt-4 p-4 bg-prpm-dark-card border border-prpm-border rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Most Popular Package</div>
                    <div className="text-lg font-semibold text-white">{dashboardData.most_popular.package_name}</div>
                    <div className="text-sm text-gray-400">{(dashboardData.most_popular.downloads || 0).toLocaleString()} downloads</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Unclaimed Packages Banner (for authors without GitHub connection) */}
        {!author.has_claimed_account && (
          <div className="bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border-b border-prpm-accent/30">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📦</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Are you {author.username}?
                  </h2>
                  <p className="text-gray-300 mb-4">
                    We found {authorData.pagination.total} package{authorData.pagination.total !== 1 ? 's' : ''} under your name.
                    Connect your GitHub account to claim ownership and unlock analytics!
                  </p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all"
                  >
                    Connect GitHub & Claim Packages
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Packages List */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              Packages ({authorData.pagination.showing} of {authorData.pagination.total})
            </h2>
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-400">No packages published yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPackage(pkg)
                    setShowPackageModal(true)
                  }}
                  className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-all group text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-prpm-accent transition-colors">
                      {pkg.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-prpm-dark border border-prpm-border rounded text-gray-400 text-xs">
                        {pkg.format}
                      </span>
                      {pkg.visibility === 'private' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 border border-gray-500/30 text-gray-400">
                          🔒
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {pkg.description || 'No description'}
                  </p>

                  {pkg.license && (
                    <div className="mb-3">
                      <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs">
                        {pkg.license}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>⬇️</span>
                      <span>{pkg.total_downloads.toLocaleString()}</span>
                    </div>
                    {pkg.rating_average !== null && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">★</span>
                        <span>{pkg.rating_average.toFixed(1)}</span>
                        <span className="text-gray-600">({pkg.rating_count})</span>
                      </div>
                    )}
                  </div>

                  {pkg.tags && pkg.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {pkg.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-prpm-dark border border-prpm-border rounded text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {authorData.pagination.total > authorData.pagination.limit && (
            <div className="mt-8 space-y-4">
              {/* Main Navigation */}
              <div className="flex items-center justify-center gap-4">
                {/* Previous Button */}
                <button
                  onClick={() => {
                    const newOffset = Math.max(0, authorData.pagination.offset - authorData.pagination.limit)
                    window.location.href = `?username=${username}&offset=${newOffset}`
                  }}
                  disabled={authorData.pagination.offset === 0}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    authorData.pagination.offset === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-prpm-accent text-white hover:bg-prpm-accent/90'
                  }`}
                >
                  ← Previous
                </button>

                {/* Page Info */}
                <div className="text-gray-400 text-center">
                  <div className="text-sm">
                    Page <span className="font-semibold text-white">{Math.floor(authorData.pagination.offset / authorData.pagination.limit) + 1}</span> of{' '}
                    <span className="font-semibold text-white">{Math.ceil(authorData.pagination.total / authorData.pagination.limit)}</span>
                  </div>
                  <div className="text-xs mt-1">
                    Showing <span className="font-semibold text-white">{authorData.pagination.offset + 1}-{authorData.pagination.offset + authorData.pagination.showing}</span> of{' '}
                    <span className="font-semibold text-white">{authorData.pagination.total}</span> packages
                  </div>
                </div>

                {/* Next Button */}
                <button
                  onClick={() => {
                    const newOffset = authorData.pagination.offset + authorData.pagination.limit
                    window.location.href = `?username=${username}&offset=${newOffset}`
                  }}
                  disabled={!authorData.pagination.hasMore}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    !authorData.pagination.hasMore
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-prpm-accent text-white hover:bg-prpm-accent/90'
                  }`}
                >
                  Next →
                </button>
              </div>

              {/* Quick Jump to First/Last */}
              <div className="flex items-center justify-center gap-2 text-sm">
                {authorData.pagination.offset > 0 && (
                  <button
                    onClick={() => {
                      window.location.href = `?username=${username}&offset=0`
                    }}
                    className="text-prpm-accent hover:text-prpm-accent-light transition-colors"
                  >
                    « First Page
                  </button>
                )}
                {authorData.pagination.offset > 0 && authorData.pagination.hasMore && (
                  <span className="text-gray-600">|</span>
                )}
                {authorData.pagination.hasMore && (
                  <button
                    onClick={() => {
                      const lastPageOffset = Math.floor((authorData.pagination.total - 1) / authorData.pagination.limit) * authorData.pagination.limit
                      window.location.href = `?username=${username}&offset=${lastPageOffset}`
                    }}
                    className="text-prpm-accent hover:text-prpm-accent-light transition-colors"
                  >
                    Last Page »
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Package Modal */}
        {selectedPackage && (
          <PackageModal
            package={selectedPackage}
            isOpen={showPackageModal}
            onClose={() => setShowPackageModal(false)}
          />
        )}
      </main>
    )
  }

  // Show authors list view
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-prpm-green hover:text-prpm-green-dark mb-6 inline-block">
            ← Back to home
          </Link>

          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-prpm-green to-prpm-green-dark bg-clip-text text-transparent">
              Top Authors
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              The amazing contributors making PRPM possible
            </p>
            <div className="inline-flex items-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <span className="text-3xl">👥</span>
                <span className="font-semibold">{authors.length}+ Authors</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">📦</span>
                <span className="font-semibold">
                  {authors.reduce((sum, a) => sum + a.package_count, 0).toLocaleString()} Packages
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">⬇️</span>
                <span className="font-semibold">
                  {authors.reduce((sum, a) => sum + (a.total_downloads || 0), 0).toLocaleString()} Downloads
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-prpm-green to-prpm-green-dark rounded-lg p-8 mb-12 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Want to Join the Leaderboard?</h2>
          <p className="mb-4 text-purple-100">
            Contribute packages to PRPM
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-prpm-green rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Sign in with GitHub
          </Link>
        </div>

        {/* Leaderboard */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:block bg-gradient-to-r from-prpm-green to-prpm-green-dark text-white px-6 py-4">
            <div className="grid grid-cols-12 gap-4 font-semibold">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Author</div>
              <div className="col-span-2 text-center">Packages</div>
              <div className="col-span-3 text-center">Downloads</div>
              <div className="col-span-2 text-center">Status</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {authors.map((author, index) => (
              <Link
                key={author.author}
                href={`/authors?username=${author.author}`}
                className={`px-4 md:px-6 py-4 hover:bg-prpm-green/5 dark:hover:bg-prpm-green/10 transition-colors block ${
                  index < 3 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                }`}
              >
                {/* Desktop Table Layout */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  {/* Rank */}
                  <div className="col-span-1 text-center">
                    {index === 0 && <span className="text-3xl">🥇</span>}
                    {index === 1 && <span className="text-3xl">🥈</span>}
                    {index === 2 && <span className="text-3xl">🥉</span>}
                    {index > 2 && (
                      <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Author */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👤</span>
                      <div>
                        <div className="font-semibold text-lg">@{author.author}</div>
                        {author.latest_package && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Latest: {author.latest_package}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Package Count */}
                  <div className="col-span-2 text-center">
                    <div className="text-2xl font-bold text-prpm-green">
                      {author.package_count}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-400">packages</div>
                  </div>

                  {/* Downloads */}
                  <div className="col-span-3 text-center">
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      {(author.total_downloads || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-400">total downloads</div>
                  </div>

                  {/* Verified Status */}
                  <div className="col-span-2 text-center">
                    {author.verified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                        <span>✓</span>
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                        <span>Unclaimed</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && <span className="text-xl font-semibold text-gray-600 dark:text-gray-400">#{index + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">👤</span>
                        <div className="font-semibold text-lg">@{author.author}</div>
                        {author.verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                            Unclaimed
                          </span>
                        )}
                      </div>
                      {author.latest_package && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Latest: {author.latest_package}
                        </div>
                      )}
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="font-bold text-prpm-green">{author.package_count}</span>
                          <span className="text-gray-500 dark:text-gray-400"> packages</span>
                        </div>
                        <div>
                          <span className="font-semibold">{(author.total_downloads || 0).toLocaleString()}</span>
                          <span className="text-gray-500 dark:text-gray-400"> downloads</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Missing from the list? Contribute your packages today!
          </p>
        </div>
      </div>
    </main>
  )
}

export default function AuthorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-prpm-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading authors...</p>
        </div>
      </div>
    }>
      <AuthorsPageContent />
    </Suspense>
  )
}
