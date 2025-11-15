import Link from 'next/link'
import { getCategory, getPackagesByCategory, getCategories } from '@/lib/api'
import { getPackageUrl } from '@/lib/package-url'
import type { CategoryWithChildren, Package } from '@/lib/api'
import { Folder, Package as PackageIcon, Download, Star, ArrowLeft } from 'lucide-react'

// Allow dynamic rendering for params not in generateStaticParams
export const dynamicParams = true

// Generate static params for all categories
export async function generateStaticParams() {
  try {
    // Skip SSG in CI/test builds
    if (process.env.NEXT_PUBLIC_SKIP_SSG === 'true') {
      console.log('[SSG Categories] ⚡ NEXT_PUBLIC_SKIP_SSG=true, returning minimal params')
      return [{ slug: 'development' }]
    }

    const result = await getCategories(false)

    // Flatten all categories and subcategories to get all slugs
    const slugs: string[] = []

    function collectSlugs(category: CategoryWithChildren) {
      slugs.push(category.slug)
      if (category.children) {
        category.children.forEach(collectSlugs)
      }
    }

    result.categories.forEach(collectSlugs)

    console.log(`[SSG Categories] ✅ Generating ${slugs.length} category pages`)

    return slugs.map(slug => ({ slug }))
  } catch (error) {
    console.error('[SSG Categories] ERROR in generateStaticParams:', error)
    return []
  }
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  try {
    const [category, packagesResult] = await Promise.all([
      getCategory(params.slug, true),
      getPackagesByCategory(params.slug, {
        limit: 100, // Show first 100 packages
        offset: 0,
        includeChildren: true
      })
    ])

    const packages = packagesResult.packages
    const total = packagesResult.total

    return (
      <main className="min-h-screen bg-prpm-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/categories" className="text-prpm-accent hover:text-prpm-accent-light mb-4 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Categories
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-prpm-accent/10 rounded-lg">
                <Folder className="w-8 h-8 text-prpm-accent" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">{category.name}</h1>
                {category.package_count !== undefined && (
                  <p className="text-gray-400 mt-1">
                    {category.package_count} packages in this category
                  </p>
                )}
              </div>
            </div>

            {category.description && (
              <p className="text-gray-300 text-lg mt-4">
                {category.description}
              </p>
            )}
          </div>

          {/* Subcategories */}
          {category.children && category.children.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Subcategories</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.children.map((subcategory: CategoryWithChildren) => (
                  <Link
                    key={subcategory.id}
                    href={`/categories/${subcategory.slug}`}
                    className="bg-prpm-dark-card border border-prpm-border rounded-lg p-4 hover:border-prpm-accent transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white group-hover:text-prpm-accent transition-colors">
                          {subcategory.name}
                        </h3>
                        {subcategory.package_count !== undefined && (
                          <p className="text-sm text-gray-400 mt-1">
                            {subcategory.package_count} packages
                          </p>
                        )}
                      </div>
                      <PackageIcon className="w-5 h-5 text-gray-400 group-hover:text-prpm-accent transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Packages */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              {total > 0 ? `${total} Packages${total > 100 ? ' (showing first 100)' : ''}` : 'Packages'}
            </h2>

            {packages.length === 0 ? (
              <div className="text-center py-20 bg-prpm-dark-card border border-prpm-border rounded-lg">
                <PackageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No packages found in this category</p>
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
        </div>
      </main>
    )
  } catch (error) {
    console.error('Failed to load category:', error)
    return (
      <main className="min-h-screen bg-prpm-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Category Not Found</h2>
            <p className="text-gray-400 mb-6">The category you're looking for doesn't exist</p>
            <Link
              href="/categories"
              className="inline-block bg-prpm-accent hover:bg-prpm-accent-light text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse All Categories
            </Link>
          </div>
        </div>
      </main>
    )
  }
}
