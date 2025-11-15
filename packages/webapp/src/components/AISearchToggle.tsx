'use client'

import { Sparkles } from 'lucide-react'

interface AISearchToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function AISearchToggle({ enabled, onChange }: AISearchToggleProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <Sparkles className={`w-5 h-5 ${enabled ? 'text-purple-600' : 'text-gray-400'}`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        AI Search
      </span>
      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
        Free
      </span>
      <button
        onClick={() => onChange(!enabled)}
        className={`ml-auto relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        title="Toggle AI Search"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
