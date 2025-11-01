'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

function AuthCallbackContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const username = searchParams.get('username')

  useEffect(() => {
    if (token && username) {
      // Store token in localStorage for authenticated requests
      localStorage.setItem('prpm_token', token)
      localStorage.setItem('prpm_username', username)

      // Determine redirect URL and navigate
      const returnTo = localStorage.getItem('prpm_return_to') || '/dashboard'
      localStorage.removeItem('prpm_return_to')

      // Navigate to the return URL
      window.location.href = returnTo
    }
  }, [token, username])

  return (
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-green mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Completing authentication...</p>
    </div>
  )
}

/**
 * OAuth callback page - handles redirect from GitHub authentication
 * This is mainly for non-invite flows (general login)
 */
export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <Suspense fallback={<div>Loading...</div>}>
        <AuthCallbackContent />
      </Suspense>
    </main>
  )
}
