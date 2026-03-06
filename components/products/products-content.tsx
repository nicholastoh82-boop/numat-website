'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductCard } from '@/components/products/product-card'
import { ProductQuickView } from '@/components/products/product-quick-view'

type ProductVariant = {
  id: string
  product_id: string
  sku: string
  size_label: string
  length_mm: number
  width_mm: number
  thickness_mm: number
  core_type: string | null
  ply_count: number | null
  unit: string | null
  moq: number | null
  currency: string | null
  unit_price: number | null
  is_price_on_request?: boolean
  price_notes?: string | null
  is_active?: boolean
  sort_order?: number | null
}

type ProductApiItem = {
  id: string
  name: string
  title?: string
  slug: string
  description?: string
  image_url?: string
  category: string
  unit_price: number | null
  created_at?: string
  variants: ProductVariant[]
}

type Category = {
  id: string
  name: string
  created_at?: string
  is_active?: boolean
  display_order?: number | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialCategory = (searchParams.get('category') || 'all').toLowerCase()

  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'latest-updated' | 'price-asc' | 'price-desc' | 'name'>('newest')
  const [quickViewProduct, setQuickViewProduct] = useState<ProductApiItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const handleCategoryChange = useCallback(
    (category: string | null) => {
      const normalizedCategory = (category ?? 'all').toLowerCase()
      setSelectedCategory(normalizedCategory)

      if (normalizedCategory === 'all') {
        router.push('/products', { scroll: false })
      } else {
        router.push(`/products?category=${normalizedCategory}`, { scroll: false })
      }
    },
    [router]
  )

  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useSWR<ProductApiItem[]>('/api/products', fetcher, {
    fallbackData: [],
  })

  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher, {
    fallbackData: [],
  })

  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) {
      setSelectedCategory(cat.toLowerCase())
    } else {
      setSelectedCategory('all')
    }
  }, [searchParams])

  const filteredProducts = useMemo(() => {
    if (!products) return []

    let filtered = [...products]

    if (selectedCategory !== 'all') {
      const normalizedCategory = selectedCategory.toLowerCase()
      filtered = filtered.filter((p) => {
        const categoryName = p.category?.toLowerCase() ?? ''
        return slugify(categoryName) === normalizedCategory
      })
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p) => {
        return (
          p.name?.toLowerCase().includes(query) ||
          p.slug?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          (p.variants ?? []).some((v) =>
            [
              v.sku,
              v.core_type ?? '',
              String(v.thickness_mm ?? ''),
              String(v.ply_count ?? ''),
            ]
              .join(' ')
              .toLowerCase()
              .includes(query)
          )
        )
      })
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        break
      case 'latest-updated':
        filtered.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        break
      case 'price-asc':
        filtered.sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0))
        break
      case 'price-desc':
        filtered.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0))
        break
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return filtered
  }, [products, selectedCategory, searchQuery, sortBy])

  const allCategories = useMemo(() => {
    return categories ?? []
  }, [categories])

  const selectedCategoryName =
    allCategories.find((c) => slugify(c.name) === selectedCategory)?.name || 'All Products'

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
              {selectedCategoryName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {productsLoading
                ? 'Loading...'
                : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} available`}
            </p>
            {productsError && (
              <p className="mt-2 text-sm text-red-600">
                Failed to load products: {productsError.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="bg-transparent lg:hidden"
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <CategoryFilters
              categories={allCategories}
              selectedSlug={selectedCategory === 'all' ? null : selectedCategory}
              onSelectSlug={handleCategoryChange}
            />
          </aside>

          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
                onClick={() => setShowFilters(false)}
              />
              <div className="absolute left-0 top-0 h-full w-72 bg-background p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Filters</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <CategoryFilters
                  categories={allCategories}
                  selectedSlug={selectedCategory === 'all' ? null : selectedCategory}
                  onSelectSlug={(slug) => {
                    handleCategoryChange(slug)
                    setShowFilters(false)
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex-1">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center">
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product as any}
                    onQuickView={() => setQuickViewProduct(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct as any}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  )
}

interface CategoryFiltersProps {
  categories: Category[]
  selectedSlug: string | null
  onSelectSlug: (slug: string | null) => void
}

function CategoryFilters({ categories, selectedSlug, onSelectSlug }: CategoryFiltersProps) {
  const sorted = [...categories]
    .filter((c) => c.is_active !== false)
    .sort((a, b) => {
      const ao = a.display_order ?? 999999
      const bo = b.display_order ?? 999999
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Categories</div>

      <button type="button" onClick={() => onSelectSlug(null)} style={{ marginBottom: 8 }}>
        All Products
      </button>

      {sorted.map((c) => {
        const slug = slugify(c.name)
        const selected = slug === (selectedSlug ?? '')

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectSlug(slug)}
            style={{
              display: 'block',
              fontWeight: selected ? 'bold' : 'normal',
            }}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}