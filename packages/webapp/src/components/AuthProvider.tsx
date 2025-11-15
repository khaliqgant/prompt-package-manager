'use client'

import { useEffect, useState } from 'react'

interface AuthState {
  user: string | null
  jwtToken: string | null
}

export function useAuth(): AuthState {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    jwtToken: null,
  })

  useEffect(() => {
    const token = localStorage.getItem('prpm_token')
    const username = localStorage.getItem('prpm_username')
    setAuthState({
      user: username,
      jwtToken: token,
    })

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'prpm_token' || e.key === 'prpm_username') {
        const newToken = localStorage.getItem('prpm_token')
        const newUsername = localStorage.getItem('prpm_username')
        setAuthState({
          user: newUsername,
          jwtToken: newToken,
        })
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return authState
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Auto-login for local development
    // Set NEXT_PUBLIC_DEV_AUTO_AUTH_USER=username to automatically authenticate as that user
    const isDev = process.env.NEXT_PUBLIC_IS_LOCAL === 'true'
    const devUsername = process.env.NEXT_PUBLIC_DEV_AUTO_AUTH_USER

    if (isDev && devUsername) {
      const existingToken = localStorage.getItem('prpm_token')
      if (!existingToken) {
        console.log(`[Dev Mode] Auto-login: Setting mock credentials for ${devUsername}`)
        localStorage.setItem('prpm_token', 'dev-auto-auth-token')
        localStorage.setItem('prpm_username', devUsername)
      }
    }
  }, [])

  return <>{children}</>
}
