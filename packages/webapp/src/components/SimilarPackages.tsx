'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSimilarPackages } from '@/lib/api'
import { getPackageUrl } from '@/lib/package-url'
import { Sparkles, Download, Star } from 'lucide-react'
import type { AISearchResult } from '@/lib/api'

interface SimilarPackagesProps {
  packageId: string
  limit?: number
}

export function SimilarPackages({ packageId, limit = 5 }: SimilarPackagesProps) {
  const [similarPackages, setSimilarPackages] = useState<AISearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSimilar() {
      try {
        const result = await getSimilarPackages(packageId, null, limit) // No auth needed
        setSimilarPackages(result.similar_packages || [])
        setError(null)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('Failed to load similar packages:', error)
        setError('Failed to load similar packages')
      } finally {
        setLoading(false)
      }
    }

    loadSimilar()
  }, [packageId, limit])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Similar Packages
          </h3>
          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
            Free
          </span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  if (error || similarPackages.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Similar Packages
        </h3>
        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
          Free
        </span>
      </div>

      <div className="space-y-3">
        {similarPackages.map((pkg, index) => (
          <Link
            key={pkg.package_id}
            href={getPackageUrl(pkg.name, pkg.author_username || '')}
            className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-700 transition-all group"
          >
            <div className="flex items-start gap-3">
              {/* Match indicator */}
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                  {Math.round((pkg.similarity_score || 0) * 100)}%
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Package name */}
                <div className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                  {pkg.name}
                </div>

                {/* Description */}
                {pkg.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                    {pkg.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                  <div className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>{pkg.total_downloads?.toLocaleString() || 0}</span>
                  </div>
                  {pkg.quality_score && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>{Number(pkg.quality_score).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Powered by AI semantic matching • 100% Free
        </p>
      </div>
    </div>
  )
}
