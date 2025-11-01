'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Nango from '@nangohq/frontend'
// No API imports needed - CLI polls the backend directly

// Disable static generation for this page since it uses search params
export const dynamic = 'force-dynamic'

function CLIAuthContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [nango, setNango] = useState<any>(null)
  const [modalOpened, setModalOpened] = useState(false)
  const authSucceededRef = useRef(false)

  const searchParams = useSearchParams()
  const sessionToken = searchParams.get('sessionToken')
  const cliCallback = searchParams.get('cliCallback')
  const userId = searchParams.get('userId')

  const handleConnectionSuccess = useCallback(async (connectionId: string) => {
    try {
      // Webhook will process the authentication and create/update the user
      // CLI is polling /api/v1/auth/nango/cli/status/:userId and will get the token
      // We just need to show success message
      console.log('CLI auth successful! Connection ID:', connectionId)
      console.log('Webhook is processing authentication. CLI will detect this via polling.')
      setConnectionStatus('connected')
    } catch (err) {
      console.error('Failed to handle connection:', err)
      setError('Authentication flow error')
    }
  }, [])

  const openModal = useCallback(() => {
    if (nango && sessionToken) {
      console.log('Manually opening Nango Connect UI...')
      try {
        nango.openConnectUI({
          detectClosedAuthWindow: true,
          onEvent: async (event: any) => {
            console.log('Nango event received:', event)

            switch (event.type) {
              case 'connect':
                {
                  const connectionId = event.payload?.connectionId
                  console.log('Connection successful, connectionId:', connectionId)
                  setConnectionId(connectionId)
                  setConnectionStatus('connected')
                  authSucceededRef.current = true

                  if (connectionId) {
                    await handleConnectionSuccess(connectionId)
                  }
                }
                break

              case 'close':
                console.log('Nango modal closed')
                // Only redirect with error if authentication didn't succeed
                if (!authSucceededRef.current) {
                  setConnectionStatus('disconnected')
                  if (cliCallback) {
                    const callbackUrl = new URL(cliCallback)
                    callbackUrl.searchParams.set('error', 'auth_cancelled')
                    window.location.href = callbackUrl.toString()
                  }
                }
                break

              default:
                console.log('Unhandled Nango event:', event)
                break
            }
          },
        })
        setModalOpened(true)
      } catch (err) {
        console.error('Failed to open modal:', err)
        setError(`Failed to open authentication modal: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }, [nango, sessionToken, cliCallback, handleConnectionSuccess])

  useEffect(() => {
    if (!sessionToken) {
      setError('No session token provided')
      setIsLoading(false)
      return
    }

    if (!cliCallback) {
      setError('No CLI callback URL provided')
      setIsLoading(false)
      return
    }

    // Initialize Nango and open Connect UI
    const initializeAuth = async () => {
      try {
        console.log('Initializing Nango with session token:', sessionToken?.substring(0, 20) + '...')

        // Check if Nango is available
        if (typeof window === 'undefined') {
          throw new Error('Nango can only be used in browser environment')
        }

        const nangoInstance = new Nango({ connectSessionToken: sessionToken })
        setNango(nangoInstance)

        console.log('Nango instance created, waiting before opening modal...')

        // Wait a bit for Nango to fully initialize
        await new Promise(resolve => setTimeout(resolve, 500))

        console.log('Opening Connect UI...')

        // Try to open the modal
        try {
          nangoInstance.openConnectUI({
            detectClosedAuthWindow: true,
            onEvent: async (event: any) => {
              console.log('Nango event received:', event)

              // Handle different event types
              switch (event.type) {
                case 'connect':
                  {
                    const connectionId = event.payload?.connectionId
                    console.log('Connection successful, connectionId:', connectionId)
                    setConnectionId(connectionId)
                    setConnectionStatus('connected')
                    authSucceededRef.current = true

                    if (connectionId) {
                      await handleConnectionSuccess(connectionId)
                    }
                  }
                  break

                case 'close':
                  console.log('Nango modal closed')
                  // Only redirect with error if authentication didn't succeed
                  if (!authSucceededRef.current) {
                    setConnectionStatus('disconnected')
                    // Redirect back to CLI callback with error
                    if (cliCallback) {
                      const callbackUrl = new URL(cliCallback)
                      callbackUrl.searchParams.set('error', 'auth_cancelled')
                      window.location.href = callbackUrl.toString()
                    }
                  }
                  break

                case 'settings_changed':
                  console.log('Settings changed')
                  break

                default:
                  // Unhandled Nango event
                  console.log('Unhandled Nango event:', event)
                  break
              }
            },
          })

          console.log('Nango Connect UI opened successfully')
          setModalOpened(true)
        } catch (modalError) {
          console.error('Failed to open Nango modal:', modalError)
          setModalOpened(false)
        }

        setIsLoading(false)

        // Set a timeout to show manual button if modal doesn't open
        setTimeout(() => {
          if (connectionStatus === 'connecting') {
            setModalOpened(false) // This will show the manual button
            console.log('Modal may not have opened, showing manual button')
          }
        }, 2000)
      } catch (err) {
        console.error('Failed to initialize Nango:', err)
        setError(`Failed to initialize authentication: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }

    // Only initialize once when component mounts
    if (!authSucceededRef.current) {
      initializeAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken, cliCallback])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-prpm-dark relative overflow-hidden flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-white mb-2">Initializing Authentication</h1>
          <p className="text-gray-400">Please wait while we set up GitHub authentication...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-prpm-dark relative overflow-hidden flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-900/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Authentication Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          {cliCallback && (
            <button
              onClick={() => {
                const callbackUrl = new URL(cliCallback)
                callbackUrl.searchParams.set('error', 'auth_failed')
                window.location.href = callbackUrl.toString()
              }}
              className="px-4 py-2 bg-prpm-accent text-white rounded-lg hover:bg-prpm-accent-light transition-colors"
            >
              Return to CLI
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-prpm-dark relative overflow-hidden flex items-center justify-center p-8">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-20"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-prpm-accent/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-prpm-green/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="bg-prpm-dark-card border border-prpm-border rounded-2xl p-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-prpm-accent/20 border border-prpm-accent/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-prpm-accent" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">CLI Authentication</h1>
            <p className="text-gray-400">Complete GitHub authentication for your CLI</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                connectionStatus === 'connected' ? 'bg-green-400' :
                'bg-gray-400'
              }`}></div>
              <span className="text-sm text-gray-300">
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'connected' && 'Connected successfully!'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
              </span>
            </div>

            {connectionStatus === 'connecting' && !modalOpened && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  The authentication modal should open automatically. If it doesn't appear, click the button below.
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Session Token: {sessionToken ? '✓ Present' : '✗ Missing'}</p>
                  <p>CLI Callback: {cliCallback ? '✓ Present' : '✗ Missing'}</p>
                  <p>Nango Instance: {nango ? '✓ Created' : '✗ Not created'}</p>
                </div>
                <button
                  onClick={openModal}
                  className="w-full px-4 py-2 bg-prpm-accent text-white rounded-lg hover:bg-prpm-accent-light transition-colors"
                >
                  Open GitHub Authentication
                </button>
              </div>
            )}

            {connectionStatus === 'connecting' && modalOpened && (
              <p className="text-sm text-gray-400">
                Authentication modal is open. Please complete the GitHub authentication in the popup window.
              </p>
            )}

            {connectionStatus === 'connected' && (
              <p className="text-sm text-green-400">
                ✅ Authentication successful! You can close this window and return to your terminal.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CLIAuthPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-prpm-dark relative overflow-hidden flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-white mb-2">Loading...</h1>
        </div>
      </main>
    }>
      <CLIAuthContent />
    </Suspense>
  )
}
