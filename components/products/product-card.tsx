'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, Plus, Minus, ShoppingCart, Leaf, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductWithCategory } from '@/lib/supabase/types'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'

interface ProductCardProps {
  product: ProductWithCategory & { images?: Array<{ id: string; image_url: string; alt_text?: string }> }
  onQuickView: () => void
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const minQty = product.min_order_qty ?? 1
  const [quantity, setQuantity] = useState(minQty)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const { addItem, openCart } = useCartStore()
  const { toast } = useToast()

  // Get all images for carousel
  const productImages = useMemo(() => {
    const images = product.images && product.images.length > 0 ? product.images : []
    if (product.image_url && !images.find(img => img.image_url === product.image_url)) {
      images.unshift({
        id: 'main',
        image_url: product.image_url,
        alt_text: product.name
      })
    }
    return images.length > 0 ? images : [{
      id: 'placeholder',
      image_url: '/placeholder.svg',
      alt_text: product.name
    }]
  }, [product])

  const currentImage = productImages[currentImageIndex]
  const hasMultipleImages = productImages.length > 1

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImageIndex((prev) => prev === 0 ? productImages.length - 1 : prev - 1)
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrentImageIndex((prev) => prev === productImages.length - 1 ? 0 : prev + 1)
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
      specs: `${product.thickness || ''} x ${product.width || ''} x ${product.length || ''} | ${product.color || ''} | ${product.finish || ''}`,
      quantity,
      unitPrice: product.base_price ?? 0,
      minOrderQty: minQty,
      unit: product.unit || 'pcs',
      imageUrl: product.image_url,
    })
    toast({
      title: 'Added to Cart',
      description: `${quantity}x ${product.name} added to your cart.`,
    })
    openCart()
  }

  const incrementQty = () => setQuantity(q => q + 1)
  const decrementQty = () => setQuantity(q => Math.max(minQty, q - 1))

  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-primary/50 flex flex-col h-full">
      {/* Product image section with carousel */}
      <div className="relative w-full h-72 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
        <Link href={`/products/${product.id}`} className="block w-full h-full">
          {currentImage?.image_url ? (
            <Image
              src={currentImage.image_url}
              alt={currentImage.alt_text || product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Leaf className="w-12 h-12 text-primary/40" />
              </div>
            </div>
          )}
        </Link>

        {/* Image carousel controls */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 hover:bg-background backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 hover:bg-background backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Image counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {currentImageIndex + 1} / {productImages.length}
            </div>
          </>
        )}

        {/* Category badge */}
        {product.categories && (
          <div className="absolute top-3 left-3 z-20">
            <span className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
              {product.categories.name}
            </span>
          </div>
        )}

        {/* Featured badge */}
        {product.is_featured && (
          <div className="absolute top-3 right-3 z-20">
            <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
              ⭐ Featured
            </span>
          </div>
        )}

        {/* Quick view button */}
        <button
          onClick={onQuickView}
          className="absolute bottom-3 right-3 w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl z-20"
          aria-label="Quick view"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* Content - grows to fill space */}
      <div className="p-5 flex flex-col flex-grow gap-3">
        {/* SKU and category inline */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">SKU: {product.sku}</p>
          {hasMultipleImages && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
              {productImages.length} images
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/products/${product.id}`} className="hover:text-primary transition-colors">
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem] text-base">
            {product.name}
          </h3>
        </Link>

        {/* Specs - more visual */}
        {(product.thickness || product.size || product.color) && (
          <div className="flex flex-wrap gap-2 py-1.5">
            {product.thickness && (
              <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-md text-foreground font-medium border border-primary/20">
                {product.thickness}mm
              </span>
            )}
            {product.size && (
              <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-md text-foreground font-medium border border-primary/20">
                {product.size}
              </span>
            )}
            {product.color && (
              <span className="text-xs px-2.5 py-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-md text-foreground font-medium border border-primary/20">
                {product.color}
              </span>
            )}
          </div>
        )}

        {/* Spacer to push buttons down */}
        <div className="flex-grow" />

        {/* Price - more prominent */}
        <div className="pt-2 border-t border-border">
          {product.base_price ? (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Starting at</p>
              <p className="text-2xl font-bold text-primary">
                PHP {product.base_price.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">per {product.unit}</p>
            </div>
          ) : (
            <p className="text-lg font-bold text-primary">Request Quote</p>
          )}
        </div>

        {/* Quantity selector and button - inline for better space usage */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Quantity:</label>
            <div className="flex items-center border border-primary/30 bg-primary/5 rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-r-none hover:bg-primary/20"
                onClick={decrementQty}
                disabled={quantity <= minQty}
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
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
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Quote
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            MOQ: <span className="font-semibold text-foreground">{minQty}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
