'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Armchair,
  Building2,
  LayoutPanelTop,
  BriefcaseBusiness,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { applicationDetails } from '@/lib/applications-data'

const iconMap = {
  'furniture-manufacturing': Armchair,
  'interior-fit-outs': LayoutPanelTop,
  'hospitality-and-commercial-spaces': Building2,
  'project-and-procurement-use': BriefcaseBusiness,
}

const imageMap: Record<string, string> = {
  'furniture-manufacturing': '/Bamboo-Furniture.png',
  'interior-fit-outs': '/Bamboo-Wall.png',
  'hospitality-and-commercial-spaces': '/Bamboo-Door.png',
  'project-and-procurement-use': '/Bamboo-Board.png',
}

export default function ApplicationsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">
        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Applications
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Built for Real-World Applications
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                Explore where NUMAT engineered bamboo boards fit best across
                furniture, interiors, hospitality, and commercial buyer use cases.
              </p>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {applicationDetails.map((item) => {
              const Icon = iconMap[item.slug as keyof typeof iconMap] || Armchair
              const image = imageMap[item.slug]

              return (
                <Link
                  key={item.slug}
                  href={`/applications/${item.slug}`}
                  className="group block overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={image}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    <div className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-emerald-800 shadow-sm backdrop-blur">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-7">
                    <h2 className="text-xl font-semibold text-stone-950">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-base leading-7 text-stone-600">
                      {item.cardDescription}
                    </p>

                    {/* Best fit tags */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.sections[0]?.body.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      Explore application
                      <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              )
            })}
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
                Not sure which application fits your project?
              </h2>
              <p className="mt-3 max-w-xl text-base text-white/70">
                Our team can help match the right board spec to your use case. Get in touch or request a quote directly.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Contact Sales
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