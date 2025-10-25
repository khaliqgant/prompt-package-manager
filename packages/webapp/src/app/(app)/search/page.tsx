'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  searchPackages,
  searchCollections,
  SearchPackagesParams,
  SearchCollectionsParams,
  Package,
  Collection,
  Format,
  Subtype,
  SortType,
} from '@/lib/api'
import PackageModal from '@/components/PackageModal'
import CollectionModal from '@/components/CollectionModal'

type TabType = 'packages' | 'collections' | 'skills' | 'slash-commands' | 'agents'

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Track initial URL params to prevent reset on mount
  const initialParams = useState(() => ({
    tab: searchParams.get('tab') as TabType || 'packages',
    query: searchParams.get('q') || '',
    format: searchParams.get('format') as Format || '',
    subtype: searchParams.get('subtype') as Subtype || '',
    category: searchParams.get('category') || '',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    sort: searchParams.get('sort') as SortType || 'downloads',
    page: Number(searchParams.get('page')) || 1,
  }))[0]

  // Initialize state from URL params
  const [activeTab, setActiveTab] = useState<TabType>(initialParams.tab)
  const [query, setQuery] = useState(initialParams.query)
  const [selectedFormat, setSelectedFormat] = useState<Format | ''>(initialParams.format)
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | ''>(initialParams.subtype)
  const [selectedCategory, setSelectedCategory] = useState(initialParams.category)
  const [selectedTags, setSelectedTags] = useState<string[]>(initialParams.tags)
  const [sort, setSort] = useState<SortType>(initialParams.sort)
  const [packages, setPackages] = useState<Package[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(initialParams.page)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)

  const limit = 20

  // Update URL when state changes
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      return
    }

    const params = new URLSearchParams()

    if (query) params.set('q', query)
    if (activeTab !== 'packages') params.set('tab', activeTab)
    if (selectedFormat) params.set('format', selectedFormat)
    if (selectedSubtype) params.set('subtype', selectedSubtype)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (sort !== 'downloads') params.set('sort', sort)
    if (page !== 1) params.set('page', String(page))

    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newUrl, { scroll: false })
  }, [activeTab, query, selectedFormat, selectedSubtype, selectedCategory, selectedTags, sort, page, router, isInitialized])

  // Fetch packages
  const fetchPackages = async () => {
    setLoading(true)
    try {
      const params: SearchPackagesParams = {
        limit,
        offset: (page - 1) * limit,
        sort,
      }

      if (query.trim()) params.q = query
      if (selectedFormat) params.format = selectedFormat
      if (selectedSubtype) params.subtype = selectedSubtype
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0) params.tags = selectedTags

      const result = await searchPackages(params)
      setPackages(result.packages)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to fetch packages:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch collections
  const fetchCollections = async () => {
    setLoading(true)
    try {
      const params: SearchCollectionsParams = {
        limit,
        offset: (page - 1) * limit,
        sortBy: sort === 'downloads' ? 'downloads' : 'created',
        sortOrder: 'desc',
      }

      if (query.trim()) params.query = query
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0 && selectedTags[0]) params.tag = selectedTags[0]

      const result = await searchCollections(params)
      setCollections(result.collections)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to fetch collections:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch skills (claude-skill type packages)
  const fetchSkills = async () => {
    setLoading(true)
    try {
      const params: SearchPackagesParams = {
        format: 'claude',
        subtype: 'skill',
        limit,
        offset: (page - 1) * limit,
        sort,
      }

      if (query.trim()) params.q = query
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0) params.tags = selectedTags

      const result = await searchPackages(params)
      setPackages(result.packages)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to fetch skills:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch slash commands (all formats)
  const fetchSlashCommands = async () => {
    setLoading(true)
    try {
      const params: SearchPackagesParams = {
        subtype: 'slash-command',
        limit,
        offset: (page - 1) * limit,
        sort,
      }

      if (query.trim()) params.q = query
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0) params.tags = selectedTags

      const result = await searchPackages(params)
      setPackages(result.packages)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to fetch slash commands:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch agents (all formats)
  const fetchAgents = async () => {
    setLoading(true)
    try {
      const params: SearchPackagesParams = {
        subtype: 'agent',
        limit,
        offset: (page - 1) * limit,
        sort,
      }

      if (query.trim()) params.q = query
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0) params.tags = selectedTags

      const result = await searchPackages(params)
      setPackages(result.packages)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load data based on active tab
  useEffect(() => {
    // Clear previous results when switching tabs to ensure fresh data loads
    setPackages([])
    setCollections([])

    if (activeTab === 'packages') {
      fetchPackages()
    } else if (activeTab === 'collections') {
      fetchCollections()
    } else if (activeTab === 'skills') {
      fetchSkills()
    } else if (activeTab === 'slash-commands') {
      fetchSlashCommands()
    } else if (activeTab === 'agents') {
      fetchAgents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, query, selectedFormat, selectedCategory, selectedTags, sort, page])

  // Reset page when filters change (but not on initial load from URL)
  useEffect(() => {
    // Don't reset on first render
    if (!isInitialized) return

    // Check if any filter actually changed from initial state
    const filtersChanged =
      query !== initialParams.query ||
      selectedFormat !== initialParams.format ||
      selectedCategory !== initialParams.category ||
      JSON.stringify(selectedTags) !== JSON.stringify(initialParams.tags) ||
      sort !== initialParams.sort ||
      activeTab !== initialParams.tab

    // Only reset page if filters changed AND we're not on the initial page
    if (filtersChanged) {
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedFormat, selectedCategory, selectedTags, sort, activeTab, isInitialized])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const clearFilters = () => {
    setSelectedFormat('')
    setSelectedCategory('')
    setSelectedTags([])
    setQuery('')
  }

  const hasFilters = selectedFormat || selectedCategory || selectedTags.length > 0 || query

  return (
    <main className="min-h-screen bg-prpm-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-prpm-accent hover:text-prpm-accent-light mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Search & Discover</h1>
          <p className="text-gray-400">
            Find packages, collections, and skills for your AI coding workflow
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packages, collections, or skills..."
              className="w-full px-6 py-4 bg-prpm-dark-card border border-prpm-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-prpm-accent transition-colors pr-12"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-prpm-accent transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-prpm-border overflow-x-auto">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'packages'
                ? 'text-prpm-accent'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Packages
            {activeTab === 'packages' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-prpm-accent"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'collections'
                ? 'text-prpm-accent'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Collections
            {activeTab === 'collections' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-prpm-accent"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'skills'
                ? 'text-prpm-accent'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Skills
            {activeTab === 'skills' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-prpm-accent"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('slash-commands')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'slash-commands'
                ? 'text-prpm-accent'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Slash Commands
            {activeTab === 'slash-commands' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-prpm-accent"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'agents'
                ? 'text-prpm-accent'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Agents
            {activeTab === 'agents' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-prpm-accent"></div>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-prpm-accent hover:text-prpm-accent-light"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Format and Subtype Filters (packages only) */}
              {activeTab === 'packages' && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Format
                    </label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value as Format | '')}
                      className="w-full px-3 py-2 bg-prpm-dark border border-prpm-border rounded text-white focus:outline-none focus:border-prpm-accent"
                    >
                      <option value="">All Formats</option>
                      <option value="cursor">Cursor</option>
                      <option value="claude">Claude</option>
                      <option value="continue">Continue</option>
                      <option value="windsurf">Windsurf</option>
                      <option value="copilot">GitHub Copilot</option>
                      <option value="kiro">Kiro</option>
                      <option value="mcp">MCP</option>
                      <option value="generic">Generic</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subtype
                    </label>
                    <select
                      value={selectedSubtype}
                      onChange={(e) => setSelectedSubtype(e.target.value as Subtype | '')}
                      className="w-full px-3 py-2 bg-prpm-dark border border-prpm-border rounded text-white focus:outline-none focus:border-prpm-accent"
                    >
                      <option value="">All Subtypes</option>
                      <option value="rule">Rule</option>
                      <option value="agent">Agent</option>
                      <option value="skill">Skill</option>
                      <option value="slash-command">Slash Command</option>
                      <option value="prompt">Prompt</option>
                      <option value="workflow">Workflow</option>
                      <option value="tool">Tool</option>
                      <option value="template">Template</option>
                      <option value="collection">Collection</option>
                    </select>
                  </div>
                </>
              )}

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="w-full px-3 py-2 bg-prpm-dark border border-prpm-border rounded text-white focus:outline-none focus:border-prpm-accent"
                >
                  <option value="downloads">Downloads</option>
                  <option value="quality">Quality Score</option>
                  <option value="rating">Highest Rated</option>
                  <option value="created">Recently Created</option>
                  <option value="updated">Recently Updated</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-prpm-dark border border-prpm-border rounded text-white focus:outline-none focus:border-prpm-accent"
                >
                  <option value="">All Categories</option>
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                  <option value="testing">Testing</option>
                  <option value="documentation">Documentation</option>
                  <option value="devops">DevOps</option>
                  <option value="security">Security</option>
                  <option value="best-practices">Best Practices</option>
                </select>
              </div>

              {/* Popular Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Popular Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {['react', 'typescript', 'nextjs', 'nodejs', 'python', 'testing'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-prpm-accent text-white'
                          : 'bg-prpm-dark border border-prpm-border text-gray-400 hover:border-prpm-accent hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-400">
                {loading ? 'Searching...' : `${total} results`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent"></div>
              </div>
            ) : (
              <>
                {/* Package Results */}
                {(activeTab === 'packages' || activeTab === 'skills' || activeTab === 'slash-commands' || activeTab === 'agents') && (
                  <div className="space-y-4">
                    {packages.length === 0 ? (
                      <div className="text-center py-20">
                        <p className="text-gray-400">No packages found</p>
                      </div>
                    ) : (
                      packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedPackage(pkg)
                            setShowPackageModal(true)
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-semibold text-white">
                                  {pkg.name}
                                </h3>
                                {pkg.verified && (
                                  <svg className="w-5 h-5 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {pkg.featured && (
                                  <span className="px-2 py-1 bg-prpm-purple/20 text-prpm-purple text-xs rounded-full">
                                    Featured
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 mb-3">{pkg.description || 'No description'}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="px-2 py-1 bg-prpm-dark border border-prpm-border rounded text-gray-400">
                                  {`${pkg.format}-${pkg.subtype}`}
                                </span>
                                {pkg.category && (
                                  <span>{pkg.category}</span>
                                )}
                                <span>{pkg.total_downloads.toLocaleString()} downloads</span>
                              </div>
                              {pkg.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {pkg.tags.slice(0, 5).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 bg-prpm-dark border border-prpm-border rounded text-xs text-gray-400"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-prpm-border">
                            <code className="text-sm text-prpm-accent-light">
                              prpm install {pkg.name}
                            </code>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Collection Results */}
                {activeTab === 'collections' && (
                  <div className="space-y-4">
                    {collections.length === 0 ? (
                      <div className="text-center py-20">
                        <p className="text-gray-400">No collections found</p>
                      </div>
                    ) : (
                      collections.map((collection) => (
                        <div
                          key={collection.id}
                          onClick={() => {
                            setSelectedCollection(collection)
                            setShowCollectionModal(true)
                          }}
                          className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-semibold text-white">
                                  {collection.name}
                                </h3>
                                {collection.verified && (
                                  <svg className="w-5 h-5 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {collection.official && (
                                  <span className="px-2 py-1 bg-prpm-accent/20 text-prpm-accent text-xs rounded-full">
                                    Official
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mb-1 font-mono">
                                {collection.name_slug}
                              </p>
                              <p className="text-gray-400 mb-3">{collection.description || 'No description'}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>by @{collection.author}</span>
                                {collection.category && (
                                  <span>{collection.category}</span>
                                )}
                                <span>{collection.package_count} packages</span>
                                <span>{collection.downloads.toLocaleString()} installs</span>
                                <span>{collection.stars} stars</span>
                              </div>
                              {collection.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {collection.tags.slice(0, 5).map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 bg-prpm-dark border border-prpm-border rounded text-xs text-gray-400"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-prpm-border">
                            <code className="text-sm text-prpm-accent-light">
                              prpm install {collection.name_slug}
                            </code>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Pagination */}
                {total > limit && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-prpm-dark-card border border-prpm-border rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-prpm-accent transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-400">
                      Page {page} of {Math.ceil(total / limit)}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / limit)}
                      className="px-4 py-2 bg-prpm-dark-card border border-prpm-border rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-prpm-accent transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Package Modal */}
        {selectedPackage && (
          <PackageModal
            package={selectedPackage}
            isOpen={showPackageModal}
            onClose={() => setShowPackageModal(false)}
          />
        )}

        {/* Collection Modal */}
        {selectedCollection && (
          <CollectionModal
            collection={selectedCollection}
            isOpen={showCollectionModal}
            onClose={() => setShowCollectionModal(false)}
          />
        )}
      </div>
    </main>
  )
}


export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-prpm-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading search...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
