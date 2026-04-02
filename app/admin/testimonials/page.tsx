'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type Testimonial = {
  id: string
  name: string
  company: string | null
  logo_url: string | null
  content_image_url: string | null
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
  content_image_url: '',
  location: '',
  testimonial: '',
  sort_order: 0,
  is_active: true,
}

const TLD_COUNTRY_MAP: Record<string, string> = {
  sg: 'Singapore',
  ph: 'Philippines',
  my: 'Malaysia',
  au: 'Australia',
  nz: 'New Zealand',
  uk: 'United Kingdom',
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
  const secondTld = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : ''
  if (secondTld && TLD_COUNTRY_MAP[secondTld]) return TLD_COUNTRY_MAP[secondTld]
  if (TLD_COUNTRY_MAP[tld]) return TLD_COUNTRY_MAP[tld]
  return ''
}

async function parseJsonSafely(response: Response) {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

// ─── Image Upload Widget ────────────────────────────────────────────────────

function ImageUploadWidget({
  label,
  hint,
  dimensions,
  maxSizeKB,
  accept,
  currentUrl,
  onUploaded,
  onRemove,
}: {
  label: string
  hint: string
  dimensions: string
  maxSizeKB: number
  accept: string
  currentUrl: string
  onUploaded: (url: string) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(currentUrl)

  async function handleFile(file: File) {
    setError('')
    // Validate size
    if (file.size > maxSizeKB * 1024) {
      setError(`File too large. Max size: ${maxSizeKB >= 1024 ? `${maxSizeKB / 1024}MB` : `${maxSizeKB}KB`}`)
      return
    }
    // Local preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    // Upload
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await parseJsonSafely(res)
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      const url = data?.url || data?.publicUrl || data?.path
      if (!url) throw new Error('No URL returned from upload')
      setPreview(url)
      onUploaded(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview(currentUrl)
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    setPreview('')
    onRemove()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-neutral-700">{label}</label>
        <span className="text-xs text-neutral-400">{hint}</span>
      </div>

      {/* Dimension badge */}
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2 py-1">
        <svg className="h-3 w-3 text-blue-400" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm4.5 0a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
        </svg>
        <span className="text-xs font-medium text-blue-600">{dimensions}</span>
        <span className="text-xs text-blue-400">
          — max {maxSizeKB >= 1024 ? `${maxSizeKB / 1024}MB` : `${maxSizeKB}KB`}
        </span>
      </div>

      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          <img
            src={preview}
            alt="Preview"
            className="w-full object-contain"
            style={{ maxHeight: '160px' }}
            onError={() => setPreview('')}
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50 transition"
            >
              Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <p className="text-sm font-medium text-neutral-600">Uploading...</p>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 px-4 py-7 text-center transition hover:border-neutral-300 hover:bg-neutral-100"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {uploading ? (
            <p className="text-sm text-neutral-500">Uploading...</p>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Click to upload or drag and drop
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">{accept.replace(/image\//g, '').toUpperCase()}</p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}

// ─── Logo Search (Clearbit) ─────────────────────────────────────────────────

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
    if (!q || q.length < 2) { setSuggestions([]); setOpen(false); return }
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
    } catch { /* silent */ } finally { setSearching(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 450)
    return () => clearTimeout(t)
  }, [query, search])

  function handleSelect(e: React.MouseEvent, company: ClearbitCompany) {
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
    onSelect(val, previewLogo, '')
    if (!val) { setPreviewLogo(''); setSuggestions([]); setOpen(false) }
  }

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        {previewLogo && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white p-1">
            <img src={previewLogo} alt="logo" className="h-full w-full object-contain"
              onError={() => setPreviewLogo('')} />
          </div>
        )}
        <div className="relative flex-1">
          <input
            value={query}
            onChange={handleManualChange}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Search company name — or type manually"
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
            Select a match, or type freely if not listed
          </p>
          {suggestions.map(s => (
            <button key={s.domain} type="button" onMouseDown={e => handleSelect(e, s)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors"
            >
              {s.logo && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-100 bg-white p-1">
                  <img src={s.logo} alt={s.name} className="h-full w-full object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 truncate">{s.name}</p>
                <p className="text-xs text-neutral-400 truncate">
                  {s.domain}{inferLocationFromDomain(s.domain) ? ` — ${inferLocationFromDomain(s.domain)}` : ''}
                </p>
              </div>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">Not listed? Type the name and upload a logo below.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Form ─────────────────────────────────────────────────────────────

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
  const [logoTab, setLogoTab] = useState<'search' | 'upload'>('search')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    if (type === 'checkbox') { setForm(f => ({ ...f, [name]: target.checked })); return }
    setForm(f => ({ ...f, [name]: name === 'sort_order' ? Number(value) : value }))
  }

  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">Name</label>
        <input name="name" value={form.name} onChange={handleChange}
          placeholder="Client name" required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      {/* Company + Logo */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-neutral-800">Company & Logo</p>

        {/* Company name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">Company name</label>
          <LogoSearch
            value={form.company}
            onSelect={(company, logoUrl, inferredLocation) => {
              setForm(f => ({
                ...f,
                company,
                logo_url: logoUrl || f.logo_url,
                location: inferredLocation && !f.location ? inferredLocation : f.location,
              }))
              if (logoUrl) setLogoTab('search')
            }}
          />
        </div>

        {/* Logo source toggle */}
        <div>
          <div className="mb-2 flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            <button type="button" onClick={() => setLogoTab('search')}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${logoTab === 'search' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Clearbit auto-fetch
            </button>
            <button type="button" onClick={() => setLogoTab('upload')}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${logoTab === 'upload' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Upload logo
            </button>
          </div>

          {logoTab === 'search' && form.logo_url && (
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white p-1">
                <img src={form.logo_url} alt="Logo"
                  className="h-full w-full object-contain"
                  onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              </div>
              <p className="text-xs text-neutral-500">
                Logo found for <strong>{form.company}</strong>
              </p>
              <button type="button" onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                className="ml-auto text-xs text-neutral-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          )}

          {logoTab === 'search' && !form.logo_url && (
            <p className="text-xs text-neutral-400">
              Type the company name above to auto-fetch their logo, or switch to Upload if not found.
            </p>
          )}

          {logoTab === 'upload' && (
            <ImageUploadWidget
              label=""
              hint="Company logo"
              dimensions="200 x 200 px — square"
              maxSizeKB={500}
              accept="image/png,image/webp,image/jpeg"
              currentUrl={form.logo_url}
              onUploaded={url => setForm(f => ({ ...f, logo_url: url }))}
              onRemove={() => setForm(f => ({ ...f, logo_url: '' }))}
            />
          )}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          Location
          <span className="ml-2 text-xs font-normal text-neutral-400">
            auto-suggested from domain
          </span>
        </label>
        <input name="location" value={form.location} onChange={handleChange}
          placeholder="City, Country"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      {/* Testimonial */}
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">Testimonial</label>
        <textarea name="testimonial" value={form.testimonial} onChange={handleChange}
          placeholder="Write the testimonial here" required rows={5}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
        />
      </div>

      {/* Content image */}
      <ImageUploadWidget
        label="Content image"
        hint="optional — shown on the testimonial card"
        dimensions="1200 x 675 px — 16:9 landscape"
        maxSizeKB={2048}
        accept="image/jpeg,image/webp,image/png"
        currentUrl={form.content_image_url}
        onUploaded={url => setForm(f => ({ ...f, content_image_url: url }))}
        onRemove={() => setForm(f => ({ ...f, content_image_url: '' }))}
      />

      {/* Sort order + active */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-neutral-700">Sort order</label>
          <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
          />
        </div>
        <label className="mt-7 flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>

      <button type="button" onClick={() => onSubmit(form)}
        disabled={submitting || !form.name || !form.testimonial}
        className="inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  )
}

// ─── Edit Modal ────────────────────────────────────────────────────────────

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
    content_image_url: testimonial.content_image_url || '',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Edit testimonial</h2>
          <button type="button" onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">
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

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchTestimonials() }, [])

  async function fetchTestimonials() {
    try {
      setLoading(true); setError('')
      const response = await fetch('/api/admin/testimonials', { cache: 'no-store' })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch')
      setTestimonials(Array.isArray(data) ? data : [])
    } catch (err) {
      setTestimonials([])
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally { setLoading(false) }
  }

  async function handleAdd(form: typeof emptyForm) {
    try {
      setSubmitting(true); setError(''); setSuccess('')
      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to add')
      if (data) setTestimonials(prev =>
        [data, ...prev].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      )
      setSuccess('Testimonial added successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this testimonial?')) return
    try {
      setDeletingId(id); setError(''); setSuccess('')
      const response = await fetch(`/api/admin/testimonials?id=${id}`, { method: 'DELETE' })
      const data = await parseJsonSafely(response)
      if (!response.ok) throw new Error(data?.error || 'Failed to delete')
      setTestimonials(prev => prev.filter(item => item.id !== id))
      setSuccess('Testimonial deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally { setDeletingId(null) }
  }

  function handleEditSave(updated: Testimonial) {
    setTestimonials(prev =>
      prev.map(t => t.id === updated.id ? updated : t)
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
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Testimonials</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Add and manage testimonials shown on the homepage.
          </p>
        </div>

        {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[440px_minmax(0,1fr)]">
          {/* Add form */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">Add testimonial</h2>
              <p className="mt-1 text-sm text-neutral-500">Keep entries polished and credible.</p>
            </div>
            <TestimonialForm
              initialForm={emptyForm}
              onSubmit={handleAdd}
              submitLabel="Add testimonial"
              submitting={submitting}
            />
          </div>

          {/* Existing */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">Existing testimonials</h2>
                <p className="mt-1 text-sm text-neutral-500">Edit or remove entries.</p>
              </div>
              <button type="button" onClick={fetchTestimonials}
                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
                Loading...
              </div>
            ) : testimonials.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
                No testimonials yet.
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map(item => (
                  <div key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                    {/* Content image thumbnail */}
                    {item.content_image_url && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img src={item.content_image_url} alt="Content"
                          className="w-full object-cover" style={{ maxHeight: '100px' }}
                          onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.logo_url && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 bg-white p-1">
                              <img src={item.logo_url} alt={item.company || item.name}
                                className="h-full w-full object-contain"
                                onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
                              />
                            </div>
                          )}
                          <h3 className="text-base font-semibold text-neutral-900">{item.name}</h3>
                          {item.company && <span className="text-sm text-neutral-500">{item.company}</span>}
                          {item.location && <span className="text-sm text-neutral-400">{item.location}</span>}
                          {item.is_active
                            ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">Active</span>
                            : <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600">Inactive</span>
                          }
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-neutral-400">
                          Sort order: {item.sort_order ?? 0}
                        </p>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-700">
                          "{item.testimonial}"
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setEditingTestimonial(item)}
                          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60">
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