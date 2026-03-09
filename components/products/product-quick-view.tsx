'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Plus, Minus, ShoppingCart, Leaf, Package, Ruler, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/components/providers/currency-provider'

interface ProductQuickViewProps {
  product: {
    id: string
    name: string
    slug?: string
    description?: string
    image_url?: string | null
    categories?: { id: string; name: string } | null
    thickness?: string | number | null
    width?: string | number | null
    length?: string | number | null
    color?: string | null
    finish?: string | null
    base_price_usd?: number | null
    starting_price_usd?: number | null
    min_order_qty?: number | null
    unit?: string | null
  }
  onClose: () => void
}

export function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  const minQty = product.min_order_qty ?? 1
  const [quantity, setQuantity] = useState(minQty)
  const { addItem, openCart } = useCartStore()
  const { toast } = useToast()
  const { formatConvertedFromUsd } = useCurrency()

  const displayUsdPrice = product.starting_price_usd ?? product.base_price_usd ?? null

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
      specs: `${product.thickness || ''} ${product.width || ''} ${product.length || ''} ${product.color || ''} ${product.finish || ''}`.trim(),
      quantity,
      unitPrice: displayUsdPrice ?? 0,
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

  const incrementQty = () => setQuantity((q) => q + 1)
  const decrementQty = () => setQuantity((q) => Math.max(minQty, q - 1))
  const lineTotal = displayUsdPrice ? quantity * displayUsdPrice : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-muted flex items-center justify-center">
            {product.image_url ? (
              <Image
                src={product.image_url || '/placeholder.svg'}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Leaf className="h-12 w-12 text-primary/40" />
              </div>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-6">
            {product.categories && (
              <span className="mb-3 inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {product.categories.name}
              </span>
            )}

            <p className="text-sm text-muted-foreground">SKU: {product.slug || '—'}</p>

            <h2 className="mt-1 font-serif text-2xl text-foreground">{product.name}</h2>

            {product.description && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            <div className="mt-6 space-y-3">
              {(product.thickness || (product.width && product.length)) && (
                <div className="flex items-center gap-3 text-sm">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-medium text-foreground">
                    {product.thickness} x {product.width} x {product.length}
                  </span>
                </div>
              )}

              {product.color && (
                <div className="flex items-center gap-3 text-sm">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Color:</span>
                  <span className="font-medium text-foreground">{product.color}</span>
                </div>
              )}

              {product.finish && (
                <div className="flex items-center gap-3 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Finish:</span>
                  <span className="font-medium text-foreground">{product.finish}</span>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unit Price</span>
                {displayUsdPrice ? (
                  <span className="text-lg font-semibold text-primary">
                    {formatConvertedFromUsd(displayUsdPrice)}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-primary">Request Quote</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                per {product.unit || 'pcs'} | MOQ: {minQty} {product.unit || 'pcs'}
              </p>
            </div>

            <div className="mt-6">
              <label className="text-sm font-medium text-foreground">Quantity</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-r-none"
                    onClick={decrementQty}
                    disabled={quantity <= minQty}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <input
                    type="number"
                    min={minQty}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(minQty, parseInt(e.target.value) || minQty))
                    }
                    className="w-16 border-0 bg-transparent text-center font-medium text-foreground focus:outline-none focus:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-l-none"
                    onClick={incrementQty}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">{product.unit || 'pcs'}</span>
              </div>
            </div>

            {lineTotal && (
              <div className="mt-4 flex items-center justify-between border-t border-border py-3">
                <span className="font-medium text-foreground">Line Total</span>
                <span className="text-xl font-semibold text-foreground">
                  {formatConvertedFromUsd(lineTotal)}
                </span>
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              size="lg"
              className="mt-4 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingCart className="h-5 w-5" />
              Add to Quote
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Quote validity: 14 days | Shipping estimate to follow
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}