'use client'

import { useEffect, useState, useCallback } from 'react'

type Testimonial = {
  id: string
  name: string
  company: string | null
  logo_url: string | null
  location: string | null
  testimonial: string
  sort_order: number | null
  is_active: boolean
  created_at?: string | null
}

type ClearbitCompany = {
  name: string
  domain: string
  logo: string
}

const emptyForm = {
  name: '',
  company: '',
  logo_url: '',
  location: '',
  testimonial: '',
  sort_order: 0,
  is_active: true,
}

// Infer country from domain TLD as a rough location hint
const TLD_COUNTRY_MAP: Record<string, string> = {
  sg: 'Singapore',
  ph: 'Philippines',
  my: 'Malaysia',
  au: 'Australia',
  nz: 'New Zealand',
  uk: 'United Kingdom',
  co: 'Colombia',
  jp: 'Japan',
  cn: 'China',
  hk: 'Hong Kong',
  in: 'India',
  id: 'Indonesia',
  th: 'Thailand',
  vn: 'Vietnam',
  de: 'Germany',
  fr: 'France',
  nl: 'Netherlands',
  ca: 'Canada',
  ae: 'UAE',
  sa: 'Saudi Arabia',
}

function inferLocationFromDomain(domain: string): string {
  const parts = domain.split('.')
  const tld = parts[parts.length - 1].toLowerCase()
  // .com.ph, .com.sg etc — check second-to-last
  const secondTld = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : ''
  if (secondTld && TLD_COUNTRY_MAP[secondTld]) return TLD_COUNTRY_MAP[secondTld]
  if (TLD_COUNTRY_MAP[tld]) return TLD_COUNTRY_MAP[tld]
  // .com is usually US-based but too generic — skip
  return ''
}

async function parseJsonSafely(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Standalone logo search component
function LogoSearch({
  value,
  onSelect,
}: {
  value: string
  onSelect: (company: string, logoUrl: string, location: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<ClearbitCompany[]>([])
  const [searching, setSearching] = useState(false)
  const [previewLogo, setPreviewLogo] = useState('')
  const [open, setOpen] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`
      )
      if (res.ok) {
        const data: ClearbitCompany[] = await res.json()
        setSuggestions(data.slice(0, 6))
        setOpen(data.length > 0)
      }
    } catch {
      // Clearbit unavailable silently
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 450)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleSelect(e: React.MouseEvent, company: ClearbitCompany) {
    // Critical: stop click from bubbling to modal backdrop
    e.preventDefault()
    e.stopPropagation()
    const location = inferLocationFromDomain(company.domain)
    setQuery(company.name)
    setPreviewLogo(company.logo)
    setSuggestions([])
    setOpen(false)
    onSelect(company.name, company.logo, location)
  }

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    // Keep existing logo if any, just update company name
    onSelect(val, previewLogo, '')
    if (!val) {
      setPreviewLogo('')
      setSuggestions([])
      setOpen(false)
    }
  }

  function handleBlur() {
    // Small delay so click on suggestion fires first
    setTimeout(() => setOpen(false), 180)
  }

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        {previewLogo && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white p-1">
            <img
              src={previewLogo}
              alt="logo"
              className="h-full w-full object-contain"
              onError={() => setPreviewLogo('')}
            />
          </div>
        )}
        <div className="relative flex-1">
          <input
            value={query}
            onChange={handleManualChange}
            onBlur={handleBlur}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Company name — type to search or enter manually"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
          />
          {searching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
              searching...
            </span>
          )}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[100] mt-1 rounded-xl border border-neutral-200 bg-white shadow-xl overflow-hidden">
          <p className="px-3 py-2 text-xs text-neutral-400 border-b border-neutral-100">
            Select a match, or just keep typing if not listed
          </p>
          {suggestions.map(s => (
            <button
              key={s.domain}
              type="button"
              onMouseDown={e => handleSelect(e, s)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors"
            >
              {s.logo && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-100 bg-white p-1">
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="h-full w-full object-contain"
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 truncate">{s.name}</p>
                <p className="text-xs text-neutral-400 truncate">
                  {s.domain}
                  {inferLocationFromDomain(s.domain)
                    ? ` — ${inferLocationFromDomain(s.domain)}`
                    : ''}
                </p>
              </div>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">
              Not listed? Just type the company name — logo optional.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function TestimonialForm({
  initialForm,
  onSubmit,
  submitLabel,
  submitting,
}: {
  initialForm: typeof emptyForm
  onSubmit: (form: typeof emptyForm) => void
  submitLabel: string
  submitting: boolean
}) {
  const [form, setForm] = useState(initialForm)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: target.checked }))
      return
    }
    setForm(f => ({
      ...f,
      [name]: name === 'sort_order' ? Number(value) : value,
    }))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Client name"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Company
          <span className="ml-2 text-xs font-normal text-neutral-400">
            auto-fetches logo
          </span>
        </label>
        <LogoSearch
          value={form.company}
          onSelect={(company, logoUrl, inferredLocation) => {
            setForm(f => ({
              ...f,
              company,
              logo_url: logoUrl,
              // Only auto-fill location if it's currently empty
              location: inferredLocation && !f.location ? inferredLocation : f.location,
            }))
          }}
        />
        {form.logo_url && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white p-1">
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={e =>
                  ((e.target as HTMLImageElement).style.display = 'none')
                }
              />
            </div>
            <p className="text-xs text-neutral-500">
              Logo found for <strong>{form.company}</strong>
            </p>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
              className="ml-auto text-xs text-neutral-400 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Location
          <span className="ml-2 text-xs font-normal text-neutral-400">
            auto-suggested from company domain
          </span>
        </label>
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          placeholder="City, Country"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Testimonial
        </label>
        <textarea
          name="testimonial"
          value={form.testimonial}
          onChange={handleChange}
          placeholder="Write the testimonial here"
          required
          rows={6}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Sort order
        </label>
        <input
          name="sort_order"
          type="number"
          value={form.sort_order}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="is_active"
          checked={form.is_active}
          onChange={handleChange}
          className="h-4 w-4"
        />
        Active on homepage
      </label>

      <button
        type="button"
        onClick={() => onSubmit(form)}
        disabled={submitting || !form.name || !form.testimonial}
        className="inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}

function EditModal({
  testimonial,
  onSave,
  onClose,
}: {
  testimonial: Testimonial
  onSave: (updated: Testimonial) => void
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const initialForm = {
    name: testimonial.name,
    company: testimonial.company || '',
    logo_url: testimonial.logo_url || '',
    location: testimonial.location || '',
    testimonial: testimonial.testimonial,
    sort_order: testimonial.sort_order ?? 0,
    is_active: testimonial.is_active,
  }

  async function handleSave(form: typeof initialForm) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/testimonials?id=${testimonial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await parseJsonSafely(res)
      if (!res.ok) throw new Error(data?.error || 'Failed to update')
      onSave({ ...testimonial, ...form })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
      setSaving(false)
    }
  }

  return (
    // Backdrop — stopPropagation on inner panel so clicks inside don't close modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Edit testimonial
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
          >
            x
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <TestimonialForm
          initialForm={initialForm}
          onSubmit={handleSave}
          submitLabel="Save changes"
          submitting={saving}
        />
      </div>
    </div>
  )
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchTestimonials()
  }, [])

  async function fetchTestimonials() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/testimonials', { cache: 'no-store' })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch')
      setTestimonials(Array.isArray(data) ? data : [])
    } catch (err) {
      setTestimonials([])
      setError(err instanceof Error ? err.message : 'Failed to fetch testimonials')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(form: typeof emptyForm) {
    try {
      setSubmitting(true)
      setError('')
      setSuccess('')
      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to add')
      if (data) {
        setTestimonials(prev =>
          [data, ...prev].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        )
      }
      setSuccess('Testimonial added successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add testimonial')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this testimonial?')) return
    try {
      setDeletingId(id)
      setError('')
      setSuccess('')
      const response = await fetch(`/api/admin/testimonials?id=${id}`, {
        method: 'DELETE',
      })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to delete')
      setTestimonials(prev => prev.filter(item => item.id !== id))
      setSuccess('Testimonial deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  function handleEditSave(updated: Testimonial) {
    setTestimonials(prev =>
      prev
        .map(t => (t.id === updated.id ? updated : t))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    )
    setEditingTestimonial(null)
    setSuccess('Testimonial updated.')
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {editingTestimonial && (
        <EditModal
          testimonial={editingTestimonial}
          onSave={handleEditSave}
          onClose={() => setEditingTestimonial(null)}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Testimonials
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Add and manage testimonials shown on the homepage.
          </p>
        </div>

        {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
          {/* Add form */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">Add testimonial</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Keep entries polished and credible.
              </p>
            </div>
            <TestimonialForm
              initialForm={emptyForm}
              onSubmit={handleAdd}
              submitLabel="Add testimonial"
              submitting={submitting}
            />
          </div>

          {/* Existing list */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Existing testimonials
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Edit or remove entries from the live site.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchTestimonials}
                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
                Loading testimonials...
              </div>
            ) : testimonials.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
                No testimonials found yet.
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map(item => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.logo_url && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white p-1">
                              <img
                                src={item.logo_url}
                                alt={item.company || item.name}
                                className="h-full w-full object-contain"
                                onError={e =>
                                  ((e.target as HTMLImageElement).style.display = 'none')
                                }
                              />
                            </div>
                          )}
                          <h3 className="text-base font-semibold text-neutral-900">
                            {item.name}
                          </h3>
                          {item.company && (
                            <span className="text-sm text-neutral-500">{item.company}</span>
                          )}
                          {item.location && (
                            <span className="text-sm text-neutral-400">{item.location}</span>
                          )}
                          {item.is_active ? (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-neutral-400">
                          Sort order: {item.sort_order ?? 0}
                        </p>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
                          "{item.testimonial}"
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTestimonial(item)}
                          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === item.id ? 'Removing...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}