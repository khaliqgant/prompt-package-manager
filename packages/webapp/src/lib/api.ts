/**
 * API client for communicating with PRMP registry
 */

import type {
  InviteDetails,
  ClaimInviteRequest,
  ClaimInviteResponse,
  Author,
  TopAuthorsResponse,
  Format,
  Subtype,
  SortType,
  SearchPackagesParams,
  Package,
  SearchPackagesResponse,
  SearchCollectionsParams,
  Collection,
  SearchCollectionsResponse
} from '@pr-pm/types'

// Re-export types for convenience
export type {
  InviteDetails,
  ClaimInviteRequest,
  ClaimInviteResponse,
  Author,
  TopAuthorsResponse,
  Format,
  Subtype,
  SortType,
  SearchPackagesParams,
  Package,
  SearchPackagesResponse,
  SearchCollectionsParams,
  Collection,
  SearchCollectionsResponse
}

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3000'

/**
 * Check for unclaimed packages (requires authentication)
 */
export async function getUnclaimedPackages(jwtToken: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/me/unclaimed-packages`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to check unclaimed packages' }))
    throw new Error(error.error || error.message || 'Failed to check unclaimed packages')
  }

  return response.json()
}

/**
 * Claim packages for authenticated user
 */
export async function claimPackages(jwtToken: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/claim`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to claim packages' }))
    throw new Error(error.error || error.message || 'Failed to claim packages')
  }

  return response.json()
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(jwtToken: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/me`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Not authenticated')
  }

  return response.json()
}

/**
 * Get top authors
 */
export async function getTopAuthors(limit: number = 50): Promise<TopAuthorsResponse> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/search/authors?limit=${limit}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch authors' }))
    throw new Error(error.error || error.message || 'Failed to fetch top authors')
  }

  return response.json()
}

/**
 * Create Nango connect session
 */
export async function createNangoConnectSession(userId: string, email: string, displayName: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/nango/connect-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, email, displayName }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create connect session' }))
    throw new Error(error.error || error.message || 'Failed to create connect session')
  }

  return response.json()
}

/**
 * Handle Nango authentication callback
 */
export async function checkAuthStatus(connectionId: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/nango/status/${connectionId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Authentication not ready' }))
    throw new Error(error.error || error.message || 'Authentication not ready')
  }

  return response.json()
}

/**
 * Register with email and password
 */
export async function register(username: string, email: string, password: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Registration failed' }))
    throw new Error(error.error || error.message || 'Registration failed')
  }

  return response.json()
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }))
    throw new Error(error.error || error.message || 'Login failed')
  }

  return response.json()
}

// ============================================
// SEARCH & DISCOVERY
// ============================================

/**
 * Search for packages
 */
export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  const queryParams = new URLSearchParams()

  if (params.q) queryParams.append('q', params.q)
  if (params.format) {
    if (Array.isArray(params.format)) {
      params.format.forEach((f: string) => queryParams.append('format', f))
    } else {
      queryParams.append('format', params.format)
    }
  }
  if (params.subtype) {
    if (Array.isArray(params.subtype)) {
      params.subtype.forEach((s: string) => queryParams.append('subtype', s))
    } else {
      queryParams.append('subtype', params.subtype)
    }
  }
  if (params.tags) params.tags.forEach((tag: string) => queryParams.append('tags', tag))
  if (params.category) queryParams.append('category', params.category)
  if (params.author) queryParams.append('author', params.author)
  if (params.verified !== undefined) queryParams.append('verified', String(params.verified))
  if (params.featured !== undefined) queryParams.append('featured', String(params.featured))
  if (params.sort) queryParams.append('sort', params.sort)
  if (params.limit) queryParams.append('limit', String(params.limit))
  if (params.offset) queryParams.append('offset', String(params.offset))

  const response = await fetch(`${REGISTRY_URL}/api/v1/search?${queryParams.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to search packages' }))
    throw new Error(error.error || error.message || 'Failed to search packages')
  }

  return response.json()
}

/**
 * Search for collections
 */
export async function searchCollections(params: SearchCollectionsParams): Promise<SearchCollectionsResponse> {
  const queryParams = new URLSearchParams()

  if (params.query) queryParams.append('query', params.query)
  if (params.category) queryParams.append('category', params.category)
  if (params.tag) queryParams.append('tag', params.tag)
  if (params.framework) queryParams.append('framework', params.framework)
  if (params.official !== undefined) queryParams.append('official', String(params.official))
  if (params.verified !== undefined) queryParams.append('verified', String(params.verified))
  if (params.scope) queryParams.append('scope', params.scope)
  if (params.author) queryParams.append('author', params.author)
  if (params.limit) queryParams.append('limit', String(params.limit))
  if (params.offset) queryParams.append('offset', String(params.offset))
  if (params.sortBy) queryParams.append('sortBy', params.sortBy)
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)

  const response = await fetch(`${REGISTRY_URL}/api/v1/collections?${queryParams.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to search collections' }))
    throw new Error(error.error || error.message || 'Failed to search collections')
  }

  return response.json()
}

/**
 * Get trending packages
 */
export async function getTrendingPackages(options?: { format?: Format; subtype?: Subtype; limit?: number }) {
  const queryParams = new URLSearchParams()
  if (options?.format) queryParams.append('format', options.format)
  if (options?.subtype) queryParams.append('subtype', options.subtype)
  queryParams.append('limit', String(options?.limit || 20))

  const response = await fetch(`${REGISTRY_URL}/api/v1/search/trending?${queryParams.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch trending packages' }))
    throw new Error(error.error || error.message || 'Failed to fetch trending packages')
  }

  return response.json()
}

/**
 * Get featured packages
 */
export async function getFeaturedPackages(options?: { format?: Format; subtype?: Subtype; limit?: number }) {
  const queryParams = new URLSearchParams()
  if (options?.format) queryParams.append('format', options.format)
  if (options?.subtype) queryParams.append('subtype', options.subtype)
  queryParams.append('limit', String(options?.limit || 20))

  const response = await fetch(`${REGISTRY_URL}/api/v1/search/featured?${queryParams.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch featured packages' }))
    throw new Error(error.error || error.message || 'Failed to fetch featured packages')
  }

  return response.json()
}

/**
 * Get all available tags
 */
export async function getTags() {
  const response = await fetch(`${REGISTRY_URL}/api/v1/search/tags`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch tags' }))
    throw new Error(error.error || error.message || 'Failed to fetch tags')
  }

  return response.json()
}

/**
 * Get all available categories
 */
export async function getCategories() {
  const response = await fetch(`${REGISTRY_URL}/api/v1/search/categories`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch categories' }))
    throw new Error(error.error || error.message || 'Failed to fetch categories')
  }

  return response.json()
}

// ============================================
// AUTHOR PROFILES
// ============================================

/**
 * Get public author profile with packages
 */
export async function getAuthorProfile(username: string, sort: 'downloads' | 'recent' | 'name' = 'downloads') {
  const response = await fetch(`${REGISTRY_URL}/api/v1/authors/${username}?sort=${sort}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch author profile' }))
    throw new Error(error.error || error.message || 'Failed to fetch author profile')
  }

  return response.json()
}

/**
 * Get unclaimed packages for an author
 */
export async function getAuthorUnclaimedPackages(username: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/authors/${username}/unclaimed`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch unclaimed packages' }))
    throw new Error(error.error || error.message || 'Failed to fetch unclaimed packages')
  }

  return response.json()
}

/**
 * Get author dashboard (authenticated)
 */
export async function getAuthorDashboard(jwtToken: string) {
  const response = await fetch(`${REGISTRY_URL}/api/v1/author/dashboard`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch dashboard' }))
    throw new Error(error.error || error.message || 'Failed to fetch dashboard')
  }

  return response.json()
}

/**
 * Get author packages with analytics (authenticated)
 */
export async function getAuthorPackages(jwtToken: string, sort: 'downloads' | 'views' | 'rating' | 'created' | 'updated' = 'downloads') {
  const response = await fetch(`${REGISTRY_URL}/api/v1/author/packages?sort=${sort}`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch packages' }))
    throw new Error(error.error || error.message || 'Failed to fetch packages')
  }

  return response.json()
}
