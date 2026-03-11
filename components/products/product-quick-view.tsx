'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Ruler, Palette, Package, FileText, MessageSquareQuote } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-background shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-muted">
            <Image
              src={product.image_url || '/placeholder.svg'}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-6">
            {product.categories && (
              <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {product.categories.name}
              </span>
            )}

            <p className="text-sm text-muted-foreground">Reference: {product.slug || '—'}</p>
            <h2 className="mt-2 font-serif text-2xl text-foreground">{product.name}</h2>

            {product.description && (
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {product.description}
              </p>
            )}

            <div className="mt-6 space-y-3">
              {(product.thickness || product.width || product.length) && (
                <div className="flex items-start gap-3 text-sm">
                  <Ruler className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Dimensions</p>
                    <p className="text-muted-foreground">
                      {product.thickness || '—'} mm × {product.width || '—'} × {product.length || '—'}
                    </p>
                  </div>
                </div>
              )}

              {product.color && (
                <div className="flex items-start gap-3 text-sm">
                  <Palette className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Color</p>
                    <p className="text-muted-foreground">{product.color}</p>
                  </div>
                </div>
              )}

              {product.finish && (
                <div className="flex items-start gap-3 text-sm">
                  <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Finish</p>
                    <p className="text-muted-foreground">{product.finish}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Pricing</span>
                {displayUsdPrice ? (
                  <span className="text-lg font-semibold text-primary">
                    From {formatConvertedFromUsd(displayUsdPrice)}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-primary">Available on request</span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                MOQ: {product.min_order_qty || 1} {product.unit || 'pcs'} · Freight and final commercial terms subject to quotation
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Link href={`/products/${product.id}`} onClick={onClose}>
                <Button variant="outline" className="w-full gap-2">
                  <FileText className="h-4 w-4" />
                  View Full Details
                </Button>
              </Link>

              <Link href="/cart" onClick={onClose}>
                <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <MessageSquareQuote className="h-4 w-4" />
                  Request Quote
                </Button>
              </Link>

              <Link href="/request-samples" onClick={onClose}>
                <Button
                  variant="ghost"
                  className="w-full border border-border bg-transparent hover:bg-muted"
                >
                  Request Samples
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Technical documents and availability can be confirmed by our sales team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}