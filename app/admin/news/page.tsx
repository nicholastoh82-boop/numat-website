'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type NewsItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: 'draft' | 'published'
  featured: boolean
  cover_image_url: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

type FilterValue = 'all' | 'draft' | 'published' | 'featured'

export default function AdminNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')

  async function loadNews() {
    try {
      setLoading(true)
      setError('')

      let url = '/api/admin/news'

      if (filter === 'draft') {
        url = '/api/admin/news?status=draft'
      } else if (filter === 'published') {
        url = '/api/admin/news?status=published'
      } else if (filter === 'featured') {
        url = '/api/admin/news?featured=true'
      }

      const response = await fetch(url, { cache: 'no-store' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load news.')
      }

      setItems(result.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews()
  }, [filter])

  const emptyMessage = useMemo(() => {
    if (filter === 'draft') return 'No draft news posts found.'
    if (filter === 'published') return 'No published news posts found.'
    if (filter === 'featured') return 'No featured news posts found.'
    return 'No news posts found.'
  }, [filter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">News</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and publish company news and activity updates.
          </p>
        </div>

        <Link
          href="/admin/news/new"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          New Post
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border'
          }`}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => setFilter('draft')}
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            filter === 'draft'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border'
          }`}
        >
          Drafts
        </button>

        <button
          type="button"
          onClick={() => setFilter('published')}
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            filter === 'published'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border'
          }`}
        >
          Published
        </button>

        <button
          type="button"
          onClick={() => setFilter('featured')}
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            filter === 'featured'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-foreground border-border'
          }`}
        >
          Featured
        </button>
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading news posts...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{item.title}</h2>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>

                    {item.featured && (
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">/{item.slug}</p>

                  {item.excerpt && (
                    <p className="max-w-3xl text-sm text-muted-foreground">{item.excerpt}</p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {item.published_at
                      ? `Published: ${new Date(item.published_at).toLocaleDateString()}`
                      : 'Not yet published'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/admin/news/${item.id}`}
                    className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}