import Link from 'next/link'
import {
  FileText,
  Ruler,
  ShieldCheck,
  Wrench,
  ArrowRight,
  ChevronRight,
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

const accentMap: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  'technical-data-sheets':       { bg: 'bg-blue-50',    text: 'text-blue-800',    border: 'border-blue-100',    tag: 'bg-blue-100 text-blue-700' },
  'dimensions-and-thicknesses':  { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-100',   tag: 'bg-amber-100 text-amber-700' },
  'certifications':              { bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-100', tag: 'bg-emerald-100 text-emerald-700' },
  'installation-and-care-guidance': { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200',   tag: 'bg-stone-200 text-stone-600' },
}

export default function TechnicalResourcesPage() {
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
                Technical Resources
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                Technical Information for Buyers
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                Explore product specifications, sizing references, certifications,
                and handling guidance to support commercial evaluation.
              </p>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {technicalResourceDetails.map((item, i) => {
              const Icon = iconMap[item.slug as keyof typeof iconMap] || FileText
              const accent = accentMap[item.slug] || accentMap['technical-data-sheets']
              const firstSection = item.sections[0]

              return (
                <Link
                  key={item.slug}
                  href={`/technical-resources/${item.slug}`}
                  className="group block overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  {/* Top bar */}
                  <div className={`flex items-center justify-between px-7 py-5 ${accent.bg} ${accent.border} border-b`}>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ${accent.text}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accent.tag}`}>
                      {i === 0 ? 'Specs' : i === 1 ? 'Sizing' : i === 2 ? 'Docs' : 'Guidance'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="px-7 py-6">
                    <h2 className="text-xl font-semibold text-stone-950">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      {item.cardDescription}
                    </p>

                    {/* Preview bullets from first section */}
                    {firstSection && (
                      <div className="mt-5 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                          {firstSection.title}
                        </p>
                        <ul className="space-y-1">
                          {firstSection.body.slice(0, 3).map((point) => (
                            <li key={point} className="flex items-start gap-2 text-sm text-stone-600">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${accent.text}`}>
                      View details
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
                Need more detail?
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Full data sheets and documentation available on request.
              </h2>
              <p className="mt-3 max-w-xl text-base text-white/70">
                Contact our sales team for treatment records, MSDS, full testing reports, and export documentation.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Contact Sales
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Request Quote
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