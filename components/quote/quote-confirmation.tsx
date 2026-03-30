'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { CheckCircle2, Download, MessageCircle, Mail, ArrowRight, Leaf, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QuoteWithItems } from '@/lib/supabase/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function QuoteConfirmation() {
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('id')
  const quoteNumber = searchParams.get('number')

  const { data: quote, isLoading, error } = useSWR<QuoteWithItems>(
    quoteId ? `/api/cart/quote?id=${quoteId}` : null,
    fetcher
  )

  const handleDownload = () => {
    if (!quoteId) return
    window.open(`/api/quote/pdf?id=${quoteId}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8 lg:py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Loading quote details...</p>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8 lg:py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-serif text-3xl text-foreground mb-4">
          Quote Request Submitted
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Your quote request has been received. We will contact you shortly with the details.
        </p>
        {quoteNumber && (
          <p className="font-mono text-sm text-muted-foreground mb-8">
            Quote Number: {quoteNumber}
          </p>
        )}
        <Link href="/products">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    )
  }

  const q = quote as any

  const deliveryChannel = q.delivery_method ?? q.delivery_channel ?? q.deliveryMethod
  const validUntil = quote.valid_until ? new Date(quote.valid_until) : null
  const daysValid = validUntil
    ? Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 14

  const displayedQuoteNumber = q.quote_number ?? q.quoteNumber ?? quoteNumber ?? '—'

  const displayCurrency: string = q.display_currency ?? 'USD'
  const displayTotal: number = q.display_total ?? q.total ?? 0
  const displayDiscountAmount: number = q.discount_amount ?? 0

  // Format a number in the display currency
  function formatAmount(amount: number) {
    try {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: displayCurrency,
        maximumFractionDigits: 0,
      }).format(amount)
    } catch {
      return `${displayCurrency} ${Math.round(amount).toLocaleString()}`
    }
  }

  // For line items: unit_price and total_price are stored in USD, convert using ratio
  const usdTotal: number = q.total ?? 0
  const conversionRatio = usdTotal > 0 ? displayTotal / usdTotal : 1

  function formatItemAmount(usdAmount: number) {
    return formatAmount(usdAmount * conversionRatio)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8 lg:py-16">
      {/* Success header */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">
          Quote Request Submitted
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Your quote is being prepared and will be delivered shortly via{' '}
          {deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}.
        </p>
      </div>

      {/* Quote details card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Quote Number</p>
            <p className="font-mono font-semibold text-foreground">{displayedQuoteNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
              {deliveryChannel === 'whatsapp' ? (
                <MessageCircle className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span className="capitalize">
                {quote.status === 'pending'
                  ? 'Pending'
                  : quote.status === 'processing'
                  ? 'Processing'
                  : quote.status}
              </span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-serif text-2xl text-foreground mt-1">
                {formatAmount(displayTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">excl. VAT</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="font-serif text-2xl text-foreground mt-1">
                {quote.quote_items?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">products</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Quote Valid</p>
              <p className="font-serif text-2xl text-foreground mt-1">
                {daysValid}
              </p>
              <p className="text-xs text-muted-foreground mt-1">days</p>
            </div>
          </div>

          {/* Items list */}
          {quote.quote_items && quote.quote_items.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="font-semibold text-foreground mb-4">Quote Items</h3>
              <div className="space-y-3">
                {quote.quote_items.map((item) => {
                  const itemUsdTotal =
                    (item as any).total_price ??
                    (item.quantity ?? 0) * ((item as any).unit_price ?? 0)
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">{item.product_name}</p>
                        {item.product_specs && (
                          <p className="text-sm text-muted-foreground">{item.product_specs}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatItemAmount(itemUsdTotal)}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.quantity} pcs</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {displayDiscountAmount > 0 && (
                <div className="flex justify-between items-center py-2 mt-2 border-t border-border text-primary">
                  <span>Bulk Discount</span>
                  <span className="font-medium">
                    -{formatAmount(displayDiscountAmount * conversionRatio)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status message */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              {deliveryChannel === 'whatsapp' ? (
                <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}{' '}
                  Delivery
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your quote details will be sent to you shortly. Please check your messages.
                </p>
              </div>
            </div>
          </div>

          {/* Next steps */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold text-foreground mb-4">What happens next?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Check your messages</p>
                  <p className="text-sm text-muted-foreground">
                    You will receive a quote summary and PDF link via{' '}
                    {deliveryChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Review and accept</p>
                  <p className="text-sm text-muted-foreground">
                    Reply YES to accept the quote or upload your PO document.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">We prepare your order</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will confirm shipping details and begin production.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 gap-2 bg-transparent border-primary/20"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Link href="/products" className="flex-1">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ESG note */}
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Leaf className="w-4 h-4 text-primary" />
        <span>Thank you for choosing sustainable bamboo</span>
      </div>
    </div>
  )
}