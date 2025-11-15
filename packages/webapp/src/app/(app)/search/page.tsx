'use client'

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  searchPackages,
  searchCollections,
  aiSearch,
  getQuerySuggestions,
  SearchPackagesParams,
  SearchCollectionsParams,
  Package,
  Collection,
  Format,
  Subtype,
  SortType,
  AISearchResult,
  getStarredPackages,
  getStarredCollections,
  starPackage,
  starCollection,
} from '@/lib/api'
import { getPackageUrl } from '@/lib/package-url'
import { AISearchToggle } from '@/components/AISearchToggle'
import { AISearchResults } from '@/components/AISearchResults'
import { useAuth } from '@/components/AuthProvider'

type TabType = 'packages' | 'collections' | 'skills' | 'slash-commands' | 'agents'

// Define which subtypes are available for each format
const FORMAT_SUBTYPES: Record<Format, Subtype[]> = {
  'cursor': ['rule', 'agent', 'slash-command', 'tool'],
  'claude': ['skill', 'agent', 'slash-command', 'tool', 'hook'],
  'continue': ['rule', 'agent', 'slash-command', 'tool'],
  'windsurf': ['rule', 'agent', 'slash-command', 'tool'],
  'copilot': ['tool', 'chatmode'],
  'kiro': ['rule', 'agent', 'tool', 'hook'],
  'mcp': ['tool'],
  'agents.md': ['agent', 'tool'],
  'generic': ['rule', 'agent', 'skill', 'slash-command', 'tool', 'chatmode', 'hook'],
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, jwtToken } = useAuth()

  // Track initial URL params to prevent reset on mount
  const initialParams = useState(() => ({
    tab: searchParams.get('tab') as TabType || 'packages',
    query: searchParams.get('q') || '',
    format: searchParams.get('format') as Format || '',
    subtype: searchParams.get('subtype') as Subtype || '',
    category: searchParams.get('category') || '',
    author: searchParams.get('author') || '',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    sort: searchParams.get('sort') as SortType || 'downloads',
    page: Number(searchParams.get('page')) || 1,
    starredOnly: searchParams.get('starred') === 'true',
  }))[0]

  // Initialize state from URL params
  const [activeTab, setActiveTab] = useState<TabType>(initialParams.tab)
  const [query, setQuery] = useState(initialParams.query)
  const [debouncedQuery, setDebouncedQuery] = useState(initialParams.query)
  const [selectedFormat, setSelectedFormat] = useState<Format | ''>(initialParams.format)
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | ''>(initialParams.subtype)
  const [selectedCategory, setSelectedCategory] = useState(initialParams.category)
  const [selectedAuthor, setSelectedAuthor] = useState(initialParams.author)
  const [selectedTags, setSelectedTags] = useState<string[]>(initialParams.tags)
  const [sort, setSort] = useState<SortType>(initialParams.sort)
  const [starredOnly, setStarredOnly] = useState(initialParams.starredOnly)
  const [packages, setPackages] = useState<Package[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(initialParams.page)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())

  // AI Search state - load from localStorage
  const [aiSearchEnabled, setAiSearchEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiSearchEnabled') === 'true'
    }
    return false
  })
  const [aiResults, setAiResults] = useState<AISearchResult[]>([])
  const [aiExecutionTime, setAiExecutionTime] = useState(0)

  // Query suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout>()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const limit = 20

  // Save AI search toggle to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiSearchEnabled', String(aiSearchEnabled))
    }
  }, [aiSearchEnabled])

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500) // 500ms debounce for search

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  // Debounced function to fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    try {
      const results = await getQuerySuggestions(searchQuery, 5)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  // Handle query input with debouncing
  const handleQueryChange = (value: string) => {
    setQuery(value)
    setSelectedSuggestionIndex(-1)

    // Clear existing timeout
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current)
    }

    // Debounce suggestions fetch
    if (value.length >= 3) {
      suggestionsTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value)
      }, 300) // 300ms debounce
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault()
      const selectedSuggestion = suggestions[selectedSuggestionIndex]
      setQuery(selectedSuggestion)
      setShowSuggestions(false)
      setPage(1)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    setPage(1)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get available subtypes for the selected format
  const availableSubtypes = useMemo<Subtype[]>(() =>
    selectedFormat
      ? FORMAT_SUBTYPES[selectedFormat] || []
      : ['rule', 'agent', 'skill', 'slash-command', 'tool', 'chatmode', 'hook'],
    [selectedFormat]
  )

  // Reset subtype when format changes and current subtype is not available
  useEffect(() => {
    if (selectedFormat && selectedSubtype && !availableSubtypes.includes(selectedSubtype)) {
      setSelectedSubtype('')
    }
  }, [selectedFormat, selectedSubtype, availableSubtypes])

  // Fetch starred IDs from localStorage + API on mount
  useEffect(() => {
    const fetchStarredIds = async () => {
      const ids = new Set<string>()

      // Get from localStorage (anonymous + logged-in users)
      try {
        const localPackages = localStorage.getItem('prpm_starred_packages')
        const localCollections = localStorage.getItem('prpm_starred_collections')

        if (localPackages) {
          const packageIds: string[] = JSON.parse(localPackages)
          packageIds.forEach(id => ids.add(id))
        }

        if (localCollections) {
          const collectionIds: string[] = JSON.parse(localCollections)
          collectionIds.forEach(id => ids.add(id))
        }
      } catch (err) {
        console.error('Failed to load localStorage stars:', err)
      }

      // Get from API (logged-in users only)
      const token = localStorage.getItem('prpm_token')
      if (token) {
        try {
          const [packagesData, collectionsData] = await Promise.all([
            getStarredPackages(token, 100, 0),
            getStarredCollections(token, 100, 0),
          ])

          packagesData.packages.forEach(pkg => ids.add(pkg.id))
          collectionsData.collections.forEach(coll => ids.add(`${coll.scope}/${coll.name_slug}`))
        } catch (err) {
          console.error('Failed to fetch starred from API:', err)
        }
      }

      setStarredIds(ids)
    }

    fetchStarredIds()
  }, [])

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
    if (selectedAuthor) params.set('author', selectedAuthor)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (sort !== 'downloads') params.set('sort', sort)
    if (page !== 1) params.set('page', String(page))
    if (starredOnly) params.set('starred', 'true')

    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newUrl, { scroll: false })
  }, [activeTab, query, selectedFormat, selectedSubtype, selectedCategory, selectedAuthor, selectedTags, sort, page, starredOnly, router, isInitialized])

  // Fetch packages
  const fetchPackages = async () => {
    setLoading(true)
    try {
      // When filtering by starred, load from SSG data to avoid API limits
      if (starredOnly) {
        const response = await fetch('/seo-data/packages.json')
        const allPackages: Package[] = await response.json()

        // Filter by starred IDs
        let filteredPackages = allPackages.filter(pkg => starredIds.has(pkg.id))

        // Apply other filters client-side
        if (debouncedQuery.trim()) {
          const searchLower = debouncedQuery.toLowerCase()
          filteredPackages = filteredPackages.filter(
            pkg =>
              pkg.name.toLowerCase().includes(searchLower) ||
              pkg.description?.toLowerCase().includes(searchLower)
          )
        }
        if (selectedFormat) {
          filteredPackages = filteredPackages.filter(pkg => pkg.format === selectedFormat)
        }
        if (selectedSubtype) {
          filteredPackages = filteredPackages.filter(pkg => (pkg as any).subtype === selectedSubtype)
        }
        if (selectedCategory) {
          filteredPackages = filteredPackages.filter(pkg => (pkg as any).category === selectedCategory)
        }
        if (selectedTags.length > 0) {
          filteredPackages = filteredPackages.filter(pkg =>
            selectedTags.every(tag => (pkg as any).tags?.includes(tag))
          )
        }
        if (selectedAuthor) {
          filteredPackages = filteredPackages.filter(pkg => pkg.name.startsWith(`@${selectedAuthor}/`))
        }

        // Sort client-side
        if (sort === 'downloads') {
          filteredPackages.sort((a, b) => ((b as any).total_downloads || 0) - ((a as any).total_downloads || 0))
        } else {
          // 'recent' or other - assume already sorted by creation date in SSG data
        }

        const totalFiltered = filteredPackages.length

        // Paginate client-side
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        filteredPackages = filteredPackages.slice(startIndex, endIndex)

        setPackages(filteredPackages)
        setTotal(totalFiltered)
      } else {
        // Normal API fetch when not filtering by starred
        const params: SearchPackagesParams = {
          limit,
          offset: (page - 1) * limit,
          sort,
        }

        if (debouncedQuery.trim()) params.q = debouncedQuery
        if (selectedFormat) params.format = selectedFormat
        if (selectedSubtype) params.subtype = selectedSubtype
        if (selectedCategory) params.category = selectedCategory
        if (selectedTags.length > 0) params.tags = selectedTags
        if (selectedAuthor) params.author = selectedAuthor

        const result = await searchPackages(params)
        setPackages(result.packages)
        setTotal(result.total)
      }
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
      // When filtering by starred, load from SSG data to avoid API limits
      if (starredOnly) {
        const response = await fetch('/seo-data/collections.json')
        const allCollections: Collection[] = await response.json()

        // Filter by starred IDs
        let filteredCollections = allCollections.filter(coll =>
          starredIds.has(`${coll.scope}/${coll.name_slug}`)
        )

        // Apply other filters client-side
        if (query.trim()) {
          const searchLower = query.toLowerCase()
          filteredCollections = filteredCollections.filter(
            coll =>
              coll.name_slug.toLowerCase().includes(searchLower) ||
              coll.description?.toLowerCase().includes(searchLower)
          )
        }
        if (selectedCategory) {
          filteredCollections = filteredCollections.filter(coll => (coll as any).category === selectedCategory)
        }
        if (selectedTags.length > 0 && selectedTags[0]) {
          filteredCollections = filteredCollections.filter(coll =>
            (coll as any).tags?.includes(selectedTags[0])
          )
        }

        // Sort client-side
        if (sort === 'downloads') {
          filteredCollections.sort((a, b) => ((b as any).total_downloads || 0) - ((a as any).total_downloads || 0))
        } else {
          // 'recent' - assume already sorted by creation date in SSG data
        }

        const totalFiltered = filteredCollections.length

        // Paginate client-side
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        filteredCollections = filteredCollections.slice(startIndex, endIndex)

        setCollections(filteredCollections)
        setTotal(totalFiltered)
      } else {
        // Normal API fetch when not filtering by starred
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
      }
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

  // AI Search (PRPM+ Feature)
  const performAISearch = async () => {
    if (!debouncedQuery.trim() || !jwtToken) {
      return
    }

    setLoading(true)
    try {
      const result = await aiSearch({
        query: debouncedQuery,
        filters: {
          format: selectedFormat || undefined,
          subtype: selectedSubtype || undefined,
          language: undefined,
          framework: undefined,
          min_quality: undefined
        },
        limit: 20
      }, jwtToken)

      setAiResults(result.results)
      setAiExecutionTime(result.execution_time_ms)
      setTotal(result.total_matches)
    } catch (error: any) {
      console.error('AI search failed:', error)
      // If AI search fails, fall back to traditional search
      setAiSearchEnabled(false)
      fetchPackages()
    } finally {
      setLoading(false)
    }
  }

  // Load data based on active tab
  useEffect(() => {
    // Clear previous results when switching tabs to ensure fresh data loads
    setPackages([])
    setCollections([])
    setAiResults([])

    // Use AI search if enabled and on packages tab (always, not just when query exists)
    if (aiSearchEnabled && activeTab === 'packages') {
      // Only perform AI search if there's a query, otherwise show empty state
      if (debouncedQuery.trim()) {
        performAISearch()
      }
      return // Don't fall back to regular search
    }

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
  }, [activeTab, debouncedQuery, selectedFormat, selectedSubtype, selectedCategory, selectedTags, selectedAuthor, sort, page, aiSearchEnabled, starredOnly])

  // Reset page when filters change (but not on initial load from URL)
  useEffect(() => {
    // Don't reset on first render
    if (!isInitialized) return

    // Check if any filter actually changed from initial state
    const filtersChanged =
      query !== initialParams.query ||
      selectedFormat !== initialParams.format ||
      selectedSubtype !== initialParams.subtype ||
      selectedCategory !== initialParams.category ||
      JSON.stringify(selectedTags) !== JSON.stringify(initialParams.tags) ||
      selectedAuthor !== initialParams.author ||
      sort !== initialParams.sort ||
      activeTab !== initialParams.tab ||
      starredOnly !== initialParams.starredOnly

    // Only reset page if filters changed AND we're not on the initial page
    if (filtersChanged) {
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedFormat, selectedSubtype, selectedCategory, selectedTags, selectedAuthor, sort, activeTab, starredOnly, isInitialized])

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
    setSelectedSubtype('')
    setSelectedCategory('')
    setSelectedTags([])
    setSelectedAuthor('')
    setQuery('')
    setStarredOnly(false)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Handle starring packages and collections
  const handleStar = async (type: 'package' | 'collection', id: string, scope?: string, nameSlug?: string) => {
    const token = localStorage.getItem('prpm_token')
    const itemKey = type === 'package' ? id : `${scope}/${nameSlug}`
    const isCurrentlyStarred = starredIds.has(itemKey)
    const newStarred = !isCurrentlyStarred

    // Update local state immediately (optimistic update)
    const newStarredIds = new Set(starredIds)
    if (newStarred) {
      newStarredIds.add(itemKey)
    } else {
      newStarredIds.delete(itemKey)
    }
    setStarredIds(newStarredIds)

    // Anonymous user: use localStorage
    if (!token) {
      const storageKey = type === 'package' ? 'prpm_starred_packages' : 'prpm_starred_collections'
      try {
        const data = localStorage.getItem(storageKey)
        const items: string[] = data ? JSON.parse(data) : []

        if (newStarred) {
          if (!items.includes(itemKey)) {
            items.push(itemKey)
          }
        } else {
          const index = items.indexOf(itemKey)
          if (index > -1) {
            items.splice(index, 1)
          }
        }

        localStorage.setItem(storageKey, JSON.stringify(items))
      } catch (err) {
        console.error('Failed to update localStorage:', err)
      }
      return
    }

    // Logged in user: use API
    try {
      if (type === 'package') {
        await starPackage(token, id, newStarred)
      } else if (scope && nameSlug) {
        await starCollection(token, scope, nameSlug, newStarred)
      }
    } catch (err) {
      console.error('Failed to star item:', err)
      // Revert optimistic update on error
      setStarredIds(starredIds)
    }
  }

  const hasFilters = selectedFormat || selectedSubtype || selectedCategory || selectedTags.length > 0 || selectedAuthor || query || starredOnly

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
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true)
              }}
              placeholder={aiSearchEnabled ? "Search with AI (natural language)..." : "Search packages, collections, or skills..."}
              className="w-full px-6 py-4 bg-prpm-dark-card border border-prpm-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-prpm-accent transition-colors pr-12"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-prpm-accent transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-prpm-dark-card border border-prpm-border rounded-lg shadow-xl z-50 overflow-hidden">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-6 py-3 hover:bg-prpm-dark transition-colors border-b border-prpm-border last:border-b-0 ${
                      index === selectedSuggestionIndex ? 'bg-prpm-dark' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-white text-sm">{suggestion}</span>
                    </div>
                  </button>
                ))}
                <div className="px-6 py-2 bg-prpm-dark border-t border-prpm-border">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Based on popular searches
                  </p>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loadingSuggestions && query.length >= 3 && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-prpm-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* AI Search Toggle */}
          {activeTab === 'packages' && process.env.NEXT_PUBLIC_ENABLE_AI_SEARCH === 'true' && (
            <div className="mt-4 flex justify-end">
              <AISearchToggle
                enabled={aiSearchEnabled}
                onChange={setAiSearchEnabled}
              />
            </div>
          )}
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

              {/* Starred Only Filter */}
              <div className="mb-6 pb-6 border-b border-prpm-border">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={starredOnly}
                      onChange={(e) => setStarredOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-prpm-dark-card text-yellow-400 focus:ring-yellow-400 focus:ring-offset-0 focus:ring-offset-prpm-dark"
                    />
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className={`text-sm font-medium transition-colors ${
                        starredOnly ? 'text-yellow-400' : 'text-gray-300 group-hover:text-white'
                      }`}>
                        Starred
                      </span>
                    </div>
                  </div>
                  {starredIds.size > 0 && (
                    <span className="text-xs text-gray-500 bg-prpm-dark-card px-2 py-0.5 rounded">
                      {starredIds.size}
                    </span>
                  )}
                </label>
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
                      <option value="agents.md">Agents.md</option>
                      <option value="generic">Generic</option>
                    </select>

                    {/* Format compatibility info */}
                    {selectedFormat === 'agents.md' && (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-gray-300 mb-2">
                          <strong className="text-blue-400">Compatible with:</strong>
                        </p>
                        <p className="text-xs text-gray-400">
                          OpenAI Codex • GitHub Copilot • Google Gemini • Any tool supporting the open standard
                        </p>
                      </div>
                    )}

                    {selectedFormat === 'copilot' && (
                      <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-xs text-gray-300 mb-2">
                          <strong className="text-purple-400">Compatible with:</strong>
                        </p>
                        <p className="text-xs text-gray-400">
                          GitHub Copilot • OpenAI Codex
                        </p>
                      </div>
                    )}

                    {(selectedFormat === 'cursor' || selectedFormat === 'claude' || selectedFormat === 'continue' || selectedFormat === 'windsurf' || selectedFormat === 'kiro') && (
                      <div className="mt-3 p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg">
                        <p className="text-xs text-gray-400">
                          Tool-specific format for <strong>{selectedFormat === 'cursor' ? 'Cursor IDE' : selectedFormat === 'claude' ? 'Claude Desktop/Code' : selectedFormat === 'continue' ? 'Continue (VS Code/JetBrains)' : selectedFormat === 'windsurf' ? 'Windsurf IDE' : 'Kiro AI'}</strong>
                        </p>
                      </div>
                    )}

                    {selectedFormat === 'mcp' && (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-xs text-gray-300 mb-2">
                          <strong className="text-green-400">Protocol-based:</strong>
                        </p>
                        <p className="text-xs text-gray-400">
                          Any tool implementing Model Context Protocol
                        </p>
                      </div>
                    )}
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
                      {availableSubtypes.map((subtype) => {
                        const labels: Record<Subtype, string> = {
                          'rule': 'Rule',
                          'agent': 'Agent',
                          'skill': 'Skill',
                          'slash-command': 'Slash Command',
                          'prompt': 'Prompt',
                          'collection': 'Collection',
                          'chatmode': 'Chat Mode',
                          'tool': 'Tool',
                          'hook': 'Hook',
                        }
                        return (
                          <option key={subtype} value={subtype}>
                            {labels[subtype]}
                          </option>
                        )
                      })}
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

              {/* Author Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  placeholder="e.g., prpm, voltagent"
                  className="w-full px-3 py-2 bg-prpm-dark border border-prpm-border rounded text-white focus:outline-none focus:border-prpm-accent placeholder-gray-500"
                />
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
            {!loading && (packages.length > 0 || collections.length > 0) && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-gray-400">
                  {total} results
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent"></div>
              </div>
            ) : (
              <>
                {/* AI Search Results */}
                {aiSearchEnabled && activeTab === 'packages' && aiResults.length > 0 ? (
                  <AISearchResults
                    results={aiResults}
                    query={query}
                    executionTime={aiExecutionTime}
                  />
                ) : (
                  <>
                    {/* Package Results */}
                    {(activeTab === 'packages' || activeTab === 'skills' || activeTab === 'slash-commands' || activeTab === 'agents') && (
                      <div className="space-y-4">
                        {packages.length === 0 ? (
                      <div className="text-center py-20">
                        <p className="text-gray-400 mb-4">No packages found</p>
                        {selectedFormat && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 max-w-2xl mx-auto text-left">
                            <h4 className="text-lg font-bold text-blue-400 mb-3">💡 Cross-Platform Tip</h4>
                            <p className="text-gray-300 mb-3">
                              PRPM is cross-platform! Even if there are no native <strong>{selectedFormat}</strong> packages, you can install packages from other formats using the <code className="bg-prpm-dark border border-prpm-border px-2 py-1 rounded text-sm">--as</code> flag.
                            </p>
                            <p className="text-gray-300 mb-3">
                              For example, install any Cursor rule as {selectedFormat}:
                            </p>
                            <div className="bg-prpm-dark border border-prpm-border rounded-lg p-4 font-mono text-sm text-gray-300">
                              prpm install @org/cursor-rules --as {selectedFormat}
                            </div>
                            <p className="text-gray-400 text-sm mt-3">
                              This means you have access to <strong>7,000+ packages</strong> across all formats, not just {selectedFormat}-specific ones!
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {selectedFormat && total < 50 && (
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                            <h4 className="text-sm font-bold text-blue-400 mb-2">💡 Cross-Platform Tip</h4>
                            <p className="text-gray-300 text-sm mb-2">
                              Only {total} native <strong>{selectedFormat}</strong> {total === 1 ? 'package' : 'packages'} found. You can access <strong>7,000+ packages</strong> by installing packages from other formats:
                            </p>
                            <div className="bg-prpm-dark border border-prpm-border rounded-lg p-3 font-mono text-xs text-gray-300">
                              prpm install @org/any-package --as {selectedFormat}
                            </div>
                          </div>
                        )}
                        {packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="relative block w-full text-left bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors group"
                        >
                          <Link
                            href={getPackageUrl(pkg.name, pkg.author_username)}
                            className="cursor-pointer"
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
                                    <span className="px-2 py-1 bg-prpm-green/20 text-prpm-green text-xs rounded-full">
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
                                {pkg.license && (
                                  <span className="px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-xs">
                                    {pkg.license}
                                  </span>
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
                          <div className="mt-4 pt-4 border-t border-prpm-border space-y-3">
                            {/* Install Command */}
                            <div className="flex items-center justify-between gap-2">
                              <code className="text-sm text-prpm-accent-light">
                                prpm install {pkg.name}
                              </code>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(`prpm install ${pkg.name}`, pkg.id)
                                }}
                                className="p-2 hover:bg-prpm-dark rounded transition-colors flex-shrink-0"
                                title="Copy install command"
                              >
                                {copiedId === pkg.id ? (
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-gray-400 hover:text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>

                            {/* Playground CTAs */}
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/playground?package=${pkg.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-3 py-2 bg-prpm-accent hover:bg-prpm-accent/80 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Test in Playground
                              </Link>
                              <Link
                                href={`/playground?package=${pkg.id}&compare=true`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-2 bg-prpm-dark-card hover:bg-prpm-dark border border-prpm-border hover:border-prpm-accent text-gray-300 text-sm rounded-lg transition-colors flex items-center gap-2"
                                title="Compare against no prompt"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Compare
                              </Link>
                            </div>
                          </div>
                          </Link>

                          {/* Star Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleStar('package', pkg.id)
                            }}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-prpm-dark transition-colors"
                            title={starredIds.has(pkg.id) ? 'Unstar' : 'Star'}
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${
                                starredIds.has(pkg.id)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-400 group-hover:text-yellow-400'
                              }`}
                              fill={starredIds.has(pkg.id) ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              strokeWidth={starredIds.has(pkg.id) ? 0 : 2}
                              viewBox="0 0 24 24"
                            >
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      </>
                    )}
                  </div>
                )}
                  </>
                )}

                {/* Collection Results */}
                {activeTab === 'collections' && (
                  <div className="space-y-4">
                    {/* Collections Explainer */}
                    <div className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-prpm-accent" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">What are collections?</h4>
                          <p className="text-sm text-gray-400 mb-2">
                            Collections are curated sets of packages grouped together for a specific purpose or workflow. Install an entire collection at once to get everything you need.
                          </p>
                          <a
                            href="https://docs.prpm.dev/concepts/collections"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-prpm-accent hover:underline inline-flex items-center gap-1"
                          >
                            Learn more about collections
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>

                    {collections.length === 0 ? (
                      <div className="text-center py-20">
                        <p className="text-gray-400">No collections found</p>
                      </div>
                    ) : (
                      collections.map((collection) => (
                        <div
                          key={collection.id}
                          className="relative block w-full text-left bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors group"
                        >
                        <Link
                          href={`/collections/${collection.name_slug}`}
                          className="cursor-pointer"
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
                                {collection.author && (
                                    <span>by @{collection.author}</span>
                                )}
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
                          <div className="mt-4 pt-4 border-t border-prpm-border flex items-center justify-between gap-2">
                            <code className="text-sm text-prpm-accent-light">
                              prpm install collections/{collection.name_slug}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(`prpm install collections/${collection.name_slug}`, collection.id)
                              }}
                              className="p-2 hover:bg-prpm-dark rounded transition-colors flex-shrink-0"
                              title="Copy install command"
                            >
                              {copiedId === collection.id ? (
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-400 hover:text-prpm-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </Link>

                        {/* Star Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleStar('collection', collection.id, collection.scope, collection.name_slug)
                          }}
                          className="absolute top-4 right-4 p-2 rounded-full hover:bg-prpm-dark transition-colors"
                          title={starredIds.has(`${collection.scope}/${collection.name_slug}`) ? 'Unstar' : 'Star'}
                        >
                          <svg
                            className={`w-5 h-5 transition-colors ${
                              starredIds.has(`${collection.scope}/${collection.name_slug}`)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-400 group-hover:text-yellow-400'
                            }`}
                            fill={starredIds.has(`${collection.scope}/${collection.name_slug}`) ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth={starredIds.has(`${collection.scope}/${collection.name_slug}`) ? 0 : 2}
                            viewBox="0 0 24 24"
                          >
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Pagination */}
                {total > limit && (packages.length > 0 || collections.length > 0) && (
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
