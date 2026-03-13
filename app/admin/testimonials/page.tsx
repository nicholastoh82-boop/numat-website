'use client'

import { useEffect, useState } from 'react'

type Testimonial = {
  id: string
  name: string
  location: string | null
  testimonial: string
  sort_order: number | null
  is_active: boolean
  created_at?: string | null
}

const emptyForm = {
  name: '',
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

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

      const response = await fetch('/api/admin/testimonials', {
        cache: 'no-store',
      })

      const data = await parseJsonSafely(response)

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch testimonials')
      }

      setTestimonials(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setTestimonials([])
      setError(
        error instanceof Error ? error.message : 'Failed to fetch testimonials'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target

    if (type === 'checkbox') {
      setForm((prev) => ({
        ...prev,
        [name]: target.checked,
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: name === 'sort_order' ? Number(value) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await parseJsonSafely(response)

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add testimonial')
      }

      if (data) {
        setTestimonials((prev) => {
          const next = [data, ...prev]
          return next.sort((a, b) => {
            const aOrder = a.sort_order ?? 0
            const bOrder = b.sort_order ?? 0
            if (aOrder !== bOrder) return aOrder - bOrder
            return 0
          })
        })
      }

      setForm(emptyForm)
      setSuccess('Testimonial added successfully.')
    } catch (error) {
      console.error(error)
      setError(
        error instanceof Error ? error.message : 'Failed to add testimonial'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this testimonial?'
    )

    if (!confirmed) return

    try {
      setDeletingId(id)
      setError('')
      setSuccess('')

      const response = await fetch(`/api/admin/testimonials?id=${id}`, {
        method: 'DELETE',
      })

      const data = await parseJsonSafely(response)

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete testimonial')
      }

      setTestimonials((prev) => prev.filter((item) => item.id !== id))
      setSuccess('Testimonial deleted successfully.')
    } catch (error) {
      console.error(error)
      setError(
        error instanceof Error ? error.message : 'Failed to delete testimonial'
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Testimonials
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Add and remove testimonials shown on the homepage.
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
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Add testimonial
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Keep entries polished and credible.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Client name"
                  required
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="City / Country"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor="testimonial"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Testimonial
                </label>
                <textarea
                  id="testimonial"
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
                <label
                  htmlFor="sort_order"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Sort order
                </label>
                <input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3 text-sm text-neutral-700">
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

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Existing testimonials
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Remove test or outdated entries from the live site.
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
                {testimonials.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="text-base font-semibold text-neutral-900">
                            {item.name}
                          </h3>

                          {item.location && (
                            <span className="text-sm text-neutral-600">
                              {item.location}
                            </span>
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
                          “{item.testimonial}”
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === item.id ? 'Removing...' : 'Delete'}
                      </button>
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