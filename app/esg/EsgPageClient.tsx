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
  Globe,
  ArrowRight,
  CheckCircle2,
  Calculator,
  FlaskConical,
  BookOpen,
  Info,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Carbon stored in NUMAT boards (estimate, not an annual uptake rate)
//
// stored CO2 per m3 = density x bamboo mass share x carbon fraction x (44 / 12)
//   density          = 800 kg/m3  (conservative low end of NUMAT nominal 800 to 1,000 kg/m3)
//   bamboo share     = 0.9        (assumed share of board mass that is bamboo; the rest is resin)
//   carbon fraction  = 0.5        (carbon is about 50% of oven dry wood mass, EN 16449 method;
//                                  Negro and Bergman 2019, doi:10.4067/S0718-221X2019005000106.
//                                  Pongon et al. 2016 measured 52.09 to 54.24% in the bamboo
//                                  species studied, so 0.5 is conservative)
//   44 / 12          = molar mass ratio of CO2 to C
//
//   800 x 0.9 x 0.5 x 44 / 12 = 1,320 kg CO2 per m3, about 1.32 t CO2 per m3
//
// Sheet volume: 2.44 m x 1.22 m x 0.012 m = 0.0357 m3 per 12 mm sheet
// ---------------------------------------------------------------------------
const BOARD_DENSITY_KG_M3 = 800
const BAMBOO_MASS_SHARE = 0.9
const CARBON_FRACTION = 0.5
const CO2_PER_C = 44 / 12
const CO2_STORED_T_PER_M3 =
  (BOARD_DENSITY_KG_M3 * BAMBOO_MASS_SHARE * CARBON_FRACTION * CO2_PER_C) / 1000
const SHEET_VOLUME_M3 = 2.44 * 1.22 * 0.012

// Species data (per hectare)
// D. asper: Pongon, Aranico, Dagoc and Amparado (2016), 15 year old plantation, Claveria, Misamis Oriental
const ASPER_CARBON_STOCK = 234.46 // t C/ha total (above ground, below ground and soil)
// Moso: Xu, Ji and Zhuang (2018), PLoS ONE, stands in China, 87.83 to 119.5 t C/ha
const MOSO_CARBON_STOCK_UPPER = 119.5 // t C/ha, upper end of reported range

type Advantage = 'asper' | 'moso' | 'none'

const speciesRows: { metric: string; asper: string; moso: string; winner: Advantage }[] = [
  {
    metric: 'Total carbon stock (soil plus biomass)',
    asper: '234 t C/ha (15 year old plantation, Northern Mindanao) [B]',
    moso: '88 to 120 t C/ha (stands in China) [C]',
    winner: 'asper',
  },
  {
    metric: 'Above ground biomass',
    asper: '264 t/ha [B]',
    moso: 'Not reported in source',
    winner: 'none',
  },
  {
    metric: 'Carbon content of biomass',
    asper: '52 to 54% (bamboo species in the Mindanao study) [B]',
    moso: 'Not reported in source',
    winner: 'none',
  },
  {
    metric: 'Root system',
    asper: 'Sympodial (clumping)',
    moso: 'Monopodial (running)',
    winner: 'asper',
  },
  {
    metric: 'Climate suitability',
    asper: 'Tropical, year round',
    moso: 'Subtropical, seasonal',
    winner: 'asper',
  },
  {
    metric: 'Invasive risk',
    asper: 'None',
    moso: 'High',
    winner: 'asper',
  },
]

const sources = [
  {
    key: 'A',
    text: 'Yuen, Fung and Ziegler (2017). Carbon stocks in bamboo ecosystems worldwide: Estimates and uncertainties. Forest Ecology and Management 393: 113 to 138.',
    href: 'https://doi.org/10.1016/j.foreco.2017.01.017',
    linkLabel: 'doi.org/10.1016/j.foreco.2017.01.017',
  },
  {
    key: 'B',
    text: 'Pongon, Aranico, Dagoc and Amparado (2016). Carbon stock assessment of bamboo plantations in Northern Mindanao, Philippines. Journal of Biodiversity and Environmental Sciences 9(6): 97 to 112.',
    href: 'https://innspub.net/wp-content/uploads/2022/10/JBES-V9-No6-p97-112.pdf',
    linkLabel: 'innspub.net (PDF)',
  },
  {
    key: 'C',
    text: 'Xu, Ji and Zhuang (2018). Moso bamboo (Phyllostachys edulis) carbon stocks, China. PLoS ONE 13(2): e0193024.',
    href: 'https://doi.org/10.1371/journal.pone.0193024',
    linkLabel: 'doi.org/10.1371/journal.pone.0193024',
  },
  {
    key: 'D',
    text: 'Negro and Bergman (2019). Wood product carbon content, EN 16449 method. Maderas. Ciencia y Tecnología 21(1): 65 to 76.',
    href: 'https://doi.org/10.4067/S0718-221X2019005000106',
    linkLabel: 'doi.org/10.4067/S0718-221X2019005000106',
  },
]

export default function ESGPage() {
  const [boardCount, setBoardCount] = useState(50)
  const [unit, setUnit] = useState<'boards' | 'm3'>('boards')

  const volumeM3 = unit === 'boards' ? boardCount * SHEET_VOLUME_M3 : boardCount
  const co2Stored = volumeM3 * CO2_STORED_T_PER_M3
  const co2PerSheet = SHEET_VOLUME_M3 * CO2_STORED_T_PER_M3

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
                Backed by Wavemaker Impact
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Sustainable Bamboo for a{' '}
                <span className="text-emerald-700">Lower Carbon</span> Future
              </h1>
              <p className="mt-6 text-lg leading-8 text-stone-600">
                Bamboo grows to harvest in 3 to 5 years, compared with 20 to 40 years for
                traditional timber. On this page we share what published, peer reviewed research
                says about bamboo and carbon, and how we estimate the carbon stored in our boards.
                Every figure is cited, and our assumptions are shown.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Calculator */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 text-stone-900 shadow-sm lg:p-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20">
                <Calculator className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Interactive Tool</p>
                <h2 className="text-2xl font-bold text-stone-950">Carbon Stored in Your Boards</h2>
              </div>
            </div>

            {/* Unit toggle */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => { setUnit('boards'); setBoardCount(50) }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${unit === 'boards' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                Number of 12 mm Sheets
              </button>
              <button
                onClick={() => { setUnit('m3'); setBoardCount(1) }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${unit === 'm3' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                Cubic Meters (m³)
              </button>
            </div>

            {/* Slider */}
            <div className="mb-8">
              <div className="mb-3 flex items-end justify-between">
                <label className="text-sm font-medium text-stone-700">
                  {unit === 'boards' ? 'Number of 2440 × 1220 × 12 mm sheets' : 'Volume in m³'}
                </label>
                <span className="text-3xl font-extrabold text-emerald-700">
                  {unit === 'boards' ? `${boardCount} sheets` : `${boardCount} m³`}
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
              <div className="mt-1 flex justify-between text-xs text-stone-400">
                <span>{unit === 'boards' ? '10 sheets' : '1 m³'}</span>
                <span>{unit === 'boards' ? '500 sheets' : '50 m³'}</span>
              </div>
            </div>

            {/* Result cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">CO₂ stored in your boards</p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-700">{co2Stored.toFixed(2)} t CO₂</p>
                <p className="mt-1 text-xs text-stone-500">Estimated carbon held in the product, expressed as CO₂</p>
              </div>
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Board volume</p>
                <p className="mt-2 text-3xl font-extrabold text-stone-950">{volumeM3.toFixed(2)} m³</p>
                <p className="mt-1 text-xs text-stone-500">
                  {unit === 'boards'
                    ? `${SHEET_VOLUME_M3.toFixed(4)} m³ per 12 mm sheet`
                    : 'Volume entered'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Stored per unit</p>
                <p className="mt-2 text-3xl font-extrabold text-stone-950">{CO2_STORED_T_PER_M3.toFixed(2)} t CO₂/m³</p>
                <p className="mt-1 text-xs text-stone-500">
                  About {co2PerSheet.toFixed(3)} t CO₂ per 12 mm sheet
                </p>
              </div>
            </div>

            <p className="mt-6 text-xs leading-5 text-stone-500">
              How this is estimated: 800 kg/m³ board density (the low end of our 800 to 1,000 kg/m³
              range) × 90% bamboo by mass (our assumption; the rest is resin) × 50% carbon in dry wood
              (Negro and Bergman 2019 [D]) × 44/12 to convert carbon to CO₂, which gives about 1.32 t CO₂
              per m³. This is carbon stored in the product while it is in use, not a yearly uptake
              rate, and it does not subtract emissions from harvesting, processing or transport. It is
              an estimate: a full life cycle assessment is planned.
            </p>
          </div>
        </section>

        {/* What the research says */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Carbon Science</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-950">
                What the Research Says
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
                Figures below come directly from peer reviewed studies. Letters in brackets refer to
                the source list at the bottom of this page.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-8 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <Globe className="h-5 w-5 text-emerald-800" />
                  <h3 className="text-lg font-bold text-stone-950">Bamboo worldwide [A]</h3>
                </div>
                <ul className="space-y-3 text-sm leading-6 text-stone-600">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    Most bamboo stands accumulate 4 to 11 t C per hectare per year during their first
                    5 to 7 years, about 15 to 40 t CO₂ per hectare per year.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    Once stands are mature and selectively harvested, accumulation slows to 2 to 4 t C
                    per hectare per year.
                  </li>
                </ul>
                <p className="mt-4 text-xs text-stone-400">
                  Yuen, Fung and Ziegler (2017). These are global figures for bamboo in general, not
                  specific to Dendrocalamus asper.
                </p>
              </div>

              <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <TreePine className="h-5 w-5 text-emerald-800" />
                  <h3 className="text-lg font-bold text-stone-950">Giant bamboo in Northern Mindanao [B]</h3>
                </div>
                <ul className="space-y-3 text-sm leading-6 text-stone-600">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    A 15 year old Dendrocalamus asper plantation in Claveria, Misamis Oriental held a
                    total carbon stock of 234.46 t C per hectare: 143.39 above ground, 33.55 below
                    ground and 57.52 in the soil.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    Above ground biomass was 264.37 t per hectare, the highest of the three bamboo
                    species studied.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    Carbon content of the bamboo species studied ranged from 52.09 to 54.24%.
                  </li>
                </ul>
                <p className="mt-4 text-xs text-stone-500">
                  Pongon, Aranico, Dagoc and Amparado (2016).
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <p className="text-sm leading-6 text-stone-600">
                There is not yet a published annual carbon uptake rate specific to Dendrocalamus
                asper. The yearly figures above apply to bamboo in general; the Mindanao study
                measures the total carbon held in a plantation at one point in time.
              </p>
            </div>
          </div>
        </section>

        {/* D. asper vs Moso Species Comparison */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              <FlaskConical className="h-4 w-4" />
              Species Science
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-stone-950">
              Giant Bamboo and Moso Bamboo Compared
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-stone-500">
              Moso (<em>Phyllostachys edulis</em>) is the most widely studied bamboo. A 15 year old
              giant bamboo (<em>Dendrocalamus asper</em>) plantation in Northern Mindanao held
              234 t C per hectare, compared with 88 to 120 t C per hectare measured in Moso stands in
              China. The studies differ in site, stand age and method, so treat this as an indication
              rather than a like for like result.
            </p>
          </div>

          {/* Bar comparison */}
          <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">

            {/* Legend */}
            <div className="mb-8 flex flex-wrap gap-6 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-600" />
                <span className="font-semibold text-stone-900">D. asper: giant bamboo (NuMat Bamboo)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-sky-500" />
                <span className="text-stone-600">Moso bamboo (P. edulis)</span>
              </span>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-800">Total carbon stock (t C/ha)</p>
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                  Asper higher in these studies
                </span>
              </div>

              {/* Asper bar */}
              <div className="mb-2 flex items-center gap-3">
                <span className="w-20 shrink-0 text-right text-xs font-semibold text-emerald-700">D. asper</span>
                <div className="flex-1 overflow-hidden rounded-full bg-stone-100" style={{ height: 28 }}>
                  <div
                    className="flex h-full items-center rounded-full bg-emerald-600 px-3 text-xs font-semibold text-emerald-50 transition-all duration-700"
                    style={{ width: `${(ASPER_CARBON_STOCK / 240) * 100}%` }}
                  >
                    234 t C [B]
                  </div>
                </div>
              </div>

              {/* Moso bar */}
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-right text-xs text-stone-500">Moso</span>
                <div className="flex-1 overflow-hidden rounded-full bg-stone-100" style={{ height: 28 }}>
                  <div
                    className="flex h-full items-center rounded-full bg-sky-500 px-3 text-xs font-semibold text-sky-50 transition-all duration-700"
                    style={{ width: `${(MOSO_CARBON_STOCK_UPPER / 240) * 100}%` }}
                  >
                    88 to 120 t C [C]
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-400">
                Moso bar shows the upper end of the reported range.
              </p>
            </div>
          </div>

          {/* Full comparison table */}
          <div className="mt-6 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-8 py-5">
              <h3 className="text-base font-bold text-stone-950">Full species comparison</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Sources: Pongon et al. (2016) [B], Northern Mindanao, Philippines; Xu, Ji and Zhuang (2018) [C], PLoS ONE
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Metric</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700">D. asper (NuMat Bamboo)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-sky-700">Moso bamboo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Advantage</th>
                  </tr>
                </thead>
                <tbody>
                  {speciesRows.map((row, i) => (
                    <tr key={row.metric} className={`border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                      <td className="px-6 py-3.5 font-medium text-stone-700">{row.metric}</td>
                      <td className="px-6 py-3.5 font-semibold text-emerald-700">{row.asper}</td>
                      <td className={`px-6 py-3.5 ${row.moso === 'Not reported in source' ? 'text-stone-400' : 'font-semibold text-sky-700'}`}>{row.moso}</td>
                      <td className="px-6 py-3.5">
                        {row.winner === 'asper' && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Asper</span>
                        )}
                        {row.winner === 'moso' && (
                          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">Moso</span>
                        )}
                        {row.winner === 'none' && (
                          <span className="text-xs text-stone-400">Not compared</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-stone-100 px-8 py-4">
              <p className="text-xs text-stone-400">
                D. asper figures come from a Philippine plantation study, in the same region and climate
                as NuMat Bamboo&apos;s supply chain. Moso figures come from stands in China. Root system,
                climate and invasiveness rows are general characteristics of each species.
              </p>
            </div>
          </div>
        </section>

        {/* Wavemaker */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm lg:p-12">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <Award className="h-7 w-7 text-emerald-800" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-stone-950">
                  Backed by Wavemaker Impact
                </h2>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  NuMat Bamboo is a portfolio company of Wavemaker Impact, a climate tech venture
                  investor. The carbon figures on this page are our own estimates, based on the
                  published research cited below.{' '}
                  <a href="https://www.wavemakerimpact.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline">
                    Learn more about Wavemaker →
                  </a>
                </p>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-3">
                {[
                  { icon: BookOpen, title: 'Transparent Estimates', body: 'Every carbon figure on this page links to a published, peer reviewed study, and our own assumptions are stated openly.' },
                  { icon: Leaf, title: 'Sustainable Sourcing', body: 'We aim to source bamboo from plantations that prioritise biodiversity and community welfare.' },
                  { icon: TrendingDown, title: 'Continuous Improvement', body: 'We are working to reduce our operational footprint through renewable energy and better logistics.' },
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
          </div>
        </section>

        {/* ESG Commitments */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <h2 className="text-center text-3xl font-bold tracking-tight text-stone-950">
              Our ESG Commitments
            </h2>
            <p className="mx-auto mb-10 mt-3 max-w-2xl text-center text-base text-stone-500">
              What we are working toward.
            </p>
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              {[
                {
                  icon: Leaf,
                  title: 'Environmental',
                  items: [
                    'Complete a full life cycle assessment of our boards',
                    'Source bamboo without deforestation',
                    'Harvest bamboo sustainably, letting clumps regrow',
                    'Keep water use in processing low',
                    'Transition toward renewable energy',
                    'Reduce and recycle production waste',
                  ],
                },
                {
                  icon: Globe,
                  title: 'Social & Governance',
                  items: [
                    'Fair wages for plantation workers',
                    'Safe working conditions',
                    'Community development programs',
                    'A transparent supply chain',
                    'Open, cited reporting of our environmental figures',
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

        {/* Methodology and Sources */}
        <section className="bg-[#f6f1e8] py-10">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <p className="text-center text-sm text-stone-500">
              A full life cycle assessment of our boards is planned but has not yet been done. The
              carbon figures on this page are estimates drawn from the published, peer reviewed
              research listed below, together with our stated assumptions about board density and
              resin content. They are not a certification. For questions about our methodology,
              please{' '}
              <Link href="/contact" className="font-semibold text-emerald-700 hover:underline">
                contact us
              </Link>.
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-stone-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-800" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-700">Sources</h3>
              </div>
              <ol className="space-y-3">
                {sources.map((s) => (
                  <li key={s.key} className="flex gap-3 text-xs leading-5 text-stone-600">
                    <span className="shrink-0 font-bold text-emerald-800">[{s.key}]</span>
                    <span>
                      {s.text}{' '}
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 hover:underline break-all">
                        {s.linkLabel}
                      </a>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 px-8 py-12 text-center text-white shadow-xl lg:px-12 lg:py-16">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-emerald-900/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Choose Sustainable. Choose NuMat Bamboo.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
                Our boards are made from fast growing bamboo and hold the carbon it captured while
                they are in use. Use the calculator above to estimate how much.
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
