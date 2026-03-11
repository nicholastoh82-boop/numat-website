import Link from 'next/link'
import {
  FileText,
  Ruler,
  ShieldCheck,
  Wrench,
  ArrowRight,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import { technicalResourceDetails } from '@/lib/technical-resources-content'

const iconMap = {
  'technical-data-sheets': FileText,
  'dimensions-and-thicknesses': Ruler,
  certifications: ShieldCheck,
  'installation-and-care-guidance': Wrench,
}

export default function TechnicalResourcesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
                Technical resources
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Technical Information for Buyers
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-700">
                Explore product specifications, sizing references, certifications,
                and handling guidance to support commercial evaluation.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {technicalResourceDetails.map((item) => {
              const Icon = iconMap[item.slug as keyof typeof iconMap] || FileText

              return (
                <Link
                  key={item.slug}
                  href={`/technical-resources/${item.slug}`}
                  className="group rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
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
                    View details
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}