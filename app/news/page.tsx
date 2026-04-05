import Link from 'next/link'
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
  status: 'draft' | 'published'
  featured: boolean
  cover_image_url: string | null
  published_at: string | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const metadata = {
  title: 'News & Updates | NUMAT Bamboo',
  description:
    'The latest news, project updates, product announcements, and industry insights from NUMAT Bamboo — engineered bamboo manufacturer in the Philippines.',
  openGraph: {
    title: 'News & Updates | NUMAT Bamboo',
    description:
      'The latest news and updates from NUMAT Bamboo, a leading engineered bamboo manufacturer in the Philippines.',
    type: 'website',
  },
}

export default async function NewsPage() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: items, error } = await supabase
    .from('news')
    .select('id, title, slug, excerpt, status, featured, cover_image_url, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error loading public news:', error)
  }

  const newsItems: NewsItem[] = items ?? []

  // Use explicitly featured article, or fall back to the most recent one as the hero
  const heroItem = newsItems.find((item) => item.featured) ?? newsItems[0] ?? null
  const gridItems = newsItems.filter((item) => item.id !== heroItem?.id)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f9f6f0]">

        {/* ── Page header ── */}
        <section className="bg-white border-b">
          <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              NUMAT News
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 md:text-5xl">
              News &amp; Updates
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
              Industry insights, product launches, project updates and company announcements from
              NUMAT Bamboo — the Philippines&apos; engineered bamboo manufacturer.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">

          {newsItems.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-muted-foreground">
              No news updates have been published yet.
            </div>
          ) : (
            <>
              {/* ── Featured / hero article ── */}
              {heroItem && (
                <Link
                  href={`/news/${heroItem.slug}`}
                  className="group mb-12 block overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {heroItem.cover_image_url && (
                    <div className="aspect-[16/7] w-full overflow-hidden bg-stone-100">
                      <img
                        src={heroItem.cover_image_url}
                        alt={heroItem.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  )}

                  <div className="p-7 md:p-10">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                        Latest
                      </span>
                      {heroItem.published_at && (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(heroItem.published_at)}
                        </span>
                      )}
                    </div>

                    <h2 className="font-serif text-2xl font-semibold leading-snug text-stone-900 group-hover:text-primary sm:text-3xl md:text-4xl">
                      {heroItem.title}
                    </h2>

                    {heroItem.excerpt && (
                      <p className="mt-4 max-w-3xl text-base leading-relaxed text-stone-600">
                        {heroItem.excerpt}
                      </p>
                    )}

                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                      Read article <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              )}

              {/* ── Grid of remaining articles ── */}
              {gridItems.length > 0 && (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-stone-900">More Updates</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Recent announcements and industry perspectives from NUMAT.
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {gridItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/news/${item.slug}`}
                        className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {item.cover_image_url && (
                          <div className="aspect-[16/10] w-full overflow-hidden bg-stone-100">
                            <img
                              src={item.cover_image_url}
                              alt={item.title}
                              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                            />
                          </div>
                        )}

                        <div className="p-6">
                          {item.published_at && (
                            <p className="mb-2 text-xs text-muted-foreground">
                              {formatDate(item.published_at)}
                            </p>
                          )}
                          <h3 className="text-lg font-semibold leading-snug text-stone-900 group-hover:text-primary">
                            {item.title}
                          </h3>
                          {item.excerpt && (
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-600">
                              {item.excerpt}
                            </p>
                          )}
                          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                            Read more →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
