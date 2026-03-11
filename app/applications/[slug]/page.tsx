import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { applicationDetails } from '@/lib/applications-data'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { slug } = await params

  const item = applicationDetails.find((entry) => entry.slug === slug)

  if (!item) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-10">
          <div className="mb-6 lg:hidden">
            <Link
              href="/applications"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition hover:bg-stone-50"
            >
              <ArrowLeft className="h-4 w-4 text-emerald-800" />
              Back to Applications
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <Link
                  href="/applications"
                  className="inline-flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm font-semibold text-stone-900 shadow-lg transition hover:bg-stone-50 hover:shadow-xl"
                >
                  <ArrowLeft className="h-4 w-4 text-emerald-800" />
                  Back to Applications
                </Link>
              </div>
            </aside>

            <div className="min-w-0">
              <section className="rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                <div className="px-6 py-10 lg:px-8 lg:py-12">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                      Application
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                      {item.title}
                    </h1>
                    <p className="mt-4 text-lg leading-8 text-stone-700">
                      {item.intro}
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-6 space-y-6">
                {item.sections.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm"
                  >
                    <h2 className="text-2xl font-semibold text-stone-950">
                      {section.title}
                    </h2>

                    <div className="mt-5 space-y-3">
                      {section.body.map((line) => (
                        <p key={line} className="text-lg leading-8 text-stone-700">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-[2rem] border border-stone-200 bg-stone-950 p-8 text-white shadow-sm">
                  <h2 className="text-2xl font-semibold">
                    Need application-specific support?
                  </h2>
                  <p className="mt-3 text-base leading-7 text-stone-300">
                    Contact the NUMAT team for product guidance, sampling, and
                    commercial support for your project or buyer evaluation.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {item.ctas.map((cta) => (
                      <Link
                        key={cta.label}
                        href={cta.href}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                      >
                        {cta.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}