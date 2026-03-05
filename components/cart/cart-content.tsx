'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, ArrowLeft, Plus, Minus, Trash2, MessageCircle, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { QuoteForm } from '@/components/cart/quote-form'

const DISCOUNT_THRESHOLD = 20

export function CartContent() {
  const {
    items,
    removeItem,
    updateQuantity,
    getTotalItems,
    getSubtotal,
    getDiscount,
    getTotal,
    getDiscountPercent
  } = useCartStore()

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
          <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-6">
            <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Browse our premium bamboo products and add items to your cart to request a quote.
          </p>
          <Link href="/products">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
      {/* Back link */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Continue Shopping
      </Link>

      <h1 className="font-serif text-3xl text-foreground mb-8">
        {showQuoteForm ? 'Request Quote' : 'Your Cart'}
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Discount progress */}
          {itemsUntilDiscount > 0 && !showQuoteForm && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-sm text-foreground">
                Add <span className="font-semibold text-primary">{itemsUntilDiscount} more items</span> to unlock{' '}
                <span className="font-semibold">3% bulk discount</span>
              </p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
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
            /* Cart items list */
            items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 sm:p-6"
              >
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Leaf className="w-8 h-8 text-primary/40" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.specs}
                    </p>
                    <p className="text-primary font-medium mt-2">
                      PHP {item.unitPrice.toLocaleString()} / {item.unit}
                    </p>
                  </div>
                </div>

                {/* Quantity and actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      min="0"
                      max="999999"
                      value={String(item.quantity ?? item.minOrderQty)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val >= 0) {
                          updateQuantity(item.id, val)
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (isNaN(val) || val < item.minOrderQty) {
                          updateQuantity(item.id, item.minOrderQty)
                        }
                      }}
                      className="w-16 h-8 text-center border border-border rounded-md text-foreground bg-background text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-transparent"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground ml-2">
                      MOQ: {item.minOrderQty}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold text-foreground">
                      PHP {(item.quantity * item.unitPrice).toLocaleString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
            <h2 className="font-semibold text-lg text-foreground mb-4">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium text-foreground">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">PHP {subtotal.toLocaleString()}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-primary">Bulk Discount ({discountPercent}%)</span>
                  <span className="font-medium text-primary">-PHP {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-3 border-t border-border">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground italic">Estimate to follow</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="font-semibold text-foreground">Total (excl. VAT)</span>
                <span className="font-bold text-xl text-foreground">PHP {total.toLocaleString()}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground text-center">
              Prices Ex Factory CDO. VAT excluded.
            </p>

            {!showQuoteForm && (
              <Button
                onClick={() => setShowQuoteForm(true)}
                size="lg"
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Request Quote
              </Button>
            )}

            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Quote delivered via WhatsApp, Viber, or Email
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Lead time: 10 working days | Validity: 14 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
