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
  published_at: string | null
  status: 'draft' | 'published'
}

type ArchiveGroup = {
  year: string
  month: string
  monthLabel: string
  count: number
}

function getMonthLabel(month: string) {
  return new Date(2000, Number(month) - 1, 1).toLocaleString('en-US', {
    month: 'long',
  })
}

export default async function NewsArchivePage() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data, error } = await supabase
    .from('news')
    .select('id, title, slug, published_at, status')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error loading news archive:', error)
  }

  const items: NewsItem[] = data ?? []

  const groupedMap = new Map<string, ArchiveGroup>()

  for (const item of items) {
    if (!item.published_at) continue

    const date = new Date(item.published_at)
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const key = `${year}-${month}`

    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        year,
        month,
        monthLabel: getMonthLabel(month),
        count: 1,
      })
    } else {
      const existing = groupedMap.get(key)!
      existing.count += 1
      groupedMap.set(key, existing)
    }
  }

  const archiveGroups = Array.from(groupedMap.values()).sort((a, b) => {
    const aKey = `${a.year}-${a.month}`
    const bKey = `${b.year}-${b.month}`
    return aKey < bKey ? 1 : -1
  })

  const groupedByYear = archiveGroups.reduce<Record<string, ArchiveGroup[]>>((acc, group) => {
    if (!acc[group.year]) {
      acc[group.year] = []
    }
    acc[group.year].push(group)
    return acc
  }, {})

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a))

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
                News Library
              </h1>
              <p className="text-base text-muted-foreground md:text-lg">
                Browse past NUMAT news, activities, announcements, and company updates by month and year.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Archive by Date</h2>
              <p className="text-sm text-muted-foreground">
                View all published updates organized by month and year.
              </p>
            </div>

            <Link
              href="/news"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Back to News
            </Link>
          </div>

          {years.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
              No archived news posts found.
            </div>
          ) : (
            <div className="space-y-8">
              {years.map((year) => (
                <section key={year} className="rounded-2xl border bg-card p-6">
                  <h3 className="text-2xl font-semibold tracking-tight">{year}</h3>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {groupedByYear[year].map((group) => (
                      <Link
                        key={`${group.year}-${group.month}`}
                        href={`/news/archive/${group.year}/${group.month}`}
                        className="rounded-2xl border bg-background p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-stone-900">
                              {group.monthLabel}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {group.year}
                            </p>
                          </div>

                          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {group.count} {group.count === 1 ? 'post' : 'posts'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  )
}