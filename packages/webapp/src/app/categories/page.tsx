'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCategories } from '@/lib/api'
import type { CategoryWithChildren } from '@/lib/api'
import { Folder, Package, ChevronRight } from 'lucide-react'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPackages, setTotalPackages] = useState(0)

  useEffect(() => {
    async function loadCategories() {
      try {
        const result = await getCategories(true)
        setCategories(result.categories)
        setTotalPackages(result.total_packages)
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
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
          <h1 className="text-4xl font-bold text-white mb-2">Browse by Category</h1>
          <p className="text-gray-400">
            Explore {totalPackages.toLocaleString()} packages organized by category
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-prpm-dark-card border border-prpm-border rounded-lg p-6 hover:border-prpm-accent transition-colors"
            >
              {/* Category Header */}
              <Link href={`/categories/${category.slug}`} className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-prpm-accent/10 rounded-lg group-hover:bg-prpm-accent/20 transition-colors">
                    <Folder className="w-6 h-6 text-prpm-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-prpm-accent transition-colors">
                      {category.name}
                    </h3>
                    {category.package_count !== undefined && (
                      <p className="text-sm text-gray-400">
                        {category.package_count} packages
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-prpm-accent transition-colors" />
                </div>

                {category.description && (
                  <p className="text-gray-400 text-sm mb-4">
                    {category.description}
                  </p>
                )}
              </Link>

              {/* Subcategories */}
              {category.children && category.children.length > 0 && (
                <div className="space-y-2 mt-4 pt-4 border-t border-prpm-border">
                  {category.children.slice(0, 4).map((subcategory: CategoryWithChildren) => (
                    <Link
                      key={subcategory.id}
                      href={`/categories/${subcategory.slug}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-prpm-dark transition-colors group"
                    >
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {subcategory.name}
                      </span>
                      {subcategory.package_count !== undefined && (
                        <span className="text-xs text-gray-500 group-hover:text-gray-400">
                          {subcategory.package_count}
                        </span>
                      )}
                    </Link>
                  ))}
                  {category.children.length > 4 && (
                    <Link
                      href={`/categories/${category.slug}`}
                      className="block text-sm text-prpm-accent hover:text-prpm-accent-light mt-2"
                    >
                      +{category.children.length - 4} more →
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {categories.length === 0 && !loading && (
          <div className="text-center py-20">
            <Folder className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No categories available yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Categories will appear here once the taxonomy is generated
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
