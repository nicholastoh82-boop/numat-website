import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { solutions } from '@/lib/solutions-data'

const SITE = 'https://numatbamboo.com'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return solutions.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = solutions.find((s) => s.slug === slug)
  if (!item) return { title: 'Solution not found | NuMat Bamboo' }
  const title = `${item.title} | Engineered Bamboo Solutions | NuMat Bamboo`
  return {
    title,
    description: item.cardDescription,
    alternates: { canonical: `${SITE}/solutions/${item.slug}` },
    openGraph: {
      title,
      description: item.cardDescription,
      url: `${SITE}/solutions/${item.slug}`,
      images: [{ url: item.heroImage }],
    },
  }
}

const cardClass = 'rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm lg:p-9'

export default async function SolutionDetailPage({ params }: PageProps) {
  const { slug } = await params
  const item = solutions.find((s) => s.slug === slug)
  if (!item) notFound()

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">
        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
            <Link
              href="/solutions"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              All solutions
            </Link>

            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                  {item.category}
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                  {item.title}
                </h1>
                <p className="mt-3 text-lg font-medium text-stone-700">{item.tagline}</p>
                <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">{item.intro}</p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/request-quote"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    Request a quote
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/request-samples"
                    className="inline-flex items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-50"
                  >
                    Request samples
                  </Link>
                </div>

                <p className="mt-5 text-sm text-stone-500">
                  Made with{' '}
                  <Link
                    href={`/products/${item.boardSlug}`}
                    className="font-semibold text-emerald-900 hover:underline"
                  >
                    {item.boardName}
                  </Link>{' '}
                  engineered bamboo board.
                </p>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-stone-200 shadow-sm">
                <Image
                  src={item.heroImage}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>

            {/* Key facts */}
            <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {item.keyFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-4"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                    {fact.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-stone-950">{fact.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-6 px-6 py-12 lg:px-8 lg:py-16">
          {/* Features */}
          <div className={cardClass}>
            <h2 className="text-2xl font-semibold text-stone-950">Design features</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {item.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <p className="text-sm leading-7 text-stone-700">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Grain options */}
          {item.grainOptions && item.grainOptions.length > 0 && (
            <div className={cardClass}>
              <h2 className="text-2xl font-semibold text-stone-950">Surface grain options</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {item.grainOptions.map((grain) => (
                  <div
                    key={grain.name}
                    className="rounded-[1.5rem] border border-stone-200 bg-[#faf6ef] p-5"
                  >
                    <p className="text-base font-semibold text-stone-950">{grain.name}</p>
                    <p className="mt-1 text-sm leading-7 text-stone-600">{grain.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Joint profile */}
          {item.jointProfile && item.jointProfile.length > 0 && (
            <div className={cardClass}>
              <h2 className="text-2xl font-semibold text-stone-950">Tongue and groove joint</h2>
              <div className="mt-6 overflow-hidden rounded-[1.25rem] border border-stone-200">
                {item.jointProfile.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-4 px-5 py-3 ${
                      i % 2 === 0 ? 'bg-[#faf6ef]' : 'bg-white'
                    }`}
                  >
                    <span className="text-sm text-stone-600">{row.label}</span>
                    <span className="text-right text-sm font-semibold text-stone-900">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Install steps */}
          {item.installSteps && item.installSteps.length > 0 && (
            <div className={cardClass}>
              <h2 className="text-2xl font-semibold text-stone-950">Installation steps</h2>
              <ol className="mt-6 space-y-5">
                {item.installSteps.map((step, index) => (
                  <li key={step.title} className="flex items-start gap-4">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold text-stone-950">{step.title}</p>
                      <p className="mt-1 text-sm leading-7 text-stone-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Install notes + finishes */}
          {(item.installNotes || item.finishes) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {item.installNotes && item.installNotes.length > 0 && (
                <div className={cardClass}>
                  <h2 className="text-xl font-semibold text-stone-950">Installation notes</h2>
                  <div className="mt-5 space-y-3">
                    {item.installNotes.map((note) => (
                      <div key={note} className="flex items-start gap-3">
                        <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
                        <p className="text-sm leading-7 text-stone-700">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.finishes && item.finishes.length > 0 && (
                <div className={cardClass}>
                  <h2 className="text-xl font-semibold text-stone-950">Recommended finishes</h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.finishes.map((finish) => (
                      <span
                        key={finish}
                        className="rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-700"
                      >
                        {finish}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Applications */}
          <div className={cardClass}>
            <h2 className="text-2xl font-semibold text-stone-950">Typical applications</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {item.applications.map((app) => (
                <div key={app} className="flex items-start gap-3">
                  <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
                  <p className="text-sm leading-7 text-stone-700">{app}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Specifications */}
          <div className={cardClass}>
            <h2 className="text-2xl font-semibold text-stone-950">Specifications</h2>
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {item.specs.map((row) => (
                <div key={row.label} className="flex flex-col border-b border-stone-100 pb-3">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-stone-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Bottom CTA */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="rounded-[2rem] bg-stone-950 px-8 py-10 text-white lg:px-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Next step
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Planning a project with {item.title}?
              </h2>
              <p className="mt-3 max-w-xl text-base text-white/70">
                Tell us the scope and we will price it and confirm lead time. You can also request
                samples to evaluate the grain, finish and build quality first.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Request a quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Contact sales
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
