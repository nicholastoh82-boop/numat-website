import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Header from '@/components/header'
import Footer from '@/components/footer'

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

export default async function NewsPage() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: items, error } = await supabase
    .from('news')
    .select('id, title, slug, excerpt, status, featured, cover_image_url, published_at')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error loading public news:', error)
  }

  const newsItems: NewsItem[] = items ?? []
  const featuredItem = newsItems.find((item) => item.featured) || null

  return (
    <>
      <Header />

      <main className="min-h-screen bg-background">
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:px-6 lg:px-8">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                News
              </p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                NUMAT News & Activities
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                Updates on projects, product developments, events, partnerships, and company
                activities across NUMAT Bamboo.
              </p>

              <div className="pt-2">
                <Link
                  href="/news/archive"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  Browse News Archive
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
          {featuredItem && (
            <article className="mb-10 overflow-hidden rounded-2xl border bg-card">
              {featuredItem.cover_image_url && (
                <div className="aspect-[16/7] w-full overflow-hidden bg-muted">
                  <img
                    src={featuredItem.cover_image_url}
                    alt={featuredItem.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-8">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Featured
                  </span>
                  {featuredItem.published_at && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(featuredItem.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {featuredItem.title}
                </h2>

                {featuredItem.excerpt && (
                  <p className="mt-4 max-w-3xl text-muted-foreground">
                    {featuredItem.excerpt}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/news/${featuredItem.slug}`}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    Read Update
                  </Link>

                  <Link
                    href="/news/archive"
                    className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                  >
                    View Archive
                  </Link>
                </div>
              </div>
            </article>
          )}

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Latest Updates</h2>
              <p className="text-sm text-muted-foreground">
                Recent NUMAT announcements and activity highlights.
              </p>
            </div>

            <Link
              href="/news/archive"
              className="hidden rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted md:inline-flex"
            >
              View Archive
            </Link>
          </div>

          {newsItems.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
              No news updates have been published yet.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {newsItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {item.cover_image_url && (
                    <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {item.published_at && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.published_at).toLocaleDateString()}
                        </p>
                      )}

                      {item.featured && (
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          Featured
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>

                    {item.excerpt && (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {item.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  )
}