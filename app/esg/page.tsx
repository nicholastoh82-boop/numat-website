'use client'

import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import Link from 'next/link'
import { useState } from 'react'
import {
  Leaf,
  Award,
  TrendingDown,
  TreePine,
  Recycle,
  Globe,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Calculator,
} from 'lucide-react'

const CO2_PER_M3 = 2.5
const PLYWOOD_CO2_PER_M3 = 1.2
const TREES_PER_TONNE_CO2 = 0.0417
const BOARD_VOLUME_M3 = 0.0036 // ~2440x1220x12mm board

const lifecycleData = [
  { label: 'Bamboo Growth', value: -3.0, color: 'bg-emerald-500', positive: false },
  { label: 'Harvesting', value: 0.1, color: 'bg-stone-400', positive: true },
  { label: 'Processing', value: 0.25, color: 'bg-stone-400', positive: true },
  { label: 'Transportation', value: 0.15, color: 'bg-stone-400', positive: true },
]

export default function ESGPage() {
  const [boardCount, setBoardCount] = useState(50)
  const [unit, setUnit] = useState<'boards' | 'm3'>('boards')

  const volumeM3 = unit === 'boards' ? boardCount * BOARD_VOLUME_M3 : boardCount
  const co2Saved = volumeM3 * CO2_PER_M3
  const vsPlywood = volumeM3 * (CO2_PER_M3 + PLYWOOD_CO2_PER_M3)
  const treesEquivalent = Math.round(co2Saved / TREES_PER_TONNE_CO2)
  const carsEquivalent = (co2Saved / 4.6).toFixed(1)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-[#f6f1e8]">

        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                <Award className="h-4 w-4" />
                Wavemaker Impact Partner
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Sustainable Bamboo for a{' '}
                <span className="text-emerald-700">Carbon-Negative</span> Future
              </h1>
              <p className="mt-6 text-lg leading-8 text-stone-600">
                At NUMAT, sustainability is measurable and verified. Our engineered bamboo
                products are FSC-certified and verified carbon-negative by Wavemaker Impact.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Calculator */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="rounded-[2rem] bg-stone-950 p-6 text-white lg:p-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20">
                <Calculator className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Interactive Tool</p>
                <h2 className="text-2xl font-bold text-white">Your Purchase Impact Calculator</h2>
              </div>
            </div>

            {/* Unit toggle */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => { setUnit('boards'); setBoardCount(50) }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${unit === 'boards' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
              >
                Number of Boards
              </button>
              <button
                onClick={() => { setUnit('m3'); setBoardCount(1) }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${unit === 'm3' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
              >
                Cubic Meters (m³)
              </button>
            </div>

            {/* Slider */}
            <div className="mb-8">
              <div className="mb-3 flex items-end justify-between">
                <label className="text-sm font-medium text-white/80">
                  {unit === 'boards' ? 'Number of boards' : 'Volume in m³'}
                </label>
                <span className="text-3xl font-extrabold text-emerald-400">
                  {unit === 'boards' ? `${boardCount} boards` : `${boardCount} m³`}
                </span>
              </div>
              <input
                type="range"
                min={unit === 'boards' ? 10 : 1}
                max={unit === 'boards' ? 500 : 50}
                step={unit === 'boards' ? 10 : 1}
                value={boardCount}
                onChange={(e) => setBoardCount(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="mt-1 flex justify-between text-xs text-white/40">
                <span>{unit === 'boards' ? '10 boards' : '1 m³'}</span>
                <span>{unit === 'boards' ? '500 boards' : '50 m³'}</span>
              </div>
            </div>

            {/* Impact cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">CO₂ Sequestered</p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-300">{co2Saved.toFixed(1)}t</p>
                <p className="mt-1 text-xs text-white/50">tonnes of CO₂ locked in</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">vs Plywood</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{vsPlywood.toFixed(1)}t</p>
                <p className="mt-1 text-xs text-white/50">CO₂ better than plywood equivalent</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Trees Equivalent</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{treesEquivalent}</p>
                <p className="mt-1 text-xs text-white/50">mature trees absorbing for 1 year</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Cars Off Road</p>
                <p className="mt-2 text-3xl font-extrabold text-white">{carsEquivalent}</p>
                <p className="mt-1 text-xs text-white/50">equivalent cars removed for 1 year</p>
              </div>
            </div>

            {/* Visual bar */}
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">Carbon offset progress</p>
              <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min((co2Saved / 50) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/30">
                <span>0t CO₂</span>
                <span>50t CO₂</span>
              </div>
            </div>
          </div>
        </section>

        {/* Carbon Lifecycle Chart */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Carbon Science</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
                  Our Carbon Impact
                </h2>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  Bamboo absorbs CO₂ at rates far exceeding most trees. Our engineered boards
                  lock in this carbon for the product's lifetime — making every board a
                  net-positive contribution.
                </p>

                <div className="mt-8 space-y-3">
                  {[
                    { icon: TrendingDown, label: '-2.5 tonnes CO₂ per cubic meter', sub: 'Net carbon sequestration' },
                    { icon: TreePine, label: '3–5 year harvest cycle', sub: 'Sustainable regrowth without replanting' },
                    { icon: Recycle, label: '100% natural materials', sub: 'Biodegradable at end of life' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
                      <item.icon className="h-6 w-6 shrink-0 text-emerald-700" />
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{item.label}</p>
                        <p className="text-xs text-stone-500">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Animated bar chart */}
              <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-emerald-800" />
                  <h3 className="text-lg font-bold text-stone-950">Carbon Lifecycle Analysis</h3>
                </div>

                <div className="space-y-5">
                  {lifecycleData.map((item) => {
                    const maxVal = 3.0
                    const pct = Math.abs(item.value) / maxVal * 100
                    return (
                      <div key={item.label}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-sm text-stone-700">{item.label}</span>
                          <span className={`text-sm font-bold ${item.positive ? 'text-stone-500' : 'text-emerald-700'}`}>
                            {item.positive ? '+' : ''}{item.value} t CO₂
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${item.positive ? 'bg-stone-400' : 'bg-emerald-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  <div className="mt-4 border-t border-stone-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-950">Net Carbon Impact</span>
                      <span className="text-2xl font-extrabold text-emerald-700">-2.5 t CO₂</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-400">Per cubic meter of bamboo product</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wavemaker */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm lg:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <Award className="h-7 w-7 text-emerald-800" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-stone-950">
                Wavemaker Impact Partnership
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-600">
                NUMAT is a portfolio company of Wavemaker Impact, Southeast Asia's leading
                climate-tech investor. All carbon claims are independently verified.{' '}
                <a href="https://www.wavemakerimpact.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">
                  Learn more →
                </a>
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: Globe, title: 'Verified Impact', body: 'All carbon claims independently verified through Wavemaker\'s rigorous impact measurement framework.' },
                { icon: Leaf, title: 'FSC-Certified Sourcing', body: 'Bamboo sourced exclusively from FSC-certified plantations prioritizing biodiversity and community welfare.' },
                { icon: TrendingDown, title: 'Continuous Improvement', body: 'Committed to reducing operational footprint through renewable energy and optimised logistics.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-stone-200 bg-stone-50 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                    <item.icon className="h-5 w-5 text-emerald-800" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-stone-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ESG Commitments */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-stone-950">
              Our ESG Commitments
            </h2>
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              {[
                {
                  icon: Leaf,
                  title: 'Environmental',
                  items: [
                    'Carbon-negative product lifecycle',
                    'Zero deforestation supply chain',
                    '100% FSC-certified materials',
                    'Minimal water usage in processing',
                    'Renewable energy transition roadmap',
                    'Waste reduction and recycling programs',
                  ],
                },
                {
                  icon: Globe,
                  title: 'Social & Governance',
                  items: [
                    'Fair wages for plantation workers',
                    'Safe working conditions',
                    'Community development programs',
                    'Transparent supply chain',
                    'Regular third-party audits',
                  ],
                },
              ].map((col) => (
                <div key={col.title} className="rounded-[2rem] border border-stone-200 bg-stone-50 p-7">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                      <col.icon className="h-5 w-5 text-emerald-800" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-950">{col.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-stone-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="bg-[#f6f1e8] py-10">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
            <p className="text-sm text-stone-500">
              Carbon calculations based on LCA methodology following ISO 14040/14044 standards,
              reviewed and validated by Wavemaker Impact. For detailed methodology and
              verification documents, please{' '}
              <Link href="/contact" className="font-semibold text-emerald-700 hover:underline">
                contact us
              </Link>.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="relative overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-12 text-center text-white shadow-xl lg:px-12 lg:py-16">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-emerald-900/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Choose Sustainable. Choose NUMAT.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
                Every board you order contributes to carbon reduction and supports
                Local Sustainable Forestry. Use the calculator above to see your impact.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-stone-950 transition hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Browse Products
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
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