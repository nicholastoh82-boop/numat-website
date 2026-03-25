import Link from 'next/link'
import { notFound } from 'next/navigation'
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
  cover_image_url: string | null
  published_at: string | null
  status: 'draft' | 'published'
}

function getMonthLabel(month: string) {
  return new Date(2000, Number(month) - 1, 1).toLocaleString('en-US', {
    month: 'long',
  })
}

export default async function NewsArchiveMonthPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>
}) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  const { year, month } = await params

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    notFound()
  }

  const startDate = `${year}-${month}-01T00:00:00.000Z`
  const nextMonth = new Date(Number(year), Number(month), 1)
  const endDate = nextMonth.toISOString()

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data, error } = await supabase
    .from('news')
    .select('id, title, slug, excerpt, cover_image_url, published_at, status')
    .eq('status', 'published')
    .gte('published_at', startDate)
    .lt('published_at', endDate)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error loading archive month page:', error)
  }

  const items: NewsItem[] = data ?? []

  if (items.length === 0) {
    notFound()
  }

  const monthLabel = getMonthLabel(month)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-background">
        <section className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-16 md:px-6 lg:px-8">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                Archive
              </p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                {monthLabel} {year}
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                Published NUMAT news, announcements, and activity updates for this period.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/news/archive"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  Back to Archive
                </Link>

                <Link
                  href="/news"
                  className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  Back to News
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              {items.length} {items.length === 1 ? 'Update' : 'Updates'}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
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
                  {item.published_at && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {new Date(item.published_at).toLocaleDateString()}
                    </p>
                  )}

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
        </section>
      </main>

      <Footer />
    </>
  )
}