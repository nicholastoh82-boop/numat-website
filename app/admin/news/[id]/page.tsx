'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type ContentBlock = {
  type: 'heading' | 'paragraph' | 'image' | 'quote'
  value: string
  caption?: string
}

type NewsItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: ContentBlock[] | null
  cover_image_url: string | null
  status: 'draft' | 'published'
  featured: boolean
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
}

export default function EditNewsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [featured, setFeatured] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [content, setContent] = useState<ContentBlock[]>([
    { type: 'paragraph', value: '' },
  ])

  useEffect(() => {
    async function loadItem() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/admin/news/${id}`, {
          cache: 'no-store',
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load news post.')
        }

        const item: NewsItem = result.item

        setTitle(item.title || '')
        setSlug(item.slug || '')
        setExcerpt(item.excerpt || '')
        setCoverImageUrl(item.cover_image_url || '')
        setStatus(item.status || 'draft')
        setFeatured(Boolean(item.featured))
        setSeoTitle(item.seo_title || '')
        setSeoDescription(item.seo_description || '')
        setContent(
          Array.isArray(item.content) && item.content.length > 0
            ? item.content
            : [{ type: 'paragraph', value: '' }]
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load news post.')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadItem()
    }
  }, [id])

  function addBlock(type: ContentBlock['type']) {
    setContent((prev) => [...prev, { type, value: '', caption: '' }])
  }

  function updateBlock(index: number, field: 'type' | 'value' | 'caption', value: string) {
    setContent((prev) =>
      prev.map((block, i) =>
        i === index
          ? {
              ...block,
              [field]: value,
            }
          : block
      )
    )
  }

  function removeBlock(index: number) {
    setContent((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')

      const response = await fetch(`/api/admin/news/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          cover_image_url: coverImageUrl,
          status,
          featured,
          seo_title: seoTitle,
          seo_description: seoDescription,
          content,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update news post.')
      }

      router.push('/admin/news')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update news post.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm('Delete this news post? This cannot be undone.')
    if (!confirmed) return

    try {
      setDeleting(true)
      setError('')

      const response = await fetch(`/api/admin/news/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete news post.')
      }

      router.push('/admin/news')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete news post.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading news post...</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit News Post</h1>
        <p className="text-sm text-muted-foreground">
          Update company news, activities, and announcements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Enter news title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="news-post-slug"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Short summary for cards and SEO"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cover Image URL</label>
            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="/images/news/example.jpg or uploaded image URL"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-8">
              <input
                id="featured"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              <label htmlFor="featured" className="text-sm font-medium">
                Featured post
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Content Blocks</h2>
            <p className="text-sm text-muted-foreground">
              Build the article using headings, paragraphs, images, and quotes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addBlock('heading')} className="rounded-lg border px-3 py-2 text-sm">
              Add Heading
            </button>
            <button type="button" onClick={() => addBlock('paragraph')} className="rounded-lg border px-3 py-2 text-sm">
              Add Paragraph
            </button>
            <button type="button" onClick={() => addBlock('image')} className="rounded-lg border px-3 py-2 text-sm">
              Add Image
            </button>
            <button type="button" onClick={() => addBlock('quote')} className="rounded-lg border px-3 py-2 text-sm">
              Add Quote
            </button>
          </div>

          <div className="space-y-4">
            {content.map((block, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <select
                    value={block.type}
                    onChange={(e) => updateBlock(index, 'type', e.target.value)}
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="heading">Heading</option>
                    <option value="paragraph">Paragraph</option>
                    <option value="image">Image</option>
                    <option value="quote">Quote</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <textarea
                  value={block.value}
                  onChange={(e) => updateBlock(index, 'value', e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[120px]"
                  placeholder={block.type === 'image' ? 'Enter image URL' : 'Enter content'}
                />

                {block.type === 'image' && (
                  <input
                    value={block.caption || ''}
                    onChange={(e) => updateBlock(index, 'caption', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Image caption"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">SEO</h2>
            <p className="text-sm text-muted-foreground">
              Optional overrides for search engines and social previews.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SEO Title</label>
            <input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Optional SEO title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SEO Description</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Optional SEO description"
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Post'}
          </button>
        </div>
      </form>
    </div>
  )
}