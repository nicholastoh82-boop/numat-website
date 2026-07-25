import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { solutions } from '@/lib/solutions-data'

const SITE = 'https://numatbamboo.com'

export const metadata: Metadata = {
  title: 'Solutions | Engineered Bamboo Systems | NuMat Bamboo',
  description:
    'Finished engineered bamboo systems built from NuBam CLB: interior wall panels, column and beam cladding, and furniture.',
  alternates: { canonical: `${SITE}/solutions` },
}

export default function SolutionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">
        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Solutions
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Finished systems, built from our boards
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                Beyond raw panels, we build ready to install engineered bamboo systems from NuBam
                CLB. Wall panels, column and beam cladding, and furniture, all designed for a clean
                finish and a fast install.
              </p>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {solutions.map((item) => (
              <Link
                key={item.slug}
                href={`/solutions/${item.slug}`}
                className="group flex flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={item.heroImage}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.06]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                    {item.category}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-stone-950">{item.title}</h2>
                  <p className="mt-3 flex-1 text-base leading-7 text-stone-600">
                    {item.cardDescription}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    View solution
                    <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="rounded-[2rem] bg-stone-950 px-8 py-10 text-white lg:px-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Next step
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Have a project in mind?
              </h2>
              <p className="mt-3 max-w-xl text-base text-white/70">
                Send us the scope and we will price the panels, cladding or furniture you need and
                confirm lead time.
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
