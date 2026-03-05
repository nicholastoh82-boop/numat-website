'use client'

import React, { useState } from "react"
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, MessageCircle, Phone, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

import PhoneInput, { type Value } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

const APPLICATIONS = ['Furniture', 'Flooring', 'Doors', 'Structural', 'Interior', 'Outdoor', 'Other'] as const

interface QuoteFormProps {
  onBack: () => void
}

export function QuoteForm({ onBack }: QuoteFormProps) {
  const router = useRouter()
  const { items, clearCart } = useCartStore()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<Value>()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    channel: 'whatsapp' as 'whatsapp' | 'viber' | 'email',
    company: '',
    application: '' as typeof APPLICATIONS[number] | '',
    notes: '',
    consent: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Required'
    if (!formData.email.trim()) newErrors.email = 'Required'
    if (!phoneNumber) newErrors.phone = 'Required'
    if (!formData.application) newErrors.application = 'Required'
    if (!formData.consent) newErrors.consent = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const sendAutomatedNotifications = async (quoteId: string, preferredChannel: string) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': 'automated-system-call'
    }

    const sendEmail = async () => fetch('/api/admin/send-quote', { method: 'POST', headers, body: JSON.stringify({ quoteId, type: 'send' }) })
    const sendWhatsApp = async () => fetch('/api/admin/send-whatsapp-quote', { method: 'POST', headers, body: JSON.stringify({ quoteId, type: 'send' }) })

    try {
      if (preferredChannel === 'email') {
        const res = await sendEmail()
        if (!res.ok) await sendWhatsApp()
      } else {
        const res = await sendWhatsApp()
        if (!res.ok) await sendEmail()
      }
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: { ...formData, phone: phoneNumber },
          items: items.map(item => ({
            product_id: item.id,
            product_name: item.name,
            product_specs: item.specs,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      await sendAutomatedNotifications(data.quoteId, formData.channel)
      toast({ title: "Quote Submitted Successfully" })
      clearCart()
      router.push(`/quote/confirmation?id=${data.quoteId}&number=${data.quoteNumber}`)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Back Button */}
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Cart
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Contact Information</h2>

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[14px] font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                className={cn("h-11 rounded-lg border-gray-300", errors.name && "border-red-500")}
              />
            </div>

            {/* Email */}
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
                className={cn("h-11 rounded-lg border-gray-300", errors.email && "border-red-500")}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[14px] font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className={cn(
                "flex h-11 w-full rounded-lg border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-green-600 transition-all",
                errors.phone && "border-red-500"
              )}>
                <PhoneInput
                  defaultCountry="PH"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  className="flex-1 phone-input-custom"
                />
              </div>
            </div>

            {/* Preferred Channel */}
            <div className="space-y-3">
              <Label className="text-[14px] font-medium text-gray-700">
                Receive quote via <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-4">
                {(['whatsapp', 'viber', 'email'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setFormData({ ...formData, channel: ch })}
                    className={cn(
                      'flex items-center justify-center gap-2 h-12 rounded-lg border transition-all text-[14px] font-medium',
                      formData.channel === ch
                        ? 'border-green-800 bg-green-50/50 text-green-800 ring-1 ring-green-800'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    )}
                  >
                    {ch === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
                    {ch === 'viber' && <Phone className="w-4 h-4" />}
                    {ch === 'email' && <Mail className="w-4 h-4" />}
                    <span className="capitalize">{ch}</span>
                    {formData.channel === ch && <CheckCircle2 className="w-4 h-4 ml-1" />}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Automatic fallback enabled: if your primary channel fails, we will try WhatsApp.
              </p>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="company" className="text-[14px] font-medium text-gray-700">
                Company Name <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Your company name"
                className="h-11 rounded-lg border-gray-300"
              />
            </div>

            {/* Application */}
            <div className="space-y-3">
              <Label className="text-[14px] font-medium text-gray-700">
                Application <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-4 gap-3">
                {APPLICATIONS.map((app) => (
                  <button
                    key={app}
                    type="button"
                    onClick={() => setFormData({ ...formData, application: app })}
                    className={cn(
                      'h-11 rounded-lg border transition-all text-sm font-medium',
                      formData.application === app
                        ? 'border-green-800 bg-green-800 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    )}
                  >
                    {app}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="notes" className="text-[14px] font-medium text-gray-700">
                Additional Notes <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[120px] rounded-lg border-gray-300 resize-none"
              />
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 pt-4">
              <Checkbox
                id="consent"
                checked={formData.consent}
                onCheckedChange={(c) => setFormData({ ...formData, consent: c as boolean })}
                className="mt-1 border-gray-300 data-[state=checked]:bg-green-800 data-[state=checked]:border-green-800"
              />
              <Label htmlFor="consent" className="text-[14px] leading-relaxed text-gray-700 font-normal cursor-pointer">
                I consent to receive my quote via {formData.channel} and acknowledge the Privacy Policy.
              </Label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-14 bg-[#1B5E20] hover:bg-[#144718] text-white rounded-lg text-lg font-medium transition-all gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              Submit Quote Request
            </>
          )}
        </Button>
      </form>

      {/* Internal Style for Phone Input to match UI */}
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
