'use client'

import {
  ArrowRight,
  Armchair,
  Building2,
  LayoutPanelTop,
  BriefcaseBusiness,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
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

export default function ApplicationsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Applications
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Built for Real-World Applications
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-700">
                Explore where NUMAT engineered bamboo boards fit best across
                furniture, interiors, hospitality, and commercial buyer use cases.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {applicationDetails.map((item) => {
              const Icon = iconMap[item.slug as keyof typeof iconMap] || Armchair

              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => router.push(`/applications/${item.slug}`)}
                  className="group w-full cursor-pointer rounded-[2rem] border border-stone-200 bg-white p-8 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    <Icon className="h-7 w-7" />
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold text-stone-950">
                    {item.title}
                  </h2>

                  <p className="mt-4 text-lg leading-8 text-stone-700">
                    {item.cardDescription}
                  </p>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                    Open application page
                    <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}