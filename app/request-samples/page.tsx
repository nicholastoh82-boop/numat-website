'use client'

import { useState } from 'react'

declare const gtag: (...args: unknown[]) => void
import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import {
  PackageCheck,
  ArrowRight,
  CheckCircle,
  Clock,
  Truck,
  Star,
  ChevronRight,
  Loader2,
  ChevronDown,
} from 'lucide-react'

const THICKNESS_OPTIONS = ['7mm', '12mm', '18mm', '20mm', '25mm', 'Not sure yet']
const APPLICATION_OPTIONS = [
  'Interior fit-out',
  'Furniture & cabinetry',
  'Doors & joinery',
  'Flooring',
  'Wall panels & slats',
  'Commercial / hospitality',
  'Other',
]
const PRODUCT_OPTIONS = [
  { id: 'nubam', label: 'NuBam Board', sub: 'Horizontal & vertical core' },
  { id: 'nuwall', label: 'NuWall Panel', sub: 'Feature wall systems' },
  { id: 'nuslat', label: 'NuSlat', sub: 'Decorative slat panels' },
  { id: 'nudoor', label: 'NuDoor', sub: 'Door components' },
  { id: 'notsure', label: 'Not Sure', sub: 'Help me choose' },
]
const DIAL_CODES = [
  { code: '+63', flag: '🇵🇭', country: 'Philippines' },
  { code: '+65', flag: '🇸🇬', country: 'Singapore' },
  { code: '+60', flag: '🇲🇾', country: 'Malaysia' },
  { code: '+62', flag: '🇮🇩', country: 'Indonesia' },
  { code: '+66', flag: '🇹🇭', country: 'Thailand' },
  { code: '+84', flag: '🇻🇳', country: 'Vietnam' },
  { code: '+852', flag: '🇭🇰', country: 'Hong Kong' },
  { code: '+886', flag: '🇹🇼', country: 'Taiwan' },
  { code: '+81', flag: '🇯🇵', country: 'Japan' },
  { code: '+82', flag: '🇰🇷', country: 'South Korea' },
  { code: '+86', flag: '🇨🇳', country: 'China' },
  { code: '+91', flag: '🇮🇳', country: 'India' },
  { code: '+61', flag: '🇦🇺', country: 'Australia' },
  { code: '+64', flag: '🇳🇿', country: 'New Zealand' },
  { code: '+44', flag: '🇬🇧', country: 'United Kingdom' },
  { code: '+1', flag: '🇺🇸', country: 'United States' },
  { code: '+971', flag: '🇦🇪', country: 'UAE' },
  { code: '+966', flag: '🇸🇦', country: 'Saudi Arabia' },
  { code: '+49', flag: '🇩🇪', country: 'Germany' },
  { code: '+33', flag: '🇫🇷', country: 'France' },
]
type Step = 1 | 2 | 'success'

export default function RequestSamplesPage() {
  const [step, setStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null
  const prefilledProduct = searchParams?.get('product') || ''

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    country: '',
    application: '',
    products: prefilledProduct ? [prefilledProduct] : [] as string[],
    thicknesses: [] as string[],
    notes: '',
  })

  const [dialCode, setDialCode] = useState('+63')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  function validateForm() {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Full name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address'
    if (!form.phone.trim()) errors.phone = 'Mobile number is required'
    else if (!/^[\d\s\-().]{6,15}$/.test(form.phone.trim())) errors.phone = 'Enter a valid mobile number (digits only, no country code)'
    if (!form.address.trim()) errors.address = 'Delivery address is required'
    if (!form.city.trim()) errors.city = 'City is required'
    if (!form.country.trim()) errors.country = 'Country is required'
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0]
      const el = document.getElementById(`sample-field-${firstErrorKey}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => el.focus(), 400)
      }
    }

    return Object.keys(errors).length === 0
  }

  function toggleArray(key: 'products' | 'thicknesses', val: string) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((v) => v !== val)
        : [...prev[key], val],
    }))
  }

  async function handleSubmit() {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const fullAddress = [form.address, form.city, form.state, form.country].filter(Boolean).join(', ')
      const message = [
        `Sample Request`,
        `Application: ${form.application || 'Not specified'}`,
        `Products: ${form.products.map(p => PRODUCT_OPTIONS.find(o => o.id === p)?.label || p).join(', ')}`,
        `Thicknesses: ${form.thicknesses.join(', ') || 'Not specified'}`,
        `Delivery Address: ${fullAddress}`,
        form.notes ? `Notes: ${form.notes}` : '',
      ].filter(Boolean).join('\n')

      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone ? `${dialCode} ${form.phone.trim()}` : null,
          company: form.company || null,
          subject: 'Sample Request',
          message,
          submissionTime: 5000,
        }),
      })
      gtag('event', 'sample_request', { event_category: 'conversion', event_label: 'Sample Request Form' })
      setStep('success')
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const howItWorks = [
    { n: '1', title: 'Tell us what you need', body: 'Select your product, thickness, and application.' },
    { n: '2', title: 'Add your contact details', body: 'Name, email, phone and delivery address.' },
    { n: '3', title: 'We prepare your pack', body: 'Samples cut, labelled, and shipped with data sheets. Sample size: 200mm × 200mm.' },
    { n: '4', title: 'Delivery cost confirmation', body: 'Delivery charges are borne by the customer. We will notify you of the exact amount within 3 business days once we have a quotation from our delivery providers.' },
    { n: '5', title: 'Evaluate and order', body: 'Approve the sample and request a formal quote.' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-[#f6f1e8]">

        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                  <PackageCheck className="h-4 w-4" />
                  Sample Programme
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">
                  Evaluate Before You Commit.
                </h1>
                <p className="mt-5 text-lg leading-8 text-stone-600">
                  Request physical bamboo board samples to assess finish, grain,
                  thickness, and suitability — before placing a commercial order.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    { icon: PackageCheck, text: 'Physical samples — standard size 200mm × 200mm' },
                    { icon: Clock, text: 'Sample lead time typically 5–10 working days' },
                    { icon: Truck, text: 'Shipped to your location — delivery charges quoted within 3 business days' },
                    { icon: Star, text: 'Technical data sheet included with every sample pack' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <item.icon className="h-4 w-4 text-emerald-700" />
                      </div>
                      <p className="text-sm font-medium text-stone-700">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-8">
                <p className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">How it works</p>
                <div className="space-y-5">
                  {howItWorks.map((s, i) => (
                    <div key={s.n} className="flex gap-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                        step === 'success'
                          ? 'bg-emerald-600 text-white'
                          : typeof step === 'number' && step > i + 1
                          ? 'bg-emerald-600 text-white'
                          : typeof step === 'number' && step === i + 1
                          ? 'bg-stone-950 text-white'
                          : 'bg-stone-200 text-stone-400'
                      }`}>
                        {step === 'success' || (typeof step === 'number' && step > i + 1)
                          ? <CheckCircle className="h-4 w-4" />
                          : s.n}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${typeof step === 'number' && step === i + 1 ? 'text-stone-950' : 'text-stone-500'}`}>
                          {s.title}
                        </p>
                        <p className="text-xs text-stone-400">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form steps */}
        <section className="mx-auto max-w-3xl px-6 py-12 lg:px-8 lg:py-16">

          {/* Success */}
          {step === 'success' && (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-950">Sample Request Received!</h2>
              <p className="mx-auto mt-3 max-w-md text-base text-stone-500">
                Our team will review your request and follow up within 24 hours to confirm availability and lead time.
              </p>
              <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
                <p className="text-sm font-semibold text-amber-800">Delivery charges notice</p>
                <p className="mt-1 text-sm text-amber-700">
                  Delivery charges are borne by the customer. We will notify you of the exact amount within 3 business days once we have a quotation from our delivery providers.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
                >
                  Browse Products
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 transition hover:-translate-y-0.5"
                >
                  Request Quote
                </Link>
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-stone-950">What would you like to sample?</h2>
                <p className="mt-1 text-sm text-stone-500">Select all that apply.</p>
              </div>

              {/* Product selection */}
              <div>
                <p className="mb-3 text-sm font-bold text-stone-700">Product</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRODUCT_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => toggleArray('products', p.id)}
                      className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
                        form.products.includes(p.id)
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-stone-950">{p.label}</p>
                        <p className="text-xs text-stone-400">{p.sub}</p>
                      </div>
                      {form.products.includes(p.id) && (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thickness */}
              <div>
                <p className="mb-3 text-sm font-bold text-stone-700">Thickness</p>
                <div className="flex flex-wrap gap-2">
                  {THICKNESS_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleArray('thicknesses', t)}
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                        form.thicknesses.includes(t)
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Application */}
              <div>
                <p className="mb-3 text-sm font-bold text-stone-700">Application</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {APPLICATION_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setForm((f) => ({ ...f, application: a }))}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        form.application === a
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {a}
                      <ChevronRight className={`h-4 w-4 ${form.application === a ? 'text-emerald-600' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="mb-2 text-sm font-bold text-stone-700">
                  Additional notes <span className="font-normal text-stone-400">(optional)</span>
                </p>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Project details, special requirements..."
                  className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={form.products.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900 disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-stone-950">Your contact details</h2>
                <p className="mt-1 text-sm text-stone-500">We'll use these to confirm and ship your sample request.</p>
              </div>

              {/* Selection summary */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Your selection</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.products.map((p) => (
                    <span key={p} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {PRODUCT_OPTIONS.find((o) => o.id === p)?.label}
                    </span>
                  ))}
                  {form.thicknesses.map((t) => (
                    <span key={t} className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">{t}</span>
                  ))}
                  {form.application && (
                    <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">{form.application}</span>
                  )}
                </div>
              </div>

              {/* Contact form */}
              <div className="rounded-[1.75rem] border border-stone-200 bg-white p-7 space-y-5">

                {/* Name + Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold text-stone-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="sample-field-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      className={`mt-1.5 h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-stone-200'}`}
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold text-stone-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="sample-field-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@company.com"
                      className={`mt-1.5 h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 ${formErrors.email ? 'border-red-400 bg-red-50' : 'border-stone-200'}`}
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                  </div>
                </div>

                {/* Phone + Company */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-bold text-stone-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div id="sample-field-phone" className={`mt-1.5 flex h-11 w-full overflow-hidden rounded-xl border text-sm focus-within:ring-2 focus-within:ring-emerald-600 ${formErrors.phone ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white'}`}>
                      <div className="relative flex shrink-0 items-center">
                        <select
                          value={dialCode}
                          onChange={(e) => setDialCode(e.target.value)}
                          className="h-full appearance-none bg-stone-50 pl-3 pr-7 text-sm font-semibold text-stone-700 focus:outline-none border-r border-stone-200"
                        >
                          {DIAL_CODES.map((d) => (
                            <option key={d.code + d.country} value={d.code}>
                              {d.flag} {d.code}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-stone-400" />
                      </div>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="912 345 6789"
                        className="flex-1 bg-transparent px-3 focus:outline-none"
                      />
                    </div>
                    {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold text-stone-700">
                      Company <span className="font-normal text-stone-400">(optional)</span>
                    </label>
                    <input
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Company name"
                      className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Delivery address */}
                <div className="border-t border-stone-100 pt-5">
                  <p className="mb-4 text-sm font-bold text-stone-700">
                    Delivery Address <span className="text-red-500">*</span>
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-500">Street Address</label>
                      <input
                        id="sample-field-address"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Street address, building, unit number"
                        className={`mt-1.5 h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 ${formErrors.address ? 'border-red-400 bg-red-50' : 'border-stone-200'}`}
                      />
                      {formErrors.address && <p className="mt-1 text-xs text-red-500">{formErrors.address}</p>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold text-stone-500">City <span className="text-red-500">*</span></label>
                        <input
                          id="sample-field-city"
                          value={form.city}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          placeholder="City"
                          className={`mt-1.5 h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 ${formErrors.city ? 'border-red-400 bg-red-50' : 'border-stone-200'}`}
                        />
                        {formErrors.city && <p className="mt-1 text-xs text-red-500">{formErrors.city}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-500">State / Province</label>
                        <input
                          value={form.state}
                          onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                          placeholder="State / Province"
                          className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-stone-500">Country <span className="text-red-500">*</span></label>
                        <input
                          id="sample-field-country"
                          value={form.country}
                          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                          placeholder="Country"
                          className={`mt-1.5 h-11 w-full rounded-xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 ${formErrors.country ? 'border-red-400 bg-red-50' : 'border-stone-200'}`}
                        />
                        {formErrors.country && <p className="mt-1 text-xs text-red-500">{formErrors.country}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery charges notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-semibold text-amber-800">Delivery charges notice</p>
                <p className="mt-1 text-sm text-amber-700">
                  All delivery charges are borne by the customer. We will notify you of the exact delivery cost within 3 business days of receiving your request, once we have a quotation from our delivery service providers.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-stone-950 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900 disabled:opacity-40"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit Sample Request
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </section>
      </main>
      <Footer />
    </div>
  )
}