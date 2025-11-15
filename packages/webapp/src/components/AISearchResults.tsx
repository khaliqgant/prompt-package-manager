'use client'

import Link from 'next/link'
import { getPackageUrl } from '@/lib/package-url'
import type { AISearchResult } from '@/lib/api'
import { Sparkles, Download, Star } from 'lucide-react'

interface AISearchResultsProps {
  results: AISearchResult[]
  query: string
  executionTime: number
}

export function AISearchResults({ results, query, executionTime }: AISearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No matches found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try rephrasing your query or use different keywords
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Meta */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>
            Found <strong>{results.length}</strong> semantic matches
          </span>
        </div>
        <span>{executionTime}ms</span>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={result.package_id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Rank Badge */}
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                  {index + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Package Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link
                    href={getPackageUrl(result.name, result.author_username || '')}
                    className="font-semibold text-lg text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {result.name}
                  </Link>

                  {/* Match Score */}
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded text-xs font-medium text-purple-700 dark:text-purple-400">
                    <Sparkles className="w-3 h-3" />
                    {Math.round(result.similarity_score * 100)}%
                  </div>
                </div>

                {/* Format & Subtype */}
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                    {result.format}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    {result.subtype}
                  </span>
                </div>

                {/* AI-Enhanced Description */}
                {result.ai_use_case_description ? (
                  <p className="text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
                    {result.ai_use_case_description}
                  </p>
                ) : result.description ? (
                  <p className="text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
                    {result.description}
                  </p>
                ) : null}

                {/* Best For */}
                {result.ai_best_for && (
                  <div className="mb-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Best for: </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {result.ai_best_for}
                    </span>
                  </div>
                )}

                {/* Match Explanation - WHY this matched */}
                {(result as any).match_explanation && (
                  <div className="mb-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-purple-900 dark:text-purple-200 block mb-1">
                          Why this matched:
                        </span>
                        <span className="text-sm text-purple-800 dark:text-purple-300">
                          {(result as any).match_explanation}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Source Badge */}
                {(result as any).source && (
                  <div className="mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      (result as any).source === 'hybrid'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : (result as any).source === 'keyword'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {(result as any).source === 'hybrid' && '✓ Semantic + Keyword Match'}
                      {(result as any).source === 'keyword' && '🔍 Keyword Match'}
                      {(result as any).source === 'vector' && '🧠 Semantic Match'}
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>{result.total_downloads.toLocaleString()}</span>
                  </div>
                  {result.quality_score && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{Number(result.quality_score).toFixed(1)}/5</span>
                    </div>
                  )}
                  {result.stars_count !== undefined && result.stars_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{result.stars_count}</span>
                    </div>
                  )}
                  {result.author_username && (
                    <span className="text-gray-500 dark:text-gray-500">
                      by <span className="text-gray-700 dark:text-gray-300 font-medium">{result.author_username}</span>
                    </span>
                  )}
                </div>

                {/* Similar To */}
                {result.ai_similar_to && result.ai_similar_to.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Similar to: {result.ai_similar_to.slice(0, 3).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
