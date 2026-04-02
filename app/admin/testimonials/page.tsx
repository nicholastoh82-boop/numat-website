'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

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

async function parseJsonSafely(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function LogoSearch({
  value,
  onSelect,
}: {
  value: string
  onSelect: (company: string, logoUrl: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<ClearbitCompany[]>([])
  const [searching, setSearching] = useState(false)
  const [previewLogo, setPreviewLogo] = useState('')
  const [open, setOpen] = useState(false)

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setSuggestions([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(
        `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`
      )
      if (res.ok) {
        const data: ClearbitCompany[] = await res.json()
        setSuggestions(data.slice(0, 5))
        setOpen(true)
      }
    } catch {
      // Clearbit unavailable — silently fail
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 400)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleSelect(company: ClearbitCompany) {
    setQuery(company.name)
    setPreviewLogo(company.logo)
    setSuggestions([])
    setOpen(false)
    onSelect(company.name, company.logo)
  }

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (!val) {
      setPreviewLogo('')
      onSelect('', '')
    } else {
      onSelect(val, previewLogo)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {previewLogo && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white p-1">
            <img
              src={previewLogo}
              alt="Company logo"
              className="h-full w-full object-contain"
              onError={() => setPreviewLogo('')}
            />
          </div>
        )}
        <input
          value={query}
          onChange={handleManualChange}
          placeholder="Company name (auto-fetches logo)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
        {searching && (
          <span className="absolute right-3 top-3 text-xs text-neutral-400">...</span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.domain}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors"
            >
              {s.logo && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-100 bg-white p-1">
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 truncate">{s.name}</p>
                <p className="text-xs text-neutral-400 truncate">{s.domain}</p>
              </div>
            </button>
          ))}
        </div>
      )}
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
  const [form, setForm] = useState({
    name: testimonial.name,
    company: testimonial.company || '',
    logo_url: testimonial.logo_url || '',
    location: testimonial.location || '',
    testimonial: testimonial.testimonial,
    sort_order: testimonial.sort_order ?? 0,
    is_active: testimonial.is_active,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: target.checked }))
      return
    }
    setForm(f => ({ ...f, [name]: name === 'sort_order' ? Number(value) : value }))
  }

  async function handleSave() {
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Edit testimonial</h2>
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

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Company</label>
            <LogoSearch
              value={form.company}
              onSelect={(company, logoUrl) =>
                setForm(f => ({ ...f, company, logo_url: logoUrl }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Testimonial</label>
            <textarea
              name="testimonial"
              value={form.testimonial}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-neutral-700">Sort order</label>
              <input
                name="sort_order"
                type="number"
                value={form.sort_order}
                onChange={handleChange}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <label className="mt-7 flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
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
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  async function fetchTestimonials() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/testimonials', { cache: 'no-store' })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch testimonials')
      setTestimonials(Array.isArray(data) ? data : [])
    } catch (err) {
      setTestimonials([])
      setError(err instanceof Error ? err.message : 'Failed to fetch testimonials')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: target.checked }))
      return
    }
    setForm(f => ({ ...f, [name]: name === 'sort_order' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      if (!response.ok) throw new Error(data?.error || 'Failed to add testimonial')
      if (data) {
        setTestimonials(prev =>
          [data, ...prev].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        )
      }
      setForm(emptyForm)
      setSuccess('Testimonial added successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add testimonial')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this testimonial?')) return
    try {
      setDeletingId(id)
      setError('')
      setSuccess('')
      const response = await fetch(`/api/admin/testimonials?id=${id}`, { method: 'DELETE' })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to delete testimonial')
      setTestimonials(prev => prev.filter(item => item.id !== id))
      setSuccess('Testimonial deleted successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete testimonial')
    } finally {
      setDeletingId(null)
    }
  }

  function handleEditSave(updated: Testimonial) {
    setTestimonials(prev =>
      prev.map(t => (t.id === updated.id ? updated : t))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    )
    setEditingTestimonial(null)
    setSuccess('Testimonial updated successfully.')
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
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
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
              <p className="mt-1 text-sm text-neutral-500">Keep entries polished and credible.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <span className="ml-2 text-xs font-normal text-neutral-400">auto-fetches logo</span>
                </label>
                <LogoSearch
                  value={form.company}
                  onSelect={(company, logoUrl) =>
                    setForm(f => ({ ...f, company, logo_url: logoUrl }))
                  }
                />
                {form.logo_url && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white p-1">
                      <img
                        src={form.logo_url}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                        onError={e => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    </div>
                    <p className="text-xs text-neutral-500">Logo found for <strong>{form.company}</strong></p>
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
                <label className="mb-2 block text-sm font-medium text-neutral-700">Location</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City / Country"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Testimonial</label>
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
                <label className="mb-2 block text-sm font-medium text-neutral-700">Sort order</label>
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
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Add testimonial'}
              </button>
            </form>
          </div>

          {/* Existing list */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Existing testimonials</h2>
                <p className="mt-1 text-sm text-neutral-500">Edit or remove entries from the live site.</p>
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
                          {/* Company logo */}
                          {item.logo_url && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white p-1">
                              <img
                                src={item.logo_url}
                                alt={item.company || item.name}
                                className="h-full w-full object-contain"
                                onError={e => (e.target as HTMLImageElement).style.display = 'none'}
                              />
                            </div>
                          )}

                          <h3 className="text-base font-semibold text-neutral-900">{item.name}</h3>

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