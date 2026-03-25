'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type ContentBlock = {
  type: 'heading' | 'paragraph' | 'image' | 'quote'
  value: string
  caption?: string
}

export default function NewNewsPage() {
  const router = useRouter()

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [multiUploading, setMultiUploading] = useState(false)
  const [blockUploadingIndex, setBlockUploadingIndex] = useState<number | null>(null)

  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const multiImageInputRef = useRef<HTMLInputElement | null>(null)

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

  async function uploadSingleFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to upload image.')
    }

    return result.url as string
  }

  async function handleCoverUpload(file: File) {
    try {
      setError('')
      setCoverUploading(true)
      const url = await uploadSingleFile(file)
      setCoverImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover image.')
    } finally {
      setCoverUploading(false)
    }
  }

  async function handleBlockUpload(index: number, file: File) {
    try {
      setError('')
      setBlockUploadingIndex(index)
      const url = await uploadSingleFile(file)
      updateBlock(index, 'value', url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setBlockUploadingIndex(null)
    }
  }

  async function handleMultiImageUpload(files: FileList) {
    try {
      setError('')
      setMultiUploading(true)

      const uploadedBlocks: ContentBlock[] = []

      for (const file of Array.from(files)) {
        const url = await uploadSingleFile(file)
        uploadedBlocks.push({
          type: 'image',
          value: url,
          caption: '',
        })
      }

      setContent((prev) => [...prev, ...uploadedBlocks])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images.')
    } finally {
      setMultiUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')

      const response = await fetch('/api/admin/news', {
        method: 'POST',
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
        throw new Error(result.error || 'Failed to create news post.')
      }

      router.push('/admin/news')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create news post.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New News Post</h1>
        <p className="text-sm text-muted-foreground">
          Create a new company update, activity post, or announcement.
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
              placeholder="leave blank to auto-generate from title"
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

          <div className="space-y-3">
            <label className="text-sm font-medium">Cover Image</label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="rounded-lg border px-3 py-2 text-sm"
                disabled={coverUploading}
              >
                {coverUploading ? 'Uploading Cover...' : 'Upload Cover Image'}
              </button>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  await handleCoverUpload(file)
                }
                e.currentTarget.value = ''
              }}
            />

            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="/images/news/example.jpg or uploaded image URL"
            />

            {coverImageUrl && (
              <div className="overflow-hidden rounded-xl border bg-muted">
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="max-h-64 w-full object-cover"
                />
              </div>
            )}
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
            <button
              type="button"
              onClick={() => multiImageInputRef.current?.click()}
              className="rounded-lg border px-3 py-2 text-sm"
              disabled={multiUploading}
            >
              {multiUploading ? 'Uploading Images...' : 'Upload Multiple Images'}
            </button>
          </div>

          <input
            ref={multiImageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files
              if (files && files.length > 0) {
                await handleMultiImageUpload(files)
              }
              e.currentTarget.value = ''
            }}
          />

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

                {block.type === 'image' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm">
                        {blockUploadingIndex === index ? 'Uploading...' : 'Upload Image'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              await handleBlockUpload(index, file)
                            }
                            e.currentTarget.value = ''
                          }}
                        />
                      </label>
                    </div>

                    <input
                      value={block.value}
                      onChange={(e) => updateBlock(index, 'value', e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      placeholder="Enter image URL"
                    />

                    <input
                      value={block.caption || ''}
                      onChange={(e) => updateBlock(index, 'caption', e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      placeholder="Image caption"
                    />

                    {block.value && (
                      <div className="overflow-hidden rounded-xl border bg-muted">
                        <img
                          src={block.value}
                          alt={block.caption || 'News image preview'}
                          className="max-h-72 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={block.value}
                    onChange={(e) => updateBlock(index, 'value', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[120px]"
                    placeholder="Enter content"
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  )
}