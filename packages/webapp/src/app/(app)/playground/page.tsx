'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CreditsWidget from '../../../components/playground/CreditsWidget'
import PlaygroundInterface from '../../../components/playground/PlaygroundInterface'
import SessionsSidebar from '../../../components/playground/SessionsSidebar'
import BuyCreditsModal from '../../../components/playground/BuyCreditsModal'
import { getPlaygroundCredits, listPlaygroundSessions } from '../../../lib/api'
import type { CreditBalance, PlaygroundSession } from '../../../lib/api'

function PlaygroundContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const packageId = searchParams.get('package')

  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [sessions, setSessions] = useState<PlaygroundSession[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [showBuyCredits, setShowBuyCredits] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('prpm_token')
    if (!token) {
      router.push('/login?redirect=/playground')
      return
    }
    loadData(token)
  }, [router])

  const loadData = async (token: string) => {
    try {
      setLoading(true)
      setError(null)

      const [creditsData, sessionsData] = await Promise.all([
        getPlaygroundCredits(token),
        listPlaygroundSessions(token, 20, 0)
      ])

      setCredits(creditsData)
      setSessions(sessionsData.sessions)
    } catch (err: any) {
      console.error('Failed to load playground data:', err)
      setError(err.message || 'Failed to load playground data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshCredits = async () => {
    const token = localStorage.getItem('prpm_token')
    if (!token) return

    try {
      const creditsData = await getPlaygroundCredits(token)
      setCredits(creditsData)
    } catch (err) {
      console.error('Failed to refresh credits:', err)
    }
  }

  const handleRefreshSessions = async () => {
    const token = localStorage.getItem('prpm_token')
    if (!token) return

    try {
      const sessionsData = await listPlaygroundSessions(token, 20, 0)
      setSessions(sessionsData.sessions)
    } catch (err) {
      console.error('Failed to refresh sessions:', err)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId)
  }

  const handleNewSession = () => {
    setSelectedSession(null)
  }

  const handleCreditsUpdated = () => {
    handleRefreshCredits()
    setShowBuyCredits(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading playground...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Playground</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => loadData(localStorage.getItem('prpm_token') || '')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                PRPM+ Playground
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Test prompts with AI agents in a virtual environment
              </p>
            </div>
            <CreditsWidget
              credits={credits}
              onBuyCredits={() => setShowBuyCredits(true)}
              onRefresh={handleRefreshCredits}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sessions Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <SessionsSidebar
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={handleSessionSelect}
              onNewSession={handleNewSession}
              onRefresh={handleRefreshSessions}
            />
          </div>

          {/* Playground Interface */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <PlaygroundInterface
              initialPackageId={packageId || undefined}
              sessionId={selectedSession || undefined}
              onCreditsChange={handleRefreshCredits}
              onSessionCreated={handleRefreshSessions}
            />
          </div>
        </div>
      </div>

      {/* Buy Credits Modal */}
      {showBuyCredits && (
        <BuyCreditsModal
          onClose={() => setShowBuyCredits(false)}
          onSuccess={handleCreditsUpdated}
        />
      )}
    </div>
  )
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading playground...</p>
        </div>
      </div>
    }>
      <PlaygroundContent />
    </Suspense>
  )
}
