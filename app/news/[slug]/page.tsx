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
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {}
  }

  const { slug } = await params
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data } = await supabase
    .from('news')
    .select('title, excerpt, seo_title, seo_description, status')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) {
    return {}
  }

  return {
    title: data.seo_title || `${data.title} | NUMAT News`,
    description: data.seo_description || data.excerpt || 'NUMAT Bamboo news and activity updates.',
  }
}

function renderContent(content: any): React.ReactNode {
  let blocks: any[] = []

  if (Array.isArray(content)) {
    blocks = content
  } else if (content && typeof content === 'object' && Array.isArray(content.content)) {
    blocks = content.content
  } else {
    return null
  }

  return blocks.map((block, i) => {
    if (block.type === 'paragraph') {
      return (
        <p key={i} className="mb-4 text-base leading-relaxed text-foreground">
          {block.content?.map((inline: any, j: number) => {
            const isBold = inline.marks?.some((m: any) => m.type === 'bold')
            return isBold
              ? <strong key={j}>{inline.text}</strong>
              : <span key={j}>{inline.text}</span>
          })}
        </p>
      )
    }

    if (block.type === 'heading') {
      const level = block.attrs?.level ?? 2
      const text = block.content?.map((c: any) => c.text).join('') ?? ''
      if (level === 2) return <h2 key={i} className="mt-8 mb-3 text-2xl font-semibold text-foreground">{text}</h2>
      if (level === 3) return <h3 key={i} className="mt-6 mb-2 text-xl font-semibold text-foreground">{text}</h3>
      return <h4 key={i} className="mt-4 mb-2 text-lg font-semibold text-foreground">{text}</h4>
    }

    if (block.type === 'bulletList') {
      return (
        <ul key={i} className="mb-4 list-disc pl-6 space-y-1">
          {block.content?.map((item: any, j: number) => (
            <li key={j} className="text-base text-foreground">
              {item.content?.[0]?.content?.map((inline: any) => inline.text).join('') ?? ''}
            </li>
          ))}
        </ul>
      )
    }

    if (block.type === 'blockquote') {
      const text = block.content
        ?.flatMap((p: any) => p.content?.map((c: any) => c.text) ?? [])
        .join('') ?? ''
      return (
        <blockquote
          key={i}
          className="border-l-4 border-primary/50 pl-6 text-lg italic leading-8 text-stone-700"
        >
          {text}
        </blockquote>
      )
    }

    if (block.type === 'image') {
      return (
        <figure key={i} className="space-y-3">
          <div className="overflow-hidden rounded-2xl border bg-muted">
            <img
              src={block.attrs?.src}
              alt={block.attrs?.alt || 'News image'}
              className="w-full object-cover"
            />
          </div>
          {block.attrs?.title && (
            <figcaption className="text-sm text-muted-foreground">
              {block.attrs.title}
            </figcaption>
          )}
        </figure>
      )
    }

    return null
  })
}

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

  if (error) {
    console.error('Error loading news detail:', error)
  }

  if (!item) {
    notFound()
  }

  const newsItem = item as NewsItem

  const { data: recentItems } = await supabase
    .from('news')
    .select('id, title, slug')
    .eq('status', 'published')
    .neq('id', newsItem.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-background">
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-14 md:px-6 lg:px-8">
            <div className="max-w-4xl space-y-4">
              <Link
                href="/news"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                Back to News
              </Link>

              {newsItem.published_at && (
                <p className="text-sm text-muted-foreground">
                  {new Date(newsItem.published_at).toLocaleDateString()}
                </p>
              )}

              <h1 className="text-4xl font-semibold tracking-tight text-stone-900 md:text-5xl">
                {newsItem.title}
              </h1>

              {newsItem.excerpt && (
                <p className="max-w-3xl text-lg leading-8 text-stone-700">
                  {newsItem.excerpt}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-10">
            {newsItem.cover_image_url && (
              <div className="aspect-video overflow-hidden rounded-3xl border bg-muted">
                <img
                  src={newsItem.cover_image_url}
                  alt={newsItem.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <article className="space-y-8">
              {newsItem.content ? (
                renderContent(newsItem.content)
              ) : (
                <p className="text-base leading-8 text-stone-700">
                  No article content has been added yet.
                </p>
              )}
            </article>

            {recentItems && recentItems.length > 0 && (
              <section className="border-t pt-10">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold tracking-tight">More Updates</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {recentItems.map((recent) => (
                    <Link
                      key={recent.id}
                      href={`/news/${recent.slug}`}
                      className="rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <h3 className="text-base font-semibold text-stone-900">
                        {recent.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
