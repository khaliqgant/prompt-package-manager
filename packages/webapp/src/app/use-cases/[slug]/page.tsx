import Link from 'next/link'
import { getPackagesByUseCase, getUseCases } from '@/lib/api'
import { getPackageUrl } from '@/lib/package-url'
import type { Package } from '@/lib/api'
import { Lightbulb, Package as PackageIcon, Download, Star, ArrowLeft, Sparkles } from 'lucide-react'

// Allow dynamic rendering for params not in generateStaticParams
export const dynamicParams = true

// Generate static params for all use cases
export async function generateStaticParams() {
  try {
    // Skip SSG in CI/test builds
    if (process.env.NEXT_PUBLIC_SKIP_SSG === 'true') {
      console.log('[SSG UseCases] ⚡ NEXT_PUBLIC_SKIP_SSG=true, returning minimal params')
      return [{ slug: 'api-development' }]
    }

    const result = await getUseCases(false)

    console.log(`[SSG UseCases] ✅ Generating ${result.use_cases.length} use case pages`)

    return result.use_cases.map(useCase => ({ slug: useCase.slug }))
  } catch (error) {
    console.error('[SSG UseCases] ERROR in generateStaticParams:', error)
    return []
  }
}

export default async function UseCasePage({
  params,
}: {
  params: { slug: string }
}) {
  try {
    const result = await getPackagesByUseCase(params.slug, {
      limit: 100, // Show first 100 packages
      offset: 0
    })

    const useCase = result.use_case
    const packages = result.packages
    const total = result.total

    return (
      <main className="min-h-screen bg-prpm-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/use-cases" className="text-prpm-accent hover:text-prpm-accent-light mb-4 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Use Cases
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-prpm-accent/10 rounded-lg">
                <Lightbulb className="w-8 h-8 text-prpm-accent" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">{useCase.name}</h1>
                <p className="text-gray-400 mt-1">
                  {total} {total === 1 ? 'package' : 'packages'} for this use case
                  {total > 100 ? ' (showing first 100)' : ''}
                </p>
              </div>
            </div>

            {useCase.description && (
              <p className="text-gray-300 text-lg mt-4">
                {useCase.description}
              </p>
            )}

            {useCase.example_query && (
              <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">AI Search Example</span>
                </div>
                <p className="text-gray-300 italic">
                  "{useCase.example_query}"
                </p>
                <Link
                  href={`/search?q=${encodeURIComponent(useCase.example_query)}`}
                  className="inline-block mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Try this search →
                </Link>
              </div>
            )}
          </div>

          {/* Packages */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Recommended Packages
            </h2>

            {packages.length === 0 ? (
              <div className="text-center py-20 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <PackageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No packages found for this use case</p>
                <Link
                  href="/search"
                  className="inline-block text-prpm-accent hover:text-prpm-accent-light"
                >
                  Browse all packages →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {packages.map((pkg: Package) => (
                  <Link
                    key={pkg.id}
                    href={getPackageUrl(pkg.name, pkg.author_username || '')}
                    className="block bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white hover:text-prpm-accent transition-colors">
                          {pkg.name}
                        </h3>

                        {pkg.description && (
                          <p className="text-gray-400 mt-2 line-clamp-2">
                            {pkg.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            <span>{pkg.total_downloads?.toLocaleString() || 0}</span>
                          </div>
                          {pkg.quality_score && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4" />
                              <span>{Number(pkg.quality_score).toFixed(1)}/5</span>
                            </div>
                          )}
                          {pkg.author_username && (
                            <span>by {pkg.author_username}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full">
                          {pkg.format}
                        </span>
                        <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                          {pkg.subtype}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* AI Search CTA */}
          {process.env.NEXT_PUBLIC_ENABLE_AI_SEARCH === 'true' && (
            <div className="mt-12 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-8 text-center">
              <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Want more personalized results?
              </h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Use AI Search to describe your specific needs in natural language.
                Get semantic matches ranked by relevance to your use case.
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
  } catch (error) {
    console.error('Failed to load use case:', error)
    return (
      <main className="min-h-screen bg-prpm-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Use Case Not Found</h2>
            <p className="text-gray-400 mb-6">The use case you're looking for doesn't exist</p>
            <Link
              href="/use-cases"
              className="inline-block bg-prpm-accent hover:bg-prpm-accent-light text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse All Use Cases
            </Link>
          </div>
        </div>
      </main>
    )
  }
}
