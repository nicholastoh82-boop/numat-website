'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, ArrowLeft, Plus, Minus, Trash2, MessageCircle, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { QuoteForm } from '@/components/cart/quote-form'
import { useCurrency } from '@/components/providers/currency-provider'

const DISCOUNT_THRESHOLD = 20
const DOST_PDF_PATH = '/docs/DOST%20Results.pdf'

export function CartContent() {
  const {
    items,
    removeItem,
    updateQuantity,
    getTotalItems,
    getSubtotal,
    getDiscount,
    getTotal,
    getDiscountPercent,
  } = useCartStore()

  const { formatConvertedFromUsd } = useCurrency()
  const [showQuoteForm, setShowQuoteForm] = useState(false)

  const totalItems = getTotalItems()
  const subtotal = getSubtotal()
  const discount = getDiscount()
  const total = getTotal()
  const discountPercent = getDiscountPercent()
  const itemsUntilDiscount = Math.max(0, DISCOUNT_THRESHOLD - totalItems)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mb-4 font-serif text-3xl text-foreground">Your Cart is Empty</h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            Browse our premium bamboo products and add configured items to request a quote.
          </p>
          <Link href="/products">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Continue Shopping
      </Link>

      <h1 className="mb-8 font-serif text-3xl text-foreground">
        {showQuoteForm ? 'Request Quote' : 'Your Cart'}
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {itemsUntilDiscount > 0 && !showQuoteForm && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-foreground">
                Add <span className="font-semibold text-primary">{itemsUntilDiscount} more items</span> to unlock{' '}
                <span className="font-semibold">3% bulk discount</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min((totalItems / DISCOUNT_THRESHOLD) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {totalItems} / {DISCOUNT_THRESHOLD} items
              </p>
            </div>
          )}

          {showQuoteForm ? (
            <QuoteForm onBack={() => setShowQuoteForm(false)} />
          ) : (
            items.map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex gap-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl || '/placeholder.svg'}
                        alt={item.name || 'Product image'}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Leaf className="h-8 w-8 text-primary/40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.specs}</p>
                    <p className="mt-2 font-medium text-primary">
                      {formatConvertedFromUsd(item.unitPrice)} / {item.unit}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <input
                      type="number"
                      min={item.minOrderQty}
                      value={String(item.quantity ?? item.minOrderQty)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val)) updateQuantity(item.id, val)
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (isNaN(val) || val < item.minOrderQty) {
                          updateQuantity(item.id, item.minOrderQty)
                        }
                      }}
                      className="h-8 w-16 rounded-md border border-border bg-background text-center text-sm text-foreground"
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    <span className="ml-2 text-xs text-muted-foreground">MOQ: {item.minOrderQty}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-foreground">
                      {formatConvertedFromUsd(item.quantity * item.unitPrice)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium text-foreground">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatConvertedFromUsd(subtotal)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-primary">Bulk Discount ({discountPercent}%)</span>
                  <span className="font-medium text-primary">-{formatConvertedFromUsd(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="italic text-muted-foreground">Estimate to follow</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total (excl. VAT)</span>
                <span className="text-xl font-bold text-foreground">{formatConvertedFromUsd(total)}</span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Prices shown in your selected currency using live exchange rates.
            </p>

            <div className="mt-5 rounded-xl border border-black/8 bg-[#faf6ef] p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Third-party testing (ASTM D1037)
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/75">
                Selected engineered bamboo samples were tested by DOST RSTL (Region X), including static
                bending, compression, and hardness. Published as ranges to avoid cherry-picking.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-foreground/80">
                  MOR: 22.77–69.44 MPa
                </span>
                <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-foreground/80">
                  MOE: 2211.82–10256.71 MPa
                </span>
                <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-foreground/80">
                  Compression: 25.19–30.46 MPa
                </span>
                <span className="rounded-full border border-black/8 bg-white px-3 py-1 text-foreground/80">
                  Hardness: 3918.33–7377.33 N
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Results apply to submitted samples (Oct–Nov 2025) and may vary by configuration and lot.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/testing"
                  className="text-xs font-semibold text-primary hover:underline underline-offset-4"
                >
                  View testing page
                </Link>
                <a
                  href={DOST_PDF_PATH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline underline-offset-4"
                >
                  Download DOST results (PDF)
                </a>
              </div>
            </div>

            {!showQuoteForm && (
              <Button
                onClick={() => setShowQuoteForm(true)}
                size="lg"
                className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <MessageCircle className="h-5 w-5" />
                Request Quote
              </Button>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">Quote delivered via WhatsApp or Viber</p>
              <p className="mt-1 text-xs text-muted-foreground">Lead time: 10 working days | Validity: 14 days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}