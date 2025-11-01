'use client'

import type { CreditBalance } from '../../lib/api'

interface CreditsWidgetProps {
  credits: CreditBalance | null
  onBuyCredits: () => void
  onRefresh: () => void
}

export default function CreditsWidget({ credits, onBuyCredits, onRefresh }: CreditsWidgetProps) {
  if (!credits) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      </div>
    )
  }

  const total = credits.balance
  const monthly = credits.breakdown.monthly
  const rollover = credits.breakdown.rollover
  const purchased = credits.breakdown.purchased
  const monthly_used = credits.monthly.used
  const monthly_limit = credits.monthly.allocated

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 min-w-[200px]">
      {/* Total Credits */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Credits</div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{total}</div>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          title="Refresh balance"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Breakdown */}
      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-xs sm:text-sm">
        {monthly > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span className="truncate mr-2">Monthly ({monthly_used}/{monthly_limit})</span>
            <span className="font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{monthly - monthly_used}</span>
          </div>
        )}
        {rollover > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Rollover</span>
            <span className="font-semibold text-yellow-500 dark:text-yellow-400">{rollover}</span>
          </div>
        )}
        {purchased > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Purchased</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{purchased}</span>
          </div>
        )}
      </div>

      {/* Buy Credits Button */}
      <button
        onClick={onBuyCredits}
        className="w-full py-1.5 sm:py-2 px-3 sm:px-4 bg-prpm-green hover:bg-prpm-green-dark text-white text-xs sm:text-sm font-semibold rounded-lg transition shadow-sm"
      >
        Buy More Credits
      </button>

      {/* Low Credits Warning */}
      {total < 10 && total > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-300">
          ⚠️ Low credits! Buy more to continue using the playground.
        </div>
      )}

      {total === 0 && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-300">
          🚫 No credits remaining. Purchase credits to use the playground.
        </div>
      )}
    </div>
  )
}
