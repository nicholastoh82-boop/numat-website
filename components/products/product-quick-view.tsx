'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Plus, Minus, ShoppingCart, Leaf, Package, Ruler, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductWithCategory } from '@/lib/supabase/types'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'

interface ProductQuickViewProps {
  product: ProductWithCategory
  onClose: () => void
}

export function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  const minQty = product.min_order_qty ?? 1
  const [quantity, setQuantity] = useState(minQty)
  const { addItem, openCart } = useCartStore()
  const { toast } = useToast()

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

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
    onClose()
    openCart()
  }

  const incrementQty = () => setQuantity(q => q + 1)
  const decrementQty = () => setQuantity(q => Math.max(minQty, q - 1))
  const lineTotal = quantity * (product.base_price ?? 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square bg-muted flex items-center justify-center">
            {product.image_url ? (
              <Image
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Leaf className="w-12 h-12 text-primary/40" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {/* Category */}
            {product.categories && (
              <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3">
                {product.categories.name}
              </span>
            )}

            {/* SKU */}
            <p className="text-sm text-muted-foreground">SKU: {product.slug}</p>

            {/* Title */}
            <h2 className="font-serif text-2xl text-foreground mt-1">
              {product.name}
            </h2>

            {/* Description */}
            {product.description && (
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Specs */}
            <div className="mt-6 space-y-3">
              {(product.thickness || (product.width && product.length)) && (
                <div className="flex items-center gap-3 text-sm">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="text-foreground font-medium">
                    {product.thickness} x {product.width} x {product.length}
                  </span>
                </div>
              )}
              {product.color && (
                <div className="flex items-center gap-3 text-sm">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Color:</span>
                  <span className="text-foreground font-medium">{product.color}</span>
                </div>
              )}
              {product.finish && (
                <div className="flex items-center gap-3 text-sm">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Finish:</span>
                  <span className="text-foreground font-medium">{product.finish}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Unit Price</span>
                {product.base_price ? (
                  <span className="text-lg font-semibold text-primary">
                    PHP {product.base_price.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-primary">Request Quote</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                per {product.unit || 'pcs'} | MOQ: {minQty} {product.unit || 'pcs'}
              </p>
            </div>

            {/* Quantity */}
            <div className="mt-6">
              <label className="text-sm font-medium text-foreground">Quantity</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-r-none"
                    onClick={decrementQty}
                    disabled={quantity <= minQty}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <input
                    type="number"
                    min={minQty}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(minQty, parseInt(e.target.value) || minQty))}
                    className="w-16 text-center text-foreground font-medium bg-transparent border-0 focus:outline-none focus:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-l-none"
                    onClick={incrementQty}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">{product.unit}</span>
              </div>
            </div>

            {/* Line total */}
            {product.base_price && (
              <div className="mt-4 flex justify-between items-center py-3 border-t border-border">
                <span className="font-medium text-foreground">Line Total</span>
                <span className="text-xl font-semibold text-foreground">
                  PHP {lineTotal.toLocaleString()}
                </span>
              </div>
            )}

            {/* Add to cart */}
            <Button
              onClick={handleAddToCart}
              size="lg"
              className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Quote
            </Button>

            <p className="mt-3 text-xs text-center text-muted-foreground">
              Quote validity: 14 days | Shipping estimate to follow
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
