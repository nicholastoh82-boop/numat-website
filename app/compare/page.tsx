import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  XCircle,
  MinusCircle,
} from 'lucide-react'

export const metadata = {
  title: 'NuBam vs Plywood vs MDF | NUMAT',
  description: 'Compare engineered bamboo boards against plywood, MDF, and solid wood for commercial interior and furniture applications.',
}

type Rating = 'excellent' | 'good' | 'average' | 'poor'

type CompareRow = {
  category: string
  attribute: string
  nubam: { value: string; rating: Rating }
  plywood: { value: string; rating: Rating }
  mdf: { value: string; rating: Rating }
  solidwood: { value: string; rating: Rating }
}

const rows: CompareRow[] = [
  {
    category: 'Strength',
    attribute: 'Bending Strength (MOR)',
    nubam: { value: '22–69 MPa', rating: 'excellent' },
    plywood: { value: '20–50 MPa', rating: 'good' },
    mdf: { value: '20–38 MPa', rating: 'average' },
    solidwood: { value: '40–80 MPa', rating: 'excellent' },
  },
  {
    category: 'Strength',
    attribute: 'Hardness',
    nubam: { value: '3918–7377 N', rating: 'excellent' },
    plywood: { value: '2000–5000 N', rating: 'good' },
    mdf: { value: '1000–2500 N', rating: 'poor' },
    solidwood: { value: '2000–8000 N', rating: 'good' },
  },
  {
    category: 'Strength',
    attribute: 'Compression Strength',
    nubam: { value: '25–30 MPa', rating: 'good' },
    plywood: { value: '20–35 MPa', rating: 'good' },
    mdf: { value: '15–25 MPa', rating: 'average' },
    solidwood: { value: '25–50 MPa', rating: 'excellent' },
  },
  {
    category: 'Sustainability',
    attribute: 'Carbon Impact',
    nubam: { value: 'Carbon negative', rating: 'excellent' },
    plywood: { value: 'Carbon positive', rating: 'poor' },
    mdf: { value: 'Carbon positive', rating: 'poor' },
    solidwood: { value: 'Neutral to positive', rating: 'average' },
  },
  {
    category: 'Sustainability',
    attribute: 'Harvest Cycle',
    nubam: { value: '3–5 years', rating: 'excellent' },
    plywood: { value: '25–80 years', rating: 'poor' },
    mdf: { value: '25–80 years', rating: 'poor' },
    solidwood: { value: '25–100 years', rating: 'poor' },
  },
  {
    category: 'Sustainability',
    attribute: 'FSC / Certified Source',
    nubam: { value: 'Sustainably Harvested', rating: 'excellent' },
    plywood: { value: 'Varies by supplier', rating: 'average' },
    mdf: { value: 'Varies by supplier', rating: 'average' },
    solidwood: { value: 'Varies by supplier', rating: 'average' },
  },
  {
    category: 'Workability',
    attribute: 'Machinability',
    nubam: { value: 'Good with carbide', rating: 'good' },
    plywood: { value: 'Excellent', rating: 'excellent' },
    mdf: { value: 'Excellent', rating: 'excellent' },
    solidwood: { value: 'Excellent', rating: 'excellent' },
  },
  {
    category: 'Workability',
    attribute: 'Edge Finishing',
    nubam: { value: 'Requires sealing', rating: 'average' },
    plywood: { value: 'Requires banding', rating: 'average' },
    mdf: { value: 'Paintable, smooth', rating: 'excellent' },
    solidwood: { value: 'Excellent', rating: 'excellent' },
  },
  {
    category: 'Workability',
    attribute: 'Surface Finish',
    nubam: { value: 'Natural bamboo grain', rating: 'excellent' },
    plywood: { value: 'Veneer dependent', rating: 'good' },
    mdf: { value: 'Smooth, paintable', rating: 'good' },
    solidwood: { value: 'Natural wood grain', rating: 'excellent' },
  },
  {
    category: 'Moisture',
    attribute: 'Moisture Resistance',
    nubam: { value: 'Moderate (interior)', rating: 'average' },
    plywood: { value: 'Good (marine grade)', rating: 'good' },
    mdf: { value: 'Poor', rating: 'poor' },
    solidwood: { value: 'Species dependent', rating: 'good' },
  },
  {
    category: 'Commercial',
    attribute: 'MOQ',
    nubam: { value: 'From 10 boards', rating: 'excellent' },
    plywood: { value: 'Varies', rating: 'good' },
    mdf: { value: 'Varies', rating: 'good' },
    solidwood: { value: 'Varies', rating: 'average' },
  },
  {
    category: 'Commercial',
    attribute: 'Price Point',
    nubam: { value: 'Mid-premium', rating: 'good' },
    plywood: { value: 'Low to mid', rating: 'excellent' },
    mdf: { value: 'Low', rating: 'excellent' },
    solidwood: { value: 'Mid to high', rating: 'average' },
  },
  {
    category: 'Commercial',
    attribute: 'Export Documentation',
    nubam: { value: 'Full support', rating: 'excellent' },
    plywood: { value: 'Standard', rating: 'good' },
    mdf: { value: 'Standard', rating: 'good' },
    solidwood: { value: 'Varies', rating: 'average' },
  },
  {
    category: 'Commercial',
    attribute: 'Testing Data Available',
    nubam: { value: 'DOST / ASTM D1037', rating: 'excellent' },
    plywood: { value: 'Standard grades only', rating: 'good' },
    mdf: { value: 'Standard grades only', rating: 'good' },
    solidwood: { value: 'Species specific', rating: 'average' },
  },
]

const ratingConfig: Record<Rating, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  excellent: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Excellent' },
  good: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Good' },
  average: { icon: MinusCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Average' },
  poor: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Poor' },
}

const categories = [...new Set(rows.map((r) => r.category))]

export default function ComparePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-[#f6f1e8]">

        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
                Material Comparison
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">
                NuBam vs Plywood vs MDF vs Solid Wood
              </h1>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                A practical side-by-side comparison to help buyers, specifiers, and
                project teams evaluate engineered bamboo against traditional panel materials.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-stone-900"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/testing"
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-900 transition hover:-translate-y-0.5 hover:bg-stone-50"
                >
                  View Test Data
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Legend */}
        <section className="border-b border-stone-200 bg-[#f6f1e8]">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">Legend:</span>
              {Object.entries(ratingConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-sm font-medium text-stone-600">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryRows = rows.filter((r) => r.category === category)
              return (
                <div key={category} className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
                  {/* Category header */}
                  <div className="border-b border-stone-100 bg-stone-950 px-6 py-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white">{category}</h2>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-5 border-b border-stone-100 bg-stone-50">
                    <div className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-stone-400">
                      Attribute
                    </div>
                    {[
                      { label: 'NuBam', sub: 'Engineered Bamboo', highlight: true },
                      { label: 'Plywood', sub: 'Hardwood / Softwood', highlight: false },
                      { label: 'MDF', sub: 'Medium Density Fibre', highlight: false },
                      { label: 'Solid Wood', sub: 'Hardwood Species', highlight: false },
                    ].map((col) => (
                      <div
                        key={col.label}
                        className={`px-4 py-3 text-center ${col.highlight ? 'bg-emerald-50' : ''}`}
                      >
                        <p className={`text-sm font-bold ${col.highlight ? 'text-emerald-800' : 'text-stone-700'}`}>
                          {col.highlight && '★ '}{col.label}
                        </p>
                        <p className="text-xs text-stone-400">{col.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {categoryRows.map((row, i) => (
                    <div
                      key={row.attribute}
                      className={`grid grid-cols-5 ${i < categoryRows.length - 1 ? 'border-b border-stone-100' : ''}`}
                    >
                      <div className="flex items-center px-5 py-4">
                        <span className="text-sm font-semibold text-stone-700">{row.attribute}</span>
                      </div>
                      {[
                        { data: row.nubam, highlight: true },
                        { data: row.plywood, highlight: false },
                        { data: row.mdf, highlight: false },
                        { data: row.solidwood, highlight: false },
                      ].map((cell, ci) => {
                        const config = ratingConfig[cell.data.rating]
                        const Icon = config.icon
                        return (
                          <div
                            key={ci}
                            className={`flex flex-col items-center justify-center px-4 py-4 text-center ${cell.highlight ? 'bg-emerald-50/50' : ''}`}
                          >
                            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${config.bg}`}>
                              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                              <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                            </div>
                            <p className="mt-1.5 text-xs text-stone-500">{cell.data.value}</p>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Disclaimer */}
          <p className="mt-8 text-xs text-stone-400">
            All data based on published literature, DOST / ASTM D1037 testing (NuBam), and industry references.
            Values are indicative ranges. Actual performance may vary by grade, species, and configuration.
            Contact NUMAT for product-specific technical data.
          </p>
        </section>

        {/* CTA */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <div className="rounded-[2rem] bg-stone-950 px-8 py-10 text-white lg:px-12">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
                Ready to specify?
              </p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Get samples and a formal quote for your project.
              </h2>
              <p className="mt-3 max-w-xl text-base text-white/70">
                Our team can support your evaluation with samples, technical data,
                and a commercial quotation within 24 hours.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-stone-950 transition hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-samples"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Order Samples
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