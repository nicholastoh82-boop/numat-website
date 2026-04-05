import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Header from '@/components/header'
import Footer from '@/components/footer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type NewsItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: any
  cover_image_url: string | null
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  status: 'draft' | 'published'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (!supabaseUrl || !supabaseServiceRoleKey) return {}

  const { slug } = await params
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data } = await supabase
    .from('news')
    .select('title, excerpt, seo_title, seo_description, cover_image_url, status, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) return {}

  const title = data.seo_title || `${data.title} | NUMAT News`
  const description = data.seo_description || data.excerpt || 'NUMAT Bamboo news and activity updates.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: data.published_at ?? undefined,
      images: data.cover_image_url ? [{ url: data.cover_image_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  }
}

function estimateReadingTime(content: any): number {
  let text = ''
  try {
    const str = JSON.stringify(content || '')
    text = str.replace(/<[^>]+>/g, ' ').replace(/[^a-zA-Z\s]/g, ' ')
  } catch {
    return 3
  }
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

// ─── Universal content renderer ──────────────────────────────────────────────
// Handles 3 formats that exist in the database:
//   Format 1 – old custom: [{ type, value: "plain text" }]
//   Format 2 – old Quill:  [{ type, value: "<p>html</p>" }]
//   Format 3 – Tiptap JSON: [{ type, content: [...] }]

function isHtmlString(str: string): boolean {
  return str.trimStart().startsWith('<')
}

function renderInline(inline: any, key: number): React.ReactNode {
  const text = inline.text ?? ''
  const isBold = inline.marks?.some((m: any) => m.type === 'bold')
  const isItalic = inline.marks?.some((m: any) => m.type === 'italic')
  const isCode = inline.marks?.some((m: any) => m.type === 'code')
  const linkMark = inline.marks?.find((m: any) => m.type === 'link')

  let node: React.ReactNode = text
  if (isCode) node = <code key={key} className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm">{text}</code>
  if (isBold) node = <strong key={key} className="font-semibold text-stone-900">{node}</strong>
  if (isItalic) node = <em key={key}>{node}</em>
  if (linkMark) {
    node = (
      <a
        key={key}
        href={linkMark.attrs?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {node}
      </a>
    )
  }
  return <span key={key}>{node}</span>
}

function renderTiptapBlock(block: any, i: number): React.ReactNode {
  if (block.type === 'paragraph') {
    const inlines = block.content ?? []
    if (!inlines.length) return <div key={i} className="h-3" />
    return (
      <p key={i} className="mb-5 text-base leading-[1.9] text-stone-700">
        {inlines.map((inline: any, j: number) => renderInline(inline, j))}
      </p>
    )
  }

  if (block.type === 'heading') {
    const level = block.attrs?.level ?? 2
    const text = block.content?.map((c: any) => c.text).join('') ?? ''
    if (level === 1) return <h1 key={i} className="mb-4 mt-10 text-3xl font-semibold text-stone-900">{text}</h1>
    if (level === 2) return <h2 key={i} className="mb-3 mt-10 text-2xl font-semibold text-stone-900">{text}</h2>
    if (level === 3) return <h3 key={i} className="mb-2 mt-7 text-xl font-semibold text-stone-900">{text}</h3>
    return <h4 key={i} className="mb-2 mt-6 text-lg font-semibold text-stone-900">{text}</h4>
  }

  if (block.type === 'bulletList') {
    return (
      <ul key={i} className="mb-5 list-disc space-y-2 pl-6">
        {block.content?.map((item: any, j: number) => (
          <li key={j} className="text-base leading-[1.8] text-stone-700">
            {item.content?.[0]?.content?.map((inline: any, k: number) => renderInline(inline, k))}
          </li>
        ))}
      </ul>
    )
  }

  if (block.type === 'orderedList') {
    return (
      <ol key={i} className="mb-5 list-decimal space-y-2 pl-6">
        {block.content?.map((item: any, j: number) => (
          <li key={j} className="text-base leading-[1.8] text-stone-700">
            {item.content?.[0]?.content?.map((inline: any, k: number) => renderInline(inline, k))}
          </li>
        ))}
      </ol>
    )
  }

  if (block.type === 'blockquote') {
    const text = block.content
      ?.flatMap((p: any) => p.content?.map((c: any) => c.text) ?? [])
      .join('') ?? ''
    return (
      <blockquote key={i} className="my-7 border-l-4 border-primary/60 pl-5 text-lg italic leading-8 text-stone-600">
        {text}
      </blockquote>
    )
  }

  if (block.type === 'image') {
    return (
      <figure key={i} className="my-8 space-y-2">
        <img
          src={block.attrs?.src}
          alt={block.attrs?.alt || ''}
          className="w-full rounded-2xl object-cover"
        />
        {block.attrs?.title && (
          <figcaption className="text-center text-sm text-muted-foreground">{block.attrs.title}</figcaption>
        )}
      </figure>
    )
  }

  return null
}

function renderLegacyBlock(block: any, i: number): React.ReactNode {
  const value: string = String(block.value ?? '')

  // Format 2: HTML string
  if (isHtmlString(value)) {
    const cleaned = value
      .replace(/<p><br\s*\/?><\/p>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
    return (
      <div
        key={i}
        className="article-body"
        dangerouslySetInnerHTML={{ __html: cleaned }}
      />
    )
  }

  // Format 1: plain text
  if (block.type === 'heading') {
    return (
      <h2 key={i} className="mb-3 mt-10 text-2xl font-semibold text-stone-900">
        {value}
      </h2>
    )
  }

  if (block.type === 'paragraph') {
    const parts = value.split(/\n\n+/).filter(Boolean)
    return (
      <div key={i}>
        {parts.map((part, j) => (
          <p key={j} className="mb-5 text-base leading-[1.9] text-stone-700">
            {part.split('\n').map((line, k) => (
              <span key={k}>
                {k > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        ))}
      </div>
    )
  }

  if (block.type === 'quote') {
    return (
      <blockquote key={i} className="my-7 border-l-4 border-primary/60 pl-5 text-lg italic leading-8 text-stone-600">
        {value}
      </blockquote>
    )
  }

  if (block.type === 'image') {
    return (
      <figure key={i} className="my-8 space-y-2">
        <img src={value} alt={block.caption || ''} className="w-full rounded-2xl object-cover" />
        {block.caption && (
          <figcaption className="text-center text-sm text-muted-foreground">{block.caption}</figcaption>
        )}
      </figure>
    )
  }

  return null
}

function renderContent(content: any): React.ReactNode {
  if (!content) return null

  let blocks: any[] = []
  if (Array.isArray(content)) {
    blocks = content
  } else if (content?.content && Array.isArray(content.content)) {
    blocks = content.content
  }

  if (!blocks.length) return null

  // Detect format by checking the first block
  const firstBlock = blocks[0]
  const usesLegacyFormat = firstBlock?.value !== undefined

  return blocks.map((block, i) =>
    usesLegacyFormat ? renderLegacyBlock(block, i) : renderTiptapBlock(block, i)
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  const { slug } = await params
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: item, error } = await supabase
    .from('news')
    .select(
      'id, title, slug, excerpt, content, cover_image_url, published_at, seo_title, seo_description, status'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) console.error('Error loading news detail:', error)
  if (!item) notFound()

  const newsItem = item as NewsItem
  const readingTime = estimateReadingTime(newsItem.content)

  const formattedDate = newsItem.published_at
    ? new Date(newsItem.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const { data: recentItems } = await supabase
    .from('news')
    .select('id, title, slug, excerpt, cover_image_url, published_at')
    .eq('status', 'published')
    .neq('id', newsItem.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: newsItem.seo_title || newsItem.title,
    description: newsItem.seo_description || newsItem.excerpt || '',
    image: newsItem.cover_image_url || '',
    datePublished: newsItem.published_at || '',
    author: {
      '@type': 'Organization',
      name: 'NUMAT Bamboo',
      url: 'https://numatbamboo.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'NUMAT Bamboo',
      url: 'https://numatbamboo.com',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />

      <main className="min-h-screen bg-[#f9f6f0]">

        {/* ── Article header ── */}
        <section className="bg-white border-b">
          <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
            <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link href="/news" className="hover:text-foreground">News</Link>
              <span>/</span>
              <span className="text-foreground line-clamp-1">{newsItem.title}</span>
            </nav>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                NUMAT News
              </span>
              {formattedDate && (
                <span className="text-sm text-muted-foreground">{formattedDate}</span>
              )}
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{readingTime} min read</span>
            </div>

            <h1 className="font-serif text-3xl font-semibold leading-tight text-stone-900 sm:text-4xl md:text-5xl">
              {newsItem.title}
            </h1>

            {newsItem.excerpt && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">
                {newsItem.excerpt}
              </p>
            )}
          </div>
        </section>

        {/* ── Cover image ── */}
        {newsItem.cover_image_url && (
          <div className="mx-auto max-w-4xl px-5 pt-10 md:px-8">
            <div className="overflow-hidden rounded-3xl bg-stone-100 shadow-sm">
              <img
                src={newsItem.cover_image_url}
                alt={newsItem.title}
                className="w-full object-cover"
                style={{ maxHeight: '520px' }}
              />
            </div>
          </div>
        )}

        {/* ── Article body ── */}
        <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
          <article>
            {newsItem.content ? (
              renderContent(newsItem.content)
            ) : (
              <p className="text-base leading-8 text-stone-600">
                No article content has been added yet.
              </p>
            )}
          </article>

          {/* ── Share / CTA ── */}
          <div className="mt-14 rounded-2xl border border-primary/20 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Interested in NUMAT products?
            </p>
            <p className="mt-2 text-base text-stone-700">
              Explore our full range of engineered bamboo materials — boards, flooring, slat systems, and more.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Browse Products
              </Link>
              <Link
                href="/request-quote"
                className="inline-flex items-center rounded-full border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                Request a Quote
              </Link>
            </div>
          </div>
        </div>

        {/* ── More Updates ── */}
        {recentItems && recentItems.length > 0 && (
          <section className="border-t bg-white py-14">
            <div className="mx-auto max-w-5xl px-5 md:px-8">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">Keep Reading</p>
                  <h2 className="mt-1 text-2xl font-semibold text-stone-900">More Updates</h2>
                </div>
                <Link href="/news" className="text-sm font-medium text-primary hover:underline">
                  All News →
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {recentItems.map((recent: any) => (
                  <Link
                    key={recent.id}
                    href={`/news/${recent.slug}`}
                    className="group overflow-hidden rounded-2xl border bg-[#f9f6f0] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {recent.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-stone-100">
                        <img
                          src={recent.cover_image_url}
                          alt={recent.title}
                          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      {recent.published_at && (
                        <p className="mb-2 text-xs text-muted-foreground">
                          {new Date(recent.published_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </p>
                      )}
                      <h3 className="text-base font-semibold leading-snug text-stone-900 group-hover:text-primary">
                        {recent.title}
                      </h3>
                      {recent.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm text-stone-600">{recent.excerpt}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}
