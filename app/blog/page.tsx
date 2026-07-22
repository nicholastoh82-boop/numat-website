import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { newsMetadata } from '@/numat-seo-metadata'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type BlogItem = {
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
  ...newsMetadata,
  alternates: { canonical: 'https://numatbamboo.com/blog' },
  openGraph: { ...newsMetadata.openGraph, url: 'https://numatbamboo.com/blog' },
}

export default async function BlogPage() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // The table stays named `news`. Only the public route and wording moved to Blog.
  const { data: items, error } = await supabase
    .from('news')
    .select('id, title, slug, excerpt, status, featured, cover_image_url, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('Error loading public blog posts:', error)
  }

  const posts: BlogItem[] = items ?? []

  const heroItem = posts.find((item) => item.featured) ?? posts[0] ?? null
  const gridItems = posts.filter((item) => item.id !== heroItem?.id)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f9f6f0]">
        <section className="border-b bg-white">
          <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              NuMat Bamboo Blog
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 md:text-5xl">
              Blog
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
              Field notes, product updates, and construction perspectives from NuMat Bamboo, an engineered
              bamboo manufacturer in the Philippines.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
          {posts.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-muted-foreground">
              No posts have been published yet.
            </div>
          ) : (
            <>
              {heroItem && (
                <Link
                  href={`/blog/${heroItem.slug}`}
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

                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-3">
                      Read post <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              )}

              {gridItems.length > 0 && (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-stone-900">More posts</h2>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {gridItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/blog/${item.slug}`}
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
