'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Loader2,
  MessageCircle,
  CheckCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCartStore } from '@/lib/cart-store'
import { useCurrency } from '@/components/providers/currency-provider'
import { cn } from '@/lib/utils'
import PhoneInput, { type Value } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { toast } from '@/hooks/use-toast'

interface QuoteFormProps {
  onBack: () => void
}

const WHATSAPP_NUMBER = '601139593956'

type DeliveryChannel = 'email' | 'whatsapp'

const APPLICATION_OPTIONS = [
  'Interior fit-out',
  'Furniture & joinery',
  'Doors',
  'Flooring',
  'Wall finishes',
  'Slats & feature walls',
  'Other',
] as const

function extractProductId(cartItemId: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const match = cartItemId.match(uuidRegex)
  return match ? match[0] : null
}

export function QuoteForm({ onBack }: QuoteFormProps) {
  const router = useRouter()
  const { items, getDiscountPercent, getTotal, clearCart } = useCartStore()
  const { formatConvertedFromUsd, selectedCountry, exchangeRate } = useCurrency()

  const [phoneNumber, setPhoneNumber] = useState<Value>()
  const [formData, setFormData] = useState<{
    name: string
    email: string
    company: string
    application: string
    notes: string
    consent: boolean
  }>({
    name: '',
    email: '',
    company: '',
    application: APPLICATION_OPTIONS[0],
    notes: '',
    consent: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = getTotal()
  const discountPercent = getDiscountPercent()

  const quoteMessage = useMemo(() => {
    const lines: string[] = []
    lines.push('Hello NUMAT, I would like to request a quote.')
    lines.push('')
    lines.push(`Name: ${formData.name}`)
    lines.push(`Phone: ${phoneNumber || ''}`)
    if (formData.company.trim()) lines.push(`Company: ${formData.company}`)
    lines.push(`Email: ${formData.email}`)
    lines.push(`Application: ${formData.application}`)
    lines.push(`Preferred Currency: ${selectedCountry.currency}`)
    lines.push('')
    lines.push('Items:')
    items.forEach((item, index) => {
      const unitPrice = item.unitPrice ?? 0
      lines.push(`${index + 1}. ${item.name}`)
      lines.push(`   ${item.specs}`)
      lines.push(`   Quantity: ${item.quantity} ${item.unit}`)
      lines.push(`   Unit Price: ${item.isPriceOnRequest ? 'Price on request' : formatConvertedFromUsd(unitPrice)}`)
      lines.push(`   Line Total: ${item.isPriceOnRequest ? 'Price on request' : formatConvertedFromUsd(unitPrice * item.quantity)}`)
      lines.push('')
    })
    if (discountPercent > 0) lines.push(`Bulk Discount: ${discountPercent}%`)
    lines.push(`Total (excl. VAT): ${formatConvertedFromUsd(total)}`)
    if (formData.notes.trim()) {
      lines.push('')
      lines.push('Additional Notes:')
      lines.push(formData.notes.trim())
    }
    return lines.join('\n')
  }, [formData, phoneNumber, items, discountPercent, total, formatConvertedFromUsd, selectedCountry.currency])

  function validateForm() {
    const nextErrors: Record<string, string> = {}
    if (!formData.name.trim()) nextErrors.name = 'Required'
    if (!formData.email.trim()) nextErrors.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) nextErrors.email = 'Invalid email'
    if (!phoneNumber) nextErrors.phone = 'Required'
    if (!formData.application) nextErrors.application = 'Required'
    if (!formData.consent) nextErrors.consent = 'Required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(channel: DeliveryChannel) {
    if (!validateForm()) return
    if (items.length === 0) {
      toast({ title: 'Cart is empty', description: 'Add products first.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: String(phoneNumber),
            company: formData.company.trim() || null,
            channel,
            application: formData.application,
            notes: formData.notes.trim() || null,
            consent: !!formData.consent,
            display_currency: selectedCountry.currency,
            display_total: total * exchangeRate,
          },
          items: items.map((item) => ({
            product_id: extractProductId(item.id),
            product_name: item.name,
            product_specs: item.specs,
            quantity: item.quantity,
            unit_price: item.unitPrice ?? 0,
            sku: null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to submit quote.')

      const quoteId = data.quoteId as string
      const quoteNumber = data.quoteNumber as string
      const confirmationUrl = `/quote/confirmation?id=${encodeURIComponent(quoteId)}&number=${encodeURIComponent(quoteNumber)}`

      if (channel === 'whatsapp') {
        const confirmMsg = `Hello NUMAT, I submitted a quote request.\nQuote #: ${quoteNumber}\nLink: ${window.location.origin}${confirmationUrl}`
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(confirmMsg)}`, '_blank')
      }

      clearCart()
      router.push(confirmationUrl)
    } catch (err) {
      toast({
        title: 'Quote submission failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-950">Your Details</h1>
        <p className="mt-1 text-sm text-stone-500">Fill in your contact info and we'll prepare your formal quotation.</p>
      </div>

      {/* Reassurance bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Clock, text: 'Quote in 24 hours' },
          { icon: ShieldCheck, text: 'No obligation to buy' },
          { icon: CheckCircle, text: 'PDF quote via email' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <item.icon className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="text-sm font-semibold text-stone-700">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-7 shadow-sm">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name" className="text-sm font-semibold text-stone-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className={cn('mt-1.5 h-11 rounded-xl', errors.name && 'border-red-400')}
                disabled={isSubmitting}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-stone-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                className={cn('mt-1.5 h-11 rounded-xl', errors.email && 'border-red-400')}
                disabled={isSubmitting}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-semibold text-stone-700">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className={cn(
              'mt-1.5 flex h-11 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-emerald-600',
              errors.phone && 'border-red-400'
            )}>
              <PhoneInput
                defaultCountry="PH"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                className="phone-input-custom flex-1"
                disabled={isSubmitting}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="company" className="text-sm font-semibold text-stone-700">
              Company <span className="font-normal text-stone-400">(optional)</span>
            </Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Your company name"
              className="mt-1.5 h-11 rounded-xl"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="application" className="text-sm font-semibold text-stone-700">
              Application <span className="text-red-500">*</span>
            </Label>
            <select
              id="application"
              value={formData.application}
              onChange={(e) => setFormData({ ...formData, application: e.target.value })}
              className={cn(
                'mt-1.5 h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-600',
                errors.application && 'border-red-400'
              )}
              disabled={isSubmitting}
            >
              {APPLICATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm font-semibold text-stone-700">
              Additional Notes <span className="font-normal text-stone-400">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1.5 min-h-[100px] resize-none rounded-xl"
              placeholder="Project notes, delivery timing, or special requests"
              disabled={isSubmitting}
            />
          </div>

          <label className={cn('flex items-start gap-3 rounded-2xl border p-4', errors.consent ? 'border-red-300 bg-red-50' : 'border-stone-200 bg-stone-50')}>
            <input
              type="checkbox"
              checked={formData.consent}
              onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
              className="mt-1 h-4 w-4 accent-emerald-600"
              disabled={isSubmitting}
            />
            <span className="text-sm text-stone-600">
              I consent to being contacted about this quote request. <span className="text-red-500">*</span>
            </span>
          </label>
        </div>
      </div>

      {/* Quote preview */}
      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">Quote Preview</p>
        <pre className="whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-xs leading-6 text-stone-600">
          {quoteMessage}
        </pre>
      </div>

      {/* Submit buttons */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Choose how to receive your quote</p>

        <button
          type="button"
          onClick={() => handleSubmit('email')}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-stone-950 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
          Email me the quote (PDF)
        </button>

        <button
          type="button"
          onClick={() => handleSubmit('whatsapp')}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
          Continue via WhatsApp
        </button>
      </div>

      <style jsx global>{`
        .phone-input-custom .PhoneInputInput {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          padding-left: 8px !important;
        }
        .phone-input-custom .PhoneInputCountry {
          margin-right: 8px;
        }
      `}</style>
    </div>
  )
}