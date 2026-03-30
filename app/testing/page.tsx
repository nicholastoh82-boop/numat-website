import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldCheck, MessageSquare, Download, ArrowRight } from 'lucide-react'
import TestingCharts from '@/components/testing-charts'

export const metadata = {
  title: 'Testing & Certifications | NUMAT',
  description:
    'Review DOST-supported testing results and performance comparisons for NUMAT engineered bamboo boards.',
}

const statCards = [
  { value: '2.3×', label: 'Harder', sub: 'vs typical plywood' },
  { value: '69 MPa', label: 'Peak MOR', sub: 'bending strength' },
  { value: '10,256', label: 'Peak MOE (MPa)', sub: 'stiffness rating' },
  { value: 'ASTM D1037', label: 'Test Standard', sub: 'DOST verified' },
]

const tableRows = [
  {
    metric: 'MOR',
    full: 'Modulus of Rupture',
    numat: '22.77–69.44 MPa',
    plywood: '~30–60 MPa',
    reading: 'NUMAT can compete with or exceed typical plywood depending on configuration.',
  },
  {
    metric: 'MOE',
    full: 'Modulus of Elasticity',
    numat: '2,211.82–10,256.71 MPa',
    plywood: '~4,000–9,000 MPa',
    reading: 'Upper-end results outperform typical plywood stiffness references.',
  },
  {
    metric: 'Compression',
    full: 'Compression Strength',
    numat: '25.19–30.46 MPa',
    plywood: '~20–35 MPa',
    reading: 'Performance within the range expected for commercial plywood boards.',
  },
  {
    metric: 'Hardness',
    full: 'Surface Hardness',
    numat: '3,918.33–7,377.33 N',
    plywood: 'Typically lower and variable',
    reading: 'Significantly exceeds plywood — ideal for flooring and exposed surfaces.',
  },
]

export default function TestingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8]">

        {/* Hero */}
        <section className="border-b border-stone-200 bg-stone-950">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                DOST · ASTM D1037 · Third-Party Verified
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Performance That{' '}
                <span className="text-emerald-400">Speaks for Itself</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-stone-400">
                Independent mechanical testing shows NUMAT engineered bamboo matches or exceeds
                plywood and hardwood across every key structural metric. Every number below
                is third-party verified.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-quote">
                  <Button className="gap-2 bg-emerald-700 hover:bg-emerald-600">
                    <ArrowRight className="h-4 w-4" />
                    Request Quote
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10">
                    <Download className="h-4 w-4" />
                    Request Full Test Report
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-6 py-5 text-center">
                  <p className="text-3xl font-extrabold text-emerald-700">{s.value}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-800">{s.label}</p>
                  <p className="text-xs text-stone-400">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive charts */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Interactive Comparison</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">
              How Does NUMAT Stack Up?
            </h2>
            <p className="mt-3 text-base text-stone-500">
              Select a metric below to compare NUMAT bamboo against plywood and hardwood with plain-English context.
            </p>
          </div>
          <TestingCharts />
        </section>

        {/* Raw data table */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Raw Test Data</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">Full ASTM D1037 Results</h2>
              <p className="mt-3 text-base text-stone-500">
                Exact figures from DOST-supported third-party testing, presented alongside plywood reference ranges.
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-stone-200 shadow-sm">
              <div className="border-b border-stone-200 bg-stone-950 px-6 py-5 text-white">
                <h3 className="text-lg font-bold">NUMAT Bamboo vs Typical Plywood</h3>
                <p className="mt-1 text-sm text-stone-400">
                  DOST / ASTM D1037 test results versus common plywood reference ranges.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="border-b border-stone-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Metric</th>
                      <th className="border-b border-stone-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700">NUMAT Bamboo</th>
                      <th className="border-b border-stone-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Typical Plywood</th>
                      <th className="border-b border-stone-200 px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">What It Means</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={row.metric} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                        <td className="border-b border-stone-100 px-6 py-5">
                          <p className="text-sm font-bold text-stone-900">{row.metric}</p>
                          <p className="text-xs text-stone-400">{row.full}</p>
                        </td>
                        <td className="border-b border-stone-100 px-6 py-5 text-sm font-semibold text-emerald-700">{row.numat}</td>
                        <td className="border-b border-stone-100 px-6 py-5 text-sm text-stone-500">{row.plywood}</td>
                        <td className="border-b border-stone-100 px-6 py-5 text-sm leading-7 text-stone-500">{row.reading}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Testing notes */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Methodology</p>
            <h3 className="mt-2 text-2xl font-bold text-stone-950">Testing Notes</h3>
            <p className="mt-4 text-sm leading-7 text-stone-500">
              Results apply to the specific samples submitted for testing and are provided for reference.
              Values may vary depending on product configuration, moisture content, thickness, ply
              arrangement, and manufacturing lot.
            </p>
            <p className="mt-4 text-sm leading-7 text-stone-500">
              Full technical results and supporting documentation are available upon request. Please
              contact our team if you require the complete testing package for evaluation, procurement
              review, or project submission.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {['MOR: 22.77–69.44 MPa', 'MOE: 2,211.82–10,256.71 MPa', 'Compression: 25.19–30.46 MPa', 'Hardness: 3,918.33–7,377.33 N'].map((tag) => (
                <span key={tag} className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs text-stone-600">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact">
                <Button className="gap-2 bg-emerald-700 hover:bg-emerald-600">
                  <MessageSquare className="h-4 w-4" />
                  Request Full Test Report
                </Button>
              </Link>
              <Link href="/request-samples">
                <Button variant="outline" className="gap-2">
                  Request Samples
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}