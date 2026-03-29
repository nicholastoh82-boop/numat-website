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

const accentMap: Record<string, {
  gradient: string
  iconBg: string
  iconText: string
  tag: string
  tagText: string
  titleText: string
}> = {
  'technical-data-sheets': {
    gradient: 'from-blue-900 to-blue-700',
    iconBg: 'bg-blue-800',
    iconText: 'text-white',
    tag: 'bg-blue-800',
    tagText: 'text-blue-100',
    titleText: 'text-white',
  },
  'dimensions-and-thicknesses': {
    gradient: 'from-amber-800 to-amber-600',
    iconBg: 'bg-amber-700',
    iconText: 'text-white',
    tag: 'bg-amber-700',
    tagText: 'text-amber-100',
    titleText: 'text-white',
  },
  certifications: {
    gradient: 'from-emerald-900 to-emerald-700',
    iconBg: 'bg-emerald-800',
    iconText: 'text-white',
    tag: 'bg-emerald-800',
    tagText: 'text-emerald-100',
    titleText: 'text-white',
  },
  'installation-and-care-guidance': {
    gradient: 'from-stone-800 to-stone-600',
    iconBg: 'bg-stone-700',
    iconText: 'text-white',
    tag: 'bg-stone-700',
    tagText: 'text-stone-100',
    titleText: 'text-white',
  },
}

const labels = ['Specs', 'Sizing', 'Docs', 'Guidance']

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
                  {/* Gradient header */}
                  <div className={`relative overflow-hidden bg-gradient-to-br ${accent.gradient} px-7 pt-7 pb-8`}>
                    {/* decorative blobs */}
                    <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-black/10" />

                    <div className="relative flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent.iconBg} shadow-md`}>
                        <Icon className={`h-6 w-6 ${accent.iconText}`} />
                      </div>
                      <span className={`mt-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${accent.tag} ${accent.tagText}`}>
                        {labels[i]}
                      </span>
                    </div>

                    <h2 className={`relative mt-5 text-2xl font-extrabold tracking-tight ${accent.titleText}`}>
                      {item.title}
                    </h2>
                    <p className="relative mt-2 text-sm leading-6 text-white/70">
                      {item.cardDescription}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="px-7 py-6">
                    {firstSection && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                          {firstSection.title}
                        </p>
                        <ul className="space-y-1.5">
                          {firstSection.body.slice(0, 3).map((point) => (
                            <li key={point} className="flex items-start gap-2 text-sm text-stone-600">
                              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-stone-900">
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
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Full data sheets and documentation available on request.
              </h2>
              <p className="mt-3 max-w-xl text-base text-white/70">
                Contact our sales team for treatment records, MSDS, full testing reports, and export documentation.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Contact Sales
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
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