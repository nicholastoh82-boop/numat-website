'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Leaf,
  ArrowRight,
  Clock,
  MessageCircle,
  FileText,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { QuoteForm } from '@/components/cart/quote-form'
import { useCurrency } from '@/components/providers/currency-provider'

const DISCOUNT_THRESHOLD = 20
const DOST_PDF_PATH = '/docs/DOST%20Results.pdf'

const STEPS = [
  { number: 1, label: 'Review Cart' },
  { number: 2, label: 'Your Details' },
  { number: 3, label: 'Confirmation' },
]

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
  const currentStep = showQuoteForm ? 2 : 1

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-stone-100">
            <ShoppingCart className="h-10 w-10 text-stone-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-950">Your quote list is empty</h1>
          <p className="mx-auto mt-3 text-base text-stone-500">
            Browse our products, configure your specs, and add items to request a quote.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900"
          >
            Browse Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f1e8]">
      {/* Progress bar */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex flex-1 items-center">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    currentStep === step.number
                      ? 'bg-stone-950 text-white'
                      : currentStep > step.number
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-400'
                  }`}>
                    {currentStep > step.number ? <CheckCircle className="h-4 w-4" /> : step.number}
                  </div>
                  <span className={`hidden text-sm font-semibold sm:block ${
                    currentStep === step.number ? 'text-stone-950' : 'text-stone-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mx-4 flex-1 h-px bg-stone-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-12">
        <div className="mb-6">
          {showQuoteForm ? (
            <button
              onClick={() => setShowQuoteForm(false)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-stone-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Cart
            </button>
          ) : (
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition hover:text-stone-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-4 lg:col-span-2">

            {!showQuoteForm && (
              <>
                <h1 className="text-2xl font-bold text-stone-950">Review Your Quote List</h1>

                {/* Discount progress */}
                {itemsUntilDiscount > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">
                      Add {itemsUntilDiscount} more items to unlock a 3% bulk discount
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${Math.min((totalItems / DISCOUNT_THRESHOLD) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-emerald-600">{totalItems} / {DISCOUNT_THRESHOLD} items</p>
                  </div>
                )}

                {/* Cart items */}
                {items.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name || 'Product'}
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Leaf className="h-8 w-8 text-emerald-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-stone-950">{item.name}</h3>
                        <p className="mt-1 text-sm text-stone-500">{item.specs}</p>
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          {formatConvertedFromUsd(item.unitPrice)} / {item.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-y-3 border-t border-stone-100 pt-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
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
                            if (isNaN(val) || val < item.minOrderQty) updateQuantity(item.id, item.minOrderQty)
                          }}
                          className="h-10 w-16 rounded-xl border border-stone-200 bg-white text-center text-sm font-semibold text-stone-950"
                        />
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition hover:bg-stone-100"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="ml-2 text-xs text-stone-400">MOQ: {item.minOrderQty}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="font-bold text-stone-950">
                          {formatConvertedFromUsd(item.quantity * (item.unitPrice ?? 0))}
                        </p>
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* What happens next */}
                <div className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">What Happens Next</p>
                  <div className="mt-5 space-y-4">
                    {[
                      { icon: FileText, step: '1', title: 'Fill in your details', body: 'Name, email, phone and your project application.' },
                      { icon: MessageCircle, step: '2', title: 'Choose how to receive your quote', body: 'Via email (PDF) or WhatsApp — your choice.' },
                      { icon: Clock, step: '3', title: 'We respond within 24 hours', body: 'Our team reviews your request and sends a formal quotation.' },
                      { icon: CheckCircle, step: '4', title: 'Confirm and order', body: 'Accept the quote, pay 50% deposit, and we begin production.' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-950">
                          <item.icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-stone-950">{item.title}</p>
                          <p className="text-sm text-stone-500">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {showQuoteForm && (
              <QuoteForm onBack={() => setShowQuoteForm(false)} />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Order summary */}
              <div className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-stone-950">Order Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Total Items</span>
                    <span className="font-semibold text-stone-950">{totalItems}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Subtotal</span>
                    <span className="font-semibold text-stone-950">{formatConvertedFromUsd(subtotal)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-700">Bulk Discount ({discountPercent}%)</span>
                      <span className="font-semibold text-emerald-700">-{formatConvertedFromUsd(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-stone-100 pt-3 text-sm">
                    <span className="text-stone-500">Shipping</span>
                    <span className="italic text-stone-400">To be confirmed</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-100 pt-3">
                    <span className="font-bold text-stone-950">Total (excl. VAT)</span>
                    <span className="text-xl font-extrabold text-stone-950">{formatConvertedFromUsd(total)}</span>
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-stone-400">
                  Live exchange rates applied to USD base prices
                </p>

                {!showQuoteForm && (
                  <button
                    onClick={() => setShowQuoteForm(true)}
                    className="mt-5 w-full rounded-2xl bg-stone-950 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900"
                  >
                    Continue to Quote →
                  </button>
                )}

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-400">
                  <Clock className="h-3.5 w-3.5" />
                  Quote valid for 14 days · Lead time 10 working days
                </div>
              </div>

              {/* Testing data */}
              <div className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  DOST / ASTM D1037 Testing
                </p>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  Mechanical testing by DOST RSTL Region X — static bending,
                  compression, and hardness.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['MOR: 22.77–69.44 MPa', 'MOE: 2211–10256 MPa', 'Compression: 25–30 MPa', 'Hardness: 3918–7377 N'].map((val) => (
                    <span key={val} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600">
                      {val}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-4">
                  <Link href="/testing" className="text-xs font-bold text-emerald-700 hover:underline">
                    View testing page →
                  </Link>
                  <a href={DOST_PDF_PATH} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700 hover:underline">
                    Download PDF →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}