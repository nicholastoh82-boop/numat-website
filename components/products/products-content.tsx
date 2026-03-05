'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductCard } from '@/components/products/product-card'
import { ProductQuickView } from '@/components/products/product-quick-view'
import type { ProductWithCategory, Category } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

export function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialCategory = (searchParams.get('category') || 'all').toLowerCase()
  
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  
  // Handle category change and update URL
  const handleCategoryChange = useCallback((category: string) => {
    const normalizedCategory = category.toLowerCase()
    setSelectedCategory(normalizedCategory)
    
    // Update URL without page reload
    if (normalizedCategory === 'all') {
      router.push('/products', { scroll: false })
    } else {
      router.push(`/products?category=${normalizedCategory}`, { scroll: false })
    }
  }, [router])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'latest-updated' | 'price-asc' | 'price-desc' | 'name'>('newest')
  const [quickViewProduct, setQuickViewProduct] = useState<ProductWithCategory | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: products, isLoading: productsLoading, error: productsError } = useSWR<ProductWithCategory[]>(
    '/api/products',
    fetcher,
    { fallbackData: [] }
  )

  const { data: categories } = useSWR<Category[]>(
    '/api/categories',
    fetcher,
    { fallbackData: [] }
  )

  // Update category from URL params
  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) {
      // Normalize category to lowercase for consistent matching
      setSelectedCategory(cat.toLowerCase())
    }
  }, [searchParams])

  const filteredProducts = useMemo(() => {
    if (!products) return []
    
    let filtered = [...products]

    // Filter by category - check both the category text field and the categories relationship
    if (selectedCategory !== 'all') {
      const normalizedCategory = selectedCategory.toLowerCase()
      filtered = filtered.filter(p => {
        // Check categories relationship (slug)
        if (p.categories?.slug?.toLowerCase() === normalizedCategory) return true
        // Check categories relationship (name)
        if (p.categories?.name?.toLowerCase() === normalizedCategory) return true
        // Check legacy category text field
        if (p.category?.toLowerCase() === normalizedCategory) return true
        // Check if slug matches with hyphen variations
        const slugWithHyphens = normalizedCategory.replace(/\s+/g, '-')
        if (p.categories?.slug === slugWithHyphens) return true
        return false
      })
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      )
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        break
      case 'latest-updated':
        filtered = filtered.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
        break
      case 'price-asc':
        filtered = filtered.sort((a, b) => (a.base_price || 0) - (b.base_price || 0))
        break
      case 'price-desc':
        filtered = filtered.sort((a, b) => (b.base_price || 0) - (a.base_price || 0))
        break
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return filtered
  }, [products, selectedCategory, searchQuery, sortBy])

  const allCategories = useMemo(() => {
    const cats = [{ slug: 'all', name: 'All Products' }]
    if (categories) {
      cats.push(...categories.map(c => ({ slug: c.slug, name: c.name })))
    }
    return cats
  }, [categories])

  const selectedCategoryName = allCategories.find(c => c.slug.toLowerCase() === selectedCategory.toLowerCase())?.name || 'All Products'

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground">
              {selectedCategoryName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {productsLoading ? 'Loading...' : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} available`}
            </p>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="newest">Newest First</option>
                <option value="latest-updated">Latest Updated</option>
                <option value="name">Sort by Name</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden bg-transparent"
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <CategoryFilters
              categories={allCategories}
              selected={selectedCategory}
              onSelect={handleCategoryChange}
            />
          </aside>

          {/* Mobile filters */}
          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
              <div className="absolute left-0 top-0 h-full w-72 bg-background p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold text-foreground">Filters</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <CategoryFilters
                  categories={allCategories}
                  selected={selectedCategory}
                  onSelect={(cat) => {
                    handleCategoryChange(cat)
                    setShowFilters(false)
                  }}
                />
              </div>
            </div>
          )}

          {/* Products grid */}
          <div className="flex-1">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching your criteria.</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    handleCategoryChange('all')
                    setSearchQuery('')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickView={() => setQuickViewProduct(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick view modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  )
}

interface CategoryFiltersProps {
  categories: { slug: string; name: string }[]
  selected: string
  onSelect: (category: string) => void
}

function CategoryFilters({ categories, selected, onSelect }: CategoryFiltersProps) {
  return (
    <div className="space-y-1">
      <h3 className="font-medium text-foreground mb-3">Categories</h3>
      {categories.map((category) => (
        <button
          key={category.slug}
          onClick={() => onSelect(category.slug)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
            selected === category.slug
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
