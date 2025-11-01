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
  SearchCollectionsResponse,
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundRunRequest,
  PlaygroundRunResponse,
  CreditBalance,
  CreditTransaction,
  CreditPackage,
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
  SearchCollectionsResponse,
  PlaygroundMessage,
  PlaygroundSession,
  PlaygroundRunRequest,
  PlaygroundRunResponse,
  CreditBalance,
  CreditTransaction,
  CreditPackage,
}

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3111'

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
export async function getAuthorProfile(
  username: string,
  sort: 'downloads' | 'recent' | 'name' = 'downloads',
  limit: number = 100,
  offset: number = 0,
  jwtToken?: string
) {
  const params = new URLSearchParams({
    sort,
    limit: limit.toString(),
    offset: offset.toString()
  })

  const headers: Record<string, string> = {}

  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`
  }

  const response = await fetch(`${REGISTRY_URL}/api/v1/authors/${username}?${params}`, {
    headers,
  })

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

/**
 * Organization types
 */
export interface Organization {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  website_url: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  user_id: string | null
  username: string
  email: string
  avatar_url: string | null
  role: string
  joined_at: string
  is_public?: boolean
}

export interface OrganizationPackage {
  id: string
  name: string
  description: string
  format: string
  subtype: string
  visibility: string
  total_downloads: number
  weekly_downloads: number
  is_featured: boolean
  is_verified: boolean
  last_published_at: string
  created_at: string
  tags: string[]
  license?: string
  repository_url?: string
  author_username?: string
}

export interface OrganizationDetails {
  organization: Organization
  packages: OrganizationPackage[]
  members: OrganizationMember[]
  package_count: number
  member_count: number
}

/**
 * Get organization details
 */
export async function getOrganization(orgName: string, jwtToken?: string): Promise<OrganizationDetails> {
  const headers: Record<string, string> = {}

  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`
  }

  const response = await fetch(`${REGISTRY_URL}/api/v1/organizations/${encodeURIComponent(orgName)}`, {
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch organization' }))
    throw new Error(error.error || error.message || 'Failed to fetch organization')
  }

  return response.json()
}

export interface OrganizationListItem {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  website_url: string | null
  is_verified: boolean
  created_at: string
  package_count: number
  member_count: number
  total_downloads: number
}

export interface ListOrganizationsResponse {
  organizations: OrganizationListItem[]
  limit: number
  offset: number
}

/**
 * List all organizations
 */
export async function listOrganizations(options?: { verified?: boolean; limit?: number; offset?: number }): Promise<ListOrganizationsResponse> {
  const queryParams = new URLSearchParams()
  if (options?.verified !== undefined) queryParams.append('verified', String(options.verified))
  if (options?.limit) queryParams.append('limit', String(options.limit))
  if (options?.offset) queryParams.append('offset', String(options.offset))

  const response = await fetch(`${REGISTRY_URL}/api/v1/organizations?${queryParams.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to list organizations' }))
    throw new Error(error.error || error.message || 'Failed to list organizations')
  }

  return response.json()
}

/**
 * Create a new organization
 */
export async function createOrganization(
  jwtToken: string,
  data: { name: string; description?: string; website_url?: string }
): Promise<{ organization: Organization; message: string }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/organizations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create organization' }))
    throw new Error(error.error || error.message || 'Failed to create organization')
  }

  return response.json()
}

/**
 * Update an organization
 */
export async function updateOrganization(
  jwtToken: string,
  orgName: string,
  data: { description?: string; website_url?: string; avatar_url?: string }
): Promise<{ organization: Organization; message: string }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/organizations/${encodeURIComponent(orgName)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update organization' }))
    throw new Error(error.error || error.message || 'Failed to update organization')
  }

  return response.json()
}

// ============================================
// PLAYGROUND & CREDITS
// ============================================

/**
 * Playground types
 */
/**
 * Get playground credit balance
 */
export async function getPlaygroundCredits(jwtToken: string): Promise<CreditBalance> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/credits`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch credits' }))
    throw new Error(error.error || error.message || 'Failed to fetch credits')
  }

  return response.json()
}

/**
 * Get credit transaction history
 */
export async function getCreditHistory(jwtToken: string, limit: number = 50, offset: number = 0): Promise<{ transactions: CreditTransaction[]; total: number }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/credits/history?limit=${limit}&offset=${offset}`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch history' }))
    throw new Error(error.error || error.message || 'Failed to fetch history')
  }

  return response.json()
}

/**
 * Get available credit packages
 */
export async function getCreditPackages(): Promise<{ packages: CreditPackage[] }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/credits/packages`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch packages' }))
    throw new Error(error.error || error.message || 'Failed to fetch packages')
  }

  return response.json()
}

/**
 * Purchase credits
 */
export async function purchaseCredits(jwtToken: string, packageId: string): Promise<{ clientSecret: string; credits: number; price: number }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/credits/purchase`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ package: packageId }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to purchase credits' }))
    throw new Error(error.error || error.message || 'Failed to purchase credits')
  }

  return response.json()
}

/**
/**
 * Get PRPM+ pricing for current user
 */
export async function getPRPMPlusPricing(jwtToken: string): Promise<{
  price: number
  currency: string
  interval: string
  credits: number
  isOrgMember: boolean
  orgName: string | null
  discount: number
}> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/pricing`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get pricing' }))
    throw new Error(error.error || error.message || 'Failed to get pricing')
  }

  return response.json()
}

/**
 * Subscribe to PRPM+
 */
export async function subscribeToPRPMPlus(
  jwtToken: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkoutUrl: string }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/subscribe`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ successUrl, cancelUrl }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create subscription' }))
    throw new Error(error.error || error.message || 'Failed to create subscription')
  }

  return response.json()
}

/**
 * Get PRPM+ subscription status
 */
export async function getPRPMPlusStatus(jwtToken: string): Promise<{
  isActive: boolean
  status: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/subscription`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get subscription status' }))
    throw new Error(error.error || error.message || 'Failed to get subscription status')
  }

  return response.json()
}

/**
 * Cancel PRPM+ subscription
 */
export async function cancelPRPMPlus(jwtToken: string): Promise<{ message: string }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/subscription/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to cancel subscription' }))
    throw new Error(error.error || error.message || 'Failed to cancel subscription')
  }

  return response.json()
}

/**
 * Get Stripe Customer Portal URL
 */
export async function getStripePortalUrl(jwtToken: string, returnUrl: string): Promise<{ portalUrl: string }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/subscription/portal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ returnUrl }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get portal URL' }))
    throw new Error(error.error || error.message || 'Failed to get portal URL')
  }

  return response.json()
}

/**
 * Run playground prompt
 */
export async function runPlayground(jwtToken: string, request: PlaygroundRunRequest): Promise<PlaygroundRunResponse> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to run playground' }))
    throw new Error(error.error || error.message || 'Failed to run playground')
  }

  return response.json()
}

/**
 * Estimate credits for playground run
 */
export async function estimatePlaygroundCredits(jwtToken: string, request: Omit<PlaygroundRunRequest, 'session_id'>): Promise<{ estimated_credits: number; estimated_tokens: number }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/estimate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to estimate' }))
    throw new Error(error.error || error.message || 'Failed to estimate')
  }

  return response.json()
}

/**
 * List playground sessions
 */
export async function listPlaygroundSessions(jwtToken: string, limit: number = 20, offset: number = 0): Promise<{ sessions: PlaygroundSession[]; total: number }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/sessions?limit=${limit}&offset=${offset}`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch sessions' }))
    throw new Error(error.error || error.message || 'Failed to fetch sessions')
  }

  return response.json()
}

/**
 * Get playground session
 */
export async function getPlaygroundSession(jwtToken: string, sessionId: string): Promise<PlaygroundSession> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch session' }))
    throw new Error(error.error || error.message || 'Failed to fetch session')
  }

  return response.json()
}

/**
 * Delete playground session
 */
export async function deletePlaygroundSession(jwtToken: string, sessionId: string): Promise<void> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete session' }))
    throw new Error(error.error || error.message || 'Failed to delete session')
  }
}

/**
 * Share playground session
 */
export async function sharePlaygroundSession(jwtToken: string, sessionId: string): Promise<{ share_token: string; share_url: string }> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/sessions/${sessionId}/share`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to share session' }))
    throw new Error(error.error || error.message || 'Failed to share session')
  }

  return response.json()
}

/**
 * Get shared playground session (public)
 */
export async function getSharedPlaygroundSession(shareToken: string): Promise<PlaygroundSession> {
  const response = await fetch(`${REGISTRY_URL}/api/v1/playground/shared/${shareToken}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch shared session' }))
    throw new Error(error.error || error.message || 'Failed to fetch shared session')
  }

  return response.json()
}
