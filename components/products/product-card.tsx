'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Plus, Minus, ShoppingCart, Leaf, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/components/providers/currency-provider'

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug?: string
    sku?: string
    image_url?: string | null
    images?: Array<{ id: string; image_url: string; alt_text?: string }>
    category?: string | { id?: string; name?: string } | null
    categories?: { id: string; name: string } | null
    is_featured?: boolean
    thickness?: string | number | null
    size?: string | null
    color?: string | null
    finish?: string | null
    width?: string | number | null
    length?: string | number | null
    min_order_qty?: number | null
    unit?: string | null
    base_price_usd?: number | null
    starting_price_usd?: number | null
  }
  onQuickView: () => void
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getCategoryName(product: ProductCardProps['product']) {
  if (typeof product.category === 'string') return product.category
  if (product.category && typeof product.category === 'object' && typeof product.category.name === 'string') {
    return product.category.name
  }
  if (typeof product.categories?.name === 'string') return product.categories.name
  return ''
}

function getFallbackImageByCategory(categoryName: string) {
  const slug = slugify(categoryName)

  const map: Record<string, string> = {
    furniture: '/Bamboo-Furniture.png',

    door: '/Bamboo-Door.png',
    nudoor: '/Bamboo-Door.png',

    flooring: '/Bamboo-Flooring.png',
    floor: '/Bamboo-Flooring.png',
    nufloor: '/Bamboo-Flooring.png',

    wall: '/Bamboo-Wall.png',
    'wall-panelling': '/Bamboo-Wall.png',
    'wall-paneling': '/Bamboo-Wall.png',
    nuwall: '/Bamboo-Wall.png',

    veneer: '/Bamboo-Board.png',
    nubam: '/Bamboo-Board.png',
    'nubam-boards': '/Bamboo-Board.png',

    diy: '/Bamboo-Slat.png',
    'diy-project': '/Bamboo-Slat.png',
    'diy-projects': '/Bamboo-Slat.png',
    nuslat: '/Bamboo-Slat.png',
  }

  return map[slug] || '/placeholder.svg'
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const minQty = product.min_order_qty ?? 1
  const [quantity, setQuantity] = useState(minQty)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem, openCart } = useCartStore()
  const { toast } = useToast()
  const { formatConvertedFromUsd } = useCurrency()

  const categoryName = getCategoryName(product)
  const categoryFallbackImage = getFallbackImageByCategory(categoryName)

  const productImages = useMemo(() => {
    const images = product.images && product.images.length > 0 ? [...product.images] : []

    if (product.image_url && !images.find((img) => img.image_url === product.image_url)) {
      images.unshift({
        id: 'main',
        image_url: product.image_url,
        alt_text: product.name,
      })
    }

    if (images.length === 0) {
      images.push({
        id: 'fallback',
        image_url: categoryFallbackImage,
        alt_text: product.name,
      })
    }

    return images
  }, [product, categoryFallbackImage])

  const currentImage = productImages[currentImageIndex]
  const hasMultipleImages = productImages.length > 1
  const displayUsdPrice = product.starting_price_usd ?? product.base_price_usd ?? null

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))
  }

  const handleAddToCart = () => {
    if (quantity < minQty) {
      toast({
        title: 'Minimum Order Quantity',
        description: `Minimum order quantity is ${minQty} ${product.unit || 'pcs'}.`,
        variant: 'destructive',
      })
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      specs: `${product.thickness || ''} ${product.width || ''} ${product.length || ''} ${product.color || ''} ${product.finish || ''}`.trim(),
      quantity,
      unitPrice: displayUsdPrice ?? 0,
      minOrderQty: minQty,
      unit: product.unit || 'pcs',
      imageUrl: currentImage?.image_url || categoryFallbackImage,
    })

    toast({
      title: 'Added to Cart',
      description: `${quantity}x ${product.name} added to your cart.`,
    })

    openCart()
  }

  const incrementQty = () => setQuantity((q) => q + 1)
  const decrementQty = () => setQuantity((q) => Math.max(minQty, q - 1))

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
      <div className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        <Link href={`/products/${product.id}`} className="block h-full w-full">
          {currentImage?.image_url ? (
            <Image
              src={currentImage.image_url}
              alt={currentImage.alt_text || product.name || 'Product image'}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Leaf className="h-12 w-12 text-primary/40" />
              </div>
            </div>
          )}
        </Link>

        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition-all duration-300 hover:bg-background group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition-all duration-300 hover:bg-background group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
              {currentImageIndex + 1} / {productImages.length}
            </div>
          </>
        )}

        {product.categories && (
          <div className="absolute left-3 top-3 z-20">
            <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {product.categories.name}
            </span>
          </div>
        )}

        {product.is_featured && (
          <div className="absolute right-3 top-3 z-20">
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">
              ⭐ Featured
            </span>
          </div>
        )}

        <button
          onClick={onQuickView}
          className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl group-hover:opacity-100"
          aria-label="Quick view"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-grow flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">SKU: {product.sku || '—'}</p>
          {hasMultipleImages && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
              {productImages.length} images
            </span>
          )}
        </div>

        <Link href={`/products/${product.id}`} className="transition-colors hover:text-primary">
          <h3 className="min-h-[2.5rem] line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {product.name}
          </h3>
        </Link>

        {(product.thickness || product.size || product.color) && (
          <div className="flex flex-wrap gap-2 py-1.5">
            {product.thickness && (
              <span className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-2.5 py-1 text-xs font-medium text-foreground">
                {product.thickness}mm
              </span>
            )}
            {product.size && (
              <span className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-2.5 py-1 text-xs font-medium text-foreground">
                {product.size}
              </span>
            )}
            {product.color && (
              <span className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 px-2.5 py-1 text-xs font-medium text-foreground">
                {product.color}
              </span>
            )}
          </div>
        )}

        <div className="flex-grow" />

        <div className="border-t border-border pt-2">
          {displayUsdPrice ? (
            <div>
              <p className="mb-0.5 text-xs text-muted-foreground">Starting at</p>
              <p className="text-2xl font-bold text-primary">
                {formatConvertedFromUsd(displayUsdPrice)}
              </p>
              <p className="text-xs text-muted-foreground">per {product.unit || 'sheet'}</p>
            </div>
          ) : (
            <p className="text-lg font-bold text-primary">Request Quote</p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Quantity:</label>
            <div className="flex items-center overflow-hidden rounded-lg border border-primary/30 bg-primary/5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-r-none hover:bg-primary/20"
                onClick={decrementQty}
                disabled={quantity <= minQty}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-10 text-center text-xs font-bold text-foreground">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-l-none hover:bg-primary/20"
                onClick={incrementQty}
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/90 font-semibold text-primary-foreground shadow-md transition-all duration-300 hover:from-primary/90 hover:to-primary/80 hover:shadow-lg"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Quote
          </Button>

          
        </div>
      </div>
    </div>
  )
}