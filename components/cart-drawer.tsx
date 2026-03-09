'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, Plus, Minus, Trash2, ShoppingCart, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/components/providers/currency-provider'

const DISCOUNT_THRESHOLD = 20

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    getTotalItems,
    getSubtotal,
    getDiscount,
    getTotal,
    getDiscountPercent,
  } = useCartStore()

  const { formatConvertedFromUsd } = useCurrency()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeCart])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const totalItems = getTotalItems()
  const subtotal = getSubtotal()
  const discount = getDiscount()
  const total = getTotal()
  const discountPercent = getDiscountPercent()
  const itemsUntilDiscount = Math.max(0, DISCOUNT_THRESHOLD - totalItems)

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeCart}
      />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md transform flex-col bg-background shadow-2xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">Your Cart</h2>
          <Button variant="ghost" size="icon" onClick={closeCart} aria-label="Close cart">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-4 text-muted-foreground">Your cart is empty</p>
              <Link href="/products" onClick={closeCart}>
                <Button variant="outline" className="bg-transparent">
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsUntilDiscount > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm text-foreground">
                    Add <span className="font-semibold text-primary">{itemsUntilDiscount} more items</span> to get{' '}
                    <span className="font-semibold">3% off</span>
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min((totalItems / DISCOUNT_THRESHOLD) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl ? (
                        <Image
  src={item.imageUrl || '/placeholder.svg'}
  alt={item.name || 'Product image'}
  width={64}
  height={64}
  className="h-full w-full object-cover"
/>  
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Leaf className="h-6 w-6 text-primary/40" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-sm font-medium leading-tight text-foreground">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {item.specs}
                      </p>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {formatConvertedFromUsd(item.unitPrice)} / {item.unit}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
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
                      <span className="w-12 text-center font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-transparent"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-foreground">
                      {formatConvertedFromUsd(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-border bg-card p-4">
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
            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-semibold text-foreground">Total (excl. VAT)</span>
              <span className="text-lg font-bold text-foreground">{formatConvertedFromUsd(total)}</span>
            </div>
            <p className="text-center text-xs text-muted-foreground">Shipping estimate to follow</p>
            <Link href="/cart" onClick={closeCart} className="block">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Request Quote
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}