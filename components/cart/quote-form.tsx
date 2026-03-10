'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Phone, AlertCircle, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
const VIBER_NUMBER = '639628127829'

type DeliveryChannel = 'email' | 'whatsapp' | 'viber'

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
  // product detail pages generate ids like "<productUuid>-<config...>"
  // product cards/quick view use the product id directly
  const first = cartItemId.split('-')[0]
  if (first.length === 36) return first
  return cartItemId
}

export function QuoteForm({ onBack }: QuoteFormProps) {
  const router = useRouter()
  const { items, getDiscountPercent, getTotal, clearCart } = useCartStore()
  const { formatConvertedFromUsd, selectedCountry } = useCurrency()

  const [phoneNumber, setPhoneNumber] = useState<Value>()
  const [formData, setFormData] = useState({
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
      lines.push(`${index + 1}. ${item.name}`)
      lines.push(`   ${item.specs}`)
      lines.push(`   Quantity: ${item.quantity} ${item.unit}`)
      lines.push(`   Unit Price: ${formatConvertedFromUsd(item.unitPrice)}`)
      lines.push(`   Line Total: ${formatConvertedFromUsd(item.unitPrice * item.quantity)}`)
      lines.push('')
    })

    if (discountPercent > 0) {
      lines.push(`Bulk Discount: ${discountPercent}%`)
    }

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
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) nextErrors.email = 'Invalid email'
    }
    if (!phoneNumber) nextErrors.phone = 'Required'
    if (!formData.application) nextErrors.application = 'Required'
    if (!formData.consent) nextErrors.consent = 'Required'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(channel: DeliveryChannel) {
    if (!validateForm()) return
    if (items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add products first, then request a quote.',
        variant: 'destructive',
      })
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
            company: formData.company.trim() ? formData.company.trim() : null,
            channel,
            application: formData.application,
            notes: formData.notes.trim() ? formData.notes.trim() : null,
            consent: !!formData.consent,
          },
          items: items.map((item) => ({
            product_id: extractProductId(item.id),
            product_name: item.name,
            product_specs: item.specs,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            sku: null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to submit quote.')
      }

      const quoteId = data.quoteId as string
      const quoteNumber = data.quoteNumber as string

      const confirmationUrl = `/quote/confirmation?id=${encodeURIComponent(quoteId)}&number=${encodeURIComponent(
        quoteNumber
      )}`

      // Optional: open chat apps with a short message that includes the quote link
      if (channel === 'whatsapp') {
        const message = encodeURIComponent(
          `Hello NUMAT, I submitted a quote request.\nQuote #: ${quoteNumber}\nLink: ${window.location.origin}${confirmationUrl}`
        )
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
      } else if (channel === 'viber') {
        window.open(`viber://chat?number=%2B${VIBER_NUMBER}`, '_blank')
        setTimeout(() => {
          navigator.clipboard?.writeText(
            `Hello NUMAT, I submitted a quote request.\nQuote #: ${quoteNumber}\nLink: ${window.location.origin}${confirmationUrl}`
          ).catch(() => {})
        }, 600)
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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cart
      </button>

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-8 text-xl font-bold text-gray-900">Contact Information</h2>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[14px] font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className={cn('h-11 rounded-lg border-gray-300', errors.name && 'border-red-500')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[14px] font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                className={cn('h-11 rounded-lg border-gray-300', errors.email && 'border-red-500')}
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[14px] font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div
                className={cn(
                  'flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm transition-all focus-within:ring-1 focus-within:ring-green-600',
                  errors.phone && 'border-red-500'
                )}
              >
                <PhoneInput
                  defaultCountry="PH"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  className="phone-input-custom flex-1"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-[14px] font-medium text-gray-700">
                Company Name <span className="font-normal text-gray-400">(optional)</span>
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Your company name"
                className="h-11 rounded-lg border-gray-300"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="application" className="text-[14px] font-medium text-gray-700">
                Application <span className="text-red-500">*</span>
              </Label>
              <select
                id="application"
                value={formData.application}
                onChange={(e) => setFormData({ ...formData, application: e.target.value })}
                className={cn(
                  'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-600',
                  errors.application && 'border-red-500'
                )}
                disabled={isSubmitting}
              >
                {APPLICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.application && <p className="text-xs text-red-600">{errors.application}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-[14px] font-medium text-gray-700">
                Additional Notes <span className="font-normal text-gray-400">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[120px] rounded-lg border-gray-300 resize-none"
                placeholder="Any project notes, delivery timing, or special requests"
                disabled={isSubmitting}
              />
            </div>

            <label className={cn('flex items-start gap-3 rounded-lg border p-4', errors.consent ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50')}>
              <input
                type="checkbox"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="mt-1 h-4 w-4"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-700">
                I consent to being contacted about this quote request via my selected delivery channel.
                <span className="text-red-500"> *</span>
              </span>
            </label>
            {errors.consent && <p className="text-xs text-red-600">{errors.consent}</p>}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <div>
                  Viber does not always support long prefilled text on every device. If that happens,
                  we copy your quote details to your clipboard so you can paste them into Viber.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Quote Preview</h3>
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            {quoteMessage}
          </pre>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => handleSubmit('email')}
            className="h-14 gap-2 rounded-lg bg-[#16361f] text-lg font-medium text-white hover:bg-[#204a2b]"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
            Email me the quote (PDF)
          </Button>

          <Button
            type="button"
            onClick={() => handleSubmit('whatsapp')}
            className="h-14 gap-2 rounded-lg bg-[#1B5E20] text-lg font-medium text-white hover:bg-[#144718]"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
            Continue via WhatsApp
          </Button>
        </div>

        <Button
          type="button"
          onClick={() => handleSubmit('viber')}
          variant="outline"
          className="h-14 w-full gap-2 rounded-lg border-gray-300 text-lg font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
          Continue via Viber
        </Button>
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