'use client'

import { useState } from 'react'
import { deletePlaygroundSession, sharePlaygroundSession } from '../../lib/api'
import type { PlaygroundSession } from '../../lib/api'

interface SessionsSidebarProps {
  sessions: PlaygroundSession[]
  selectedSession: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onRefresh: () => void
}

export default function SessionsSidebar({
  sessions,
  selectedSession,
  onSelectSession,
  onNewSession,
  onRefresh,
}: SessionsSidebarProps) {
  const [deletingSession, setDeletingSession] = useState<string | null>(null)
  const [sharingSession, setSharingSession] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const confirmed = confirm('Are you sure you want to delete this session?')
    if (!confirmed) return

    const token = localStorage.getItem('prpm_token')
    if (!token) return

    setDeletingSession(sessionId)

    try {
      await deletePlaygroundSession(token, sessionId)
      onRefresh()
    } catch (err) {
      console.error('Failed to delete session:', err)
      alert('Failed to delete session')
    } finally {
      setDeletingSession(null)
    }
  }

  const handleShare = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    const token = localStorage.getItem('prpm_token')
    if (!token) return

    setSharingSession(sessionId)

    try {
      const result = await sharePlaygroundSession(token, sessionId)
      setShareUrl(result.share_url)

      // Copy to clipboard
      navigator.clipboard.writeText(result.share_url)
      alert('Share link copied to clipboard!')
    } catch (err) {
      console.error('Failed to share session:', err)
      alert('Failed to share session')
    } finally {
      setSharingSession(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Sessions</h2>
        <button
          onClick={onRefresh}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          title="Refresh sessions"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* New Session Button */}
      <button
        onClick={onNewSession}
        className="w-full mb-3 sm:mb-4 py-2 px-3 sm:px-4 bg-prpm-green hover:bg-prpm-green-dark text-white text-xs sm:text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Session
      </button>

      {/* Sessions List */}
      <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No sessions yet. Start a new session to test prompts!
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`p-3 rounded-lg cursor-pointer transition border ${
                selectedSession === session.id
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {/* Package Name */}
              <div className="font-semibold text-sm text-gray-900 dark:text-white truncate mb-1">
                {session.package_name}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span>{session.run_count} runs</span>
                <span>•</span>
                <span>{session.credits_spent} credits</span>
              </div>

              {/* Date */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {formatDate(session.last_run_at)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Share Button */}
                <button
                  onClick={(e) => handleShare(session.id, e)}
                  disabled={sharingSession === session.id}
                  className="flex-1 py-1 px-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition disabled:opacity-50"
                  title="Share session"
                >
                  {sharingSession === session.id ? '...' : 'Share'}
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(session.id, e)}
                  disabled={deletingSession === session.id}
                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition disabled:opacity-50"
                  title="Delete session"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
