'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUseCases } from '@/lib/api'
import type { UseCaseWithPackages } from '@/lib/api'
import { Lightbulb, Package, ChevronRight } from 'lucide-react'

export default function UseCasesPage() {
  const [useCases, setUseCases] = useState<UseCaseWithPackages[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUseCases() {
      try {
        const result = await getUseCases(true)
        setUseCases(result.use_cases)
      } catch (error) {
        console.error('Failed to load use cases:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUseCases()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-prpm-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prpm-accent"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-prpm-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-prpm-accent hover:text-prpm-accent-light mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Browse by Use Case</h1>
          <p className="text-gray-400">
            Find packages organized by what you're trying to accomplish
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <Link
              key={useCase.id}
              href={`/use-cases/${useCase.slug}`}
              className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors group"
            >
              {/* Use Case Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-prpm-accent/10 rounded-lg group-hover:bg-prpm-accent/20 transition-colors flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-prpm-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white group-hover:text-prpm-accent transition-colors">
                    {useCase.name}
                  </h3>
                  {useCase.package_count !== undefined && (
                    <p className="text-sm text-gray-400 mt-1">
                      {useCase.package_count} packages
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-prpm-accent transition-colors flex-shrink-0" />
              </div>

              {/* Description */}
              {useCase.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {useCase.description}
                </p>
              )}

              {/* Example Query */}
              {useCase.example_query && (
                <div className="mt-4 pt-4 border-t border-prpm-border">
                  <p className="text-xs text-gray-500 mb-1">Example search:</p>
                  <p className="text-sm text-gray-300 italic">
                    "{useCase.example_query}"
                  </p>
                </div>
              )}
            </Link>
          ))}
        </div>

        {useCases.length === 0 && !loading && (
          <div className="text-center py-20">
            <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No use cases available yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Use cases will appear here once the taxonomy is generated
            </p>
          </div>
        )}

        {/* CTA Section */}
        {process.env.NEXT_PUBLIC_ENABLE_AI_SEARCH === 'true' && (
          <div className="mt-12 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-8 text-center">
            <Lightbulb className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Can't find what you're looking for?
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Try our AI-powered search to find packages using natural language.
              Describe what you want to build, and we'll find the perfect packages for you.
            </p>
            <Link
              href="/search"
              className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Try AI Search
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
