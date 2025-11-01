'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUnclaimedPackages, claimPackages } from '@/lib/api'

interface User {
  id: string
  username: string
  email: string
  avatar_url?: string
  website?: string
  verified_author: boolean
  is_admin: boolean
  package_count?: number
  total_downloads?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unclaimedCount, setUnclaimedCount] = useState<number>(0)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [showTweetModal, setShowTweetModal] = useState(false)
  const [isEditingWebsite, setIsEditingWebsite] = useState(false)
  const [websiteInput, setWebsiteInput] = useState('')
  const [websiteError, setWebsiteError] = useState<string | null>(null)
  const [websiteSaving, setWebsiteSaving] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('prpm_token')
    const username = localStorage.getItem('prpm_username')

    if (!token || !username) {
      // Not logged in, redirect to login
      router.push('/login')
      return
    }

    // Fetch user info
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3111'}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user info')
        }

        const userData = await response.json()
        setUser(userData)

        // Check if this is first login (show tweet modal)
        const hasSeenTweetPrompt = localStorage.getItem('prpm_seen_tweet_prompt')
        if (!hasSeenTweetPrompt) {
          setShowTweetModal(true)
          localStorage.setItem('prpm_seen_tweet_prompt', 'true')
        }

        // Check for unclaimed packages
        try {
          const unclaimedData = await getUnclaimedPackages(token)
          if (unclaimedData.packages && unclaimedData.packages.length > 0) {
            setUnclaimedCount(unclaimedData.packages.length)
          }
        } catch (error) {
          console.error('Error checking unclaimed packages:', error)
          // Non-fatal error, continue
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        // Token might be invalid, redirect to login
        localStorage.removeItem('prpm_token')
        localStorage.removeItem('prpm_username')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('prpm_token')
    localStorage.removeItem('prpm_username')
    router.push('/')
  }

  const handleClaimPackages = async () => {
    const token = localStorage.getItem('prpm_token')
    if (!token) return

    setClaiming(true)
    setClaimError(null)

    try {
      await claimPackages(token)
      // Refresh page to show updated package count
      window.location.reload()
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Failed to claim packages')
    } finally {
      setClaiming(false)
    }
  }

  const handleEditWebsite = () => {
    setWebsiteInput(user?.website || '')
    setIsEditingWebsite(true)
    setWebsiteError(null)
  }

  const handleCancelWebsiteEdit = () => {
    setIsEditingWebsite(false)
    setWebsiteInput('')
    setWebsiteError(null)
  }

  const handleSaveWebsite = async () => {
    const token = localStorage.getItem('prpm_token')
    if (!token) return

    setWebsiteSaving(true)
    setWebsiteError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3111'}/api/v1/auth/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ website: websiteInput.trim() || null }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update website')
      }

      const data = await response.json()
      setUser(prev => prev ? { ...prev, website: data.user.website } : null)
      setIsEditingWebsite(false)
    } catch (error) {
      setWebsiteError(error instanceof Error ? error.message : 'Failed to update website')
    } finally {
      setWebsiteSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-prpm-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <main className="min-h-screen bg-prpm-dark">
      {/* Header */}
      <header className="border-b border-prpm-border bg-prpm-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-prpm-accent to-prpm-green bg-clip-text text-transparent">
              PRPM
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">@{user.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-prpm-dark border border-prpm-border rounded-lg hover:border-prpm-accent transition-colors text-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Unclaimed Packages Banner */}
        {unclaimedCount > 0 && (
          <div className="mb-8 bg-gradient-to-r from-prpm-accent/20 to-prpm-green/20 border border-prpm-accent/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🎉</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  You have {unclaimedCount} unclaimed package{unclaimedCount !== 1 ? 's' : ''}!
                </h3>
                <p className="text-gray-300 mb-4">
                  We found {unclaimedCount} package{unclaimedCount !== 1 ? 's' : ''} published under your GitHub username @{user.username}.
                  Claim them now to link them to your account and get the verified author badge.
                </p>
                {claimError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {claimError}
                  </div>
                )}
                <button
                  onClick={handleClaimPackages}
                  disabled={claiming}
                  className="px-6 py-3 bg-prpm-accent hover:bg-prpm-accent-light text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claiming ? 'Claiming...' : `Claim ${unclaimedCount} Package${unclaimedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user.username}!
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your packages, browse the registry, and more.
          </p>
        </div>

        {/* User Info Card */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-prpm-accent flex items-center justify-center text-white text-2xl font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{user.username}</h3>
                <p className="text-gray-400 text-sm">{user.email}</p>
              </div>
            </div>

            {/* Website Section */}
            <div className="mb-4 border-t border-prpm-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Website</label>
                {!isEditingWebsite && (
                  <button
                    onClick={handleEditWebsite}
                    className="text-xs text-prpm-accent hover:text-prpm-accent-light transition-colors"
                  >
                    {user.website ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>

              {isEditingWebsite ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-prpm-dark border border-prpm-border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-prpm-accent transition-colors"
                  />
                  {websiteError && (
                    <p className="text-xs text-red-400">{websiteError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveWebsite}
                      disabled={websiteSaving}
                      className="flex-1 px-3 py-2 bg-prpm-accent hover:bg-prpm-accent-light text-white text-sm rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {websiteSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelWebsiteEdit}
                      disabled={websiteSaving}
                      className="px-3 py-2 bg-prpm-dark border border-prpm-border hover:border-prpm-accent text-gray-300 text-sm rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {user.website ? (
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-prpm-accent hover:text-prpm-accent-light transition-colors flex items-center gap-1 break-all"
                    >
                      {user.website}
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No website set</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {user.verified_author && (
                <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
                  ✓ Verified Author
                </span>
              )}
              {user.is_admin && (
                <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-xs font-medium">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Packages</h3>
            <div className="text-4xl font-bold text-prpm-accent mb-2">{user.package_count || 0}</div>
            <p className="text-gray-400 text-sm">Published packages</p>
          </div>

          <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Downloads</h3>
            <div className="text-4xl font-bold text-prpm-green mb-2">{user.total_downloads || 0}</div>
            <p className="text-gray-400 text-sm">Total downloads</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/"
              className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover:border-prpm-accent transition-all group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🔍</div>
              <h3 className="text-lg font-semibold text-white mb-2">Browse Packages</h3>
              <p className="text-gray-400 text-sm">Discover new prompts and skills</p>
            </Link>

            <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 opacity-50 cursor-not-allowed">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="text-lg font-semibold text-white mb-2">Publish Package</h3>
              <p className="text-gray-400 text-sm">Use the prpm cli</p>
            </div>

            <Link
              href="/authors"
              className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 hover:border-prpm-accent transition-all group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
              <h3 className="text-lg font-semibold text-white mb-2">Authors</h3>
              <p className="text-gray-400 text-sm">Browse package authors</p>
            </Link>

            <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-6 opacity-50 cursor-not-allowed">
              <div className="text-4xl mb-3">⚙️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Settings</h3>
              <p className="text-gray-400 text-sm">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-prpm-dark-card border border-prpm-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Getting Started with PRPM</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Install the CLI</h3>
              <code className="block bg-prpm-dark border border-prpm-border rounded-lg p-4 text-prpm-accent-light font-mono text-sm">
                npm install -g prpm
              </code>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Search for packages</h3>
              <code className="block bg-prpm-dark border border-prpm-border rounded-lg p-4 text-prpm-accent-light font-mono text-sm">
                prpm search react
              </code>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Install a package</h3>
              <code className="block bg-prpm-dark border border-prpm-border rounded-lg p-4 text-prpm-accent-light font-mono text-sm">
                prpm install @pr-pm/pulumi-troubleshooting-skill
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Tweet Encouragement Modal */}
      {showTweetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8 max-w-lg w-full relative">
            <button
              onClick={() => setShowTweetModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to PRPM!
              </h2>
              <p className="text-gray-400">
                You've successfully connected your GitHub account. Share your journey with the community!
              </p>
            </div>

            <div className="bg-prpm-dark border border-prpm-border rounded-xl p-4 mb-6">
              <p className="text-gray-300 text-sm mb-3">Ready-to-share tweet:</p>
              <p className="text-white leading-relaxed">
                Just connected my GitHub to @prpmdev 🚀
                <br /><br />
                Check out my AI prompts, agents, and coding tools at prpm.dev/@{user?.username}
                <br /><br />
                #AI #DevTools #Prompts #prpm
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just connected my GitHub to @prpmdev 🚀\n\nCheck out my AI prompts, agents, and coding tools at prpm.dev/@${user?.username}\n\n#AI #DevTools #Prompts`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                onClick={() => setShowTweetModal(false)}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
                Tweet Now
              </a>
              <button
                onClick={() => setShowTweetModal(false)}
                className="px-6 py-3 bg-prpm-dark border border-prpm-border hover:border-prpm-accent text-gray-300 rounded-lg font-semibold transition-all"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
