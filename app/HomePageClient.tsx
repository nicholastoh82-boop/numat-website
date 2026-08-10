'use client'

import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowRight,
  Building2,
  FileText,
  FlaskConical,
  Leaf,
  Quote,
  Recycle,
  ShieldCheck,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import NewsletterBand from '@/components/newsletter-band'
import PlaceholderImage from '@/components/placeholder-image'
import FactoryVideo from '@/components/factory-video'
import CostPerPourCalculator from '@/components/cost-per-pour-calculator'
import PartnersSection from '@/components/home/partners-section'
import { useCurrency } from '@/components/providers/currency-provider'

type Testimonial = {
  id: string
  name: string
  location: string
  testimonial: string
  sort_order?: number
}

type BlogItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image_url: string | null
  published_at: string | null
  featured: boolean
}

type Variant = {
  id: string
  sku: string
  size_label: string
  thickness_mm: number | null
  ply_count: number | null
  core_type: string | null
  unit: string
  moq: number
  currency: string
  base_price_php: number | null
  is_price_on_request: boolean
}

type Product = {
  id: string
  name: string
  slug: string
  description: string
  image_url: string | null
  is_featured: boolean
  starting_price_php: number | null
  variants: Variant[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const trustPoints = [
  'DOST tested',
  'Philippine sourced and made',
  'Sustainably harvested',
  'No minimum order',
  'Fast quote turnaround',
]

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Built for repeated pours',
    body: 'Woven mats pressed under high heat and pressure spread load across the whole sheet, so the board holds its line where conventional substrates start to bulge.',
  },
  {
    icon: Recycle,
    title: 'Lower cost across its life',
    body: 'The lowest purchase price is not the lowest project cost. A board that survives more reuse cycles brings the cost per pour down.',
  },
  {
    icon: Leaf,
    title: 'Philippine bamboo, Philippine made',
    body: 'Bamboo matures in three to five years against decades for hardwood. Sourced and manufactured locally in Bukidnon.',
  },
]

/* ---------------------------------------------------------------------------
 * DOST test data
 *
 * Every figure below is transcribed from a DOST Region X Regional Standards
 * and Testing Laboratories Report of Analysis certificate held by NUMAT.
 * Nothing is averaged, rounded, interpolated or restated.
 *
 * The certificates name each sample by its own coding, not by product name.
 * Nick confirmed two of those codings: the Amakan Board sample is NuWeave and
 * the Hybrid Amakan Board sample is NuHybrid. Those two carry the product
 * name as the heading with the certificate coding shown beside it, so a buyer
 * or auditor can still tie the figure back to the paper.
 *
 * The October 2025 engineered bamboo samples are not mapped to a product and
 * stay under their certificate description until that call is made.
 * ------------------------------------------------------------------------ */
type DostReport = {
  heading: string
  /** Sample name printed on the certificate, when it differs from the product. */
  certifiedAs?: string
  method: string
  analysed: string
  rows: { sample: string; parameter: string; result: string; cert: string }[]
}

const dostReports: DostReport[] = [
  {
    heading: 'NuWeave',
    certifiedAs: 'Amakan Board',
    method: 'ASTM D1037, Static Bending',
    analysed: '16 June 2026',
    rows: [
      { sample: 'MTL-0431', parameter: 'Modulus of Rupture', result: '29.57 MPa', cert: '2026-0088M' },
      { sample: 'MTL-0431', parameter: 'Apparent Modulus of Elasticity', result: '5,107.32 MPa', cert: '2026-0088M' },
    ],
  },
  {
    heading: 'NuHybrid',
    certifiedAs: 'Hybrid Amakan Board',
    method: 'ASTM D1037, Static Bending',
    analysed: '16 June 2026',
    rows: [
      { sample: 'MTL-0430', parameter: 'Modulus of Rupture, amakan facing up', result: '89.01 MPa', cert: '2026-0087M' },
      { sample: 'MTL-0430', parameter: 'Modulus of Rupture, bamboo facing up', result: '85.52 MPa', cert: '2026-0087M' },
      { sample: 'MTL-0430', parameter: 'Apparent Modulus of Elasticity, amakan facing up', result: '9,619.44 MPa', cert: '2026-0087M' },
      { sample: 'MTL-0430', parameter: 'Apparent Modulus of Elasticity, bamboo facing up', result: '9,440.78 MPa', cert: '2026-0087M' },
    ],
  },
  {
    heading: 'Engineered bamboo, static bending',
    method: 'ASTM D1037, Static Bending',
    analysed: '6 November 2025',
    rows: [
      { sample: '12 mm x 338 mm x 75 mm', parameter: 'Modulus of Rupture, parallel section facing up', result: '32.89 MPa', cert: '2025-0053M' },
      { sample: '12 mm x 338 mm x 75 mm', parameter: 'Modulus of Rupture, crosswise section facing up', result: '46.35 MPa', cert: '2025-0053M' },
      { sample: '12 mm x 338 mm x 75 mm', parameter: 'Apparent Modulus of Elasticity, parallel section facing up', result: '2,466.03 MPa', cert: '2025-0053M' },
      { sample: '12 mm x 338 mm x 75 mm', parameter: 'Apparent Modulus of Elasticity, crosswise section facing up', result: '2,581.52 MPa', cert: '2025-0053M' },
      { sample: '20 mm x 530 mm x 75 mm', parameter: 'Modulus of Rupture', result: '22.77 MPa', cert: '2025-0054M' },
      { sample: '20 mm x 530 mm x 75 mm', parameter: 'Apparent Modulus of Elasticity', result: '2,211.82 MPa', cert: '2025-0054M' },
      { sample: '30 mm x 770 mm x 75 mm', parameter: 'Modulus of Rupture', result: '69.44 MPa', cert: '2025-0055M' },
      { sample: '30 mm x 770 mm x 75 mm', parameter: 'Apparent Modulus of Elasticity', result: '10,256.71 MPa', cert: '2025-0055M' },
    ],
  },
  {
    heading: 'Engineered bamboo, compression',
    method: 'ASTM D1037, Compression Parallel to Surface, Method C',
    analysed: '27 October 2025',
    rows: [
      { sample: '12 mm x 48 mm x 25 mm', parameter: 'Compressive Strength', result: '25.19 MPa', cert: '2025-0056M' },
      { sample: '12 mm x 48 mm x 25 mm', parameter: 'Modulus of Elasticity', result: '1,692.33 MPa', cert: '2025-0056M' },
      { sample: '12 mm x 48 mm x 25 mm', parameter: 'Stress at Proportional Limit', result: '23.91 MPa', cert: '2025-0056M' },
      { sample: '20 mm x 80 mm x 25 mm', parameter: 'Compressive Strength', result: '27.64 MPa', cert: '2025-0057M' },
      { sample: '20 mm x 80 mm x 25 mm', parameter: 'Modulus of Elasticity', result: '1,828.01 MPa', cert: '2025-0057M' },
      { sample: '20 mm x 80 mm x 25 mm', parameter: 'Stress at Proportional Limit', result: '24.82 MPa', cert: '2025-0057M' },
      { sample: '30 mm x 120 mm x 25 mm', parameter: 'Compressive Strength', result: '30.46 MPa', cert: '2025-0058M' },
      { sample: '30 mm x 120 mm x 25 mm', parameter: 'Modulus of Elasticity', result: '3,768.93 MPa', cert: '2025-0058M' },
      { sample: '30 mm x 120 mm x 25 mm', parameter: 'Stress at Proportional Limit', result: '30.33 MPa', cert: '2025-0058M' },
    ],
  },
  {
    heading: 'Engineered bamboo, hardness',
    method: 'ASTM D1037, Hardness, Modified Janka ball test method',
    analysed: '24 October 2025',
    rows: [
      { sample: '20 mm x 152 mm x 76 mm', parameter: 'Hardness', result: '3,918.33 N', cert: '2025-0059M' },
      { sample: '30 mm x 152 mm x 76 mm', parameter: 'Hardness', result: '4,252.67 N', cert: '2025-0060M' },
      { sample: '44 mm x 152 mm x 76 mm', parameter: 'Hardness', result: '7,377.33 N', cert: '2025-0061M' },
    ],
  },
]

const applications = [
  { title: 'Wall forming', src: '/nuweave/numat-bamboo-formwork-wall-forming.jpg' },
  { title: 'Column forming', src: '/nuweave/numat-bamboo-formwork-column-forming.jpg' },
  { title: 'Slab forming', src: '/nuweave/numat-bamboo-formwork-slab-forming.jpg' },
  { title: 'Beam forming', src: '/nuweave/numat-bamboo-formwork-beam-forming.jpg' },
]

const manufacturing = [
  { title: 'Raw material selection', src: '/nuweave/numat-bamboo-raw-material-selection.jpg' },
  { title: 'Weaving and lay up', src: '/nuweave/numat-bamboo-mat-weaving.jpg' },
  { title: 'Hot pressing', src: '/nuweave/numat-bamboo-hot-pressing.jpg' },
  { title: 'Finished board', src: '/nuweave/numat-finished-woven-bamboo-board.jpg' },
]

const comparison = [
  { feature: 'Reuse cycles before failure', nuweave: 'Designed for repeated pours', plywood: 'Bulges after a few pours' },
  { feature: 'Load spread', nuweave: 'Interwoven mats across the sheet', plywood: 'Layered veneer' },
  { feature: 'Philippine made', nuweave: 'Yes', plywood: 'Usually imported' },
  { feature: 'Renewable in 3 to 5 years', nuweave: 'Yes', plywood: 'No, decades for hardwood' },
]

/* Real completed projects only. No narrative is written here that has not been
 * confirmed, and imagery stays a labelled placeholder until site photos land. */
const completedProjects = [
  { name: 'Cubo Modular', src: '/nuweave/numat-bamboo-delivery-cubo-modular.jpg' },
  { name: 'APDCC', src: '/nuweave/numat-bamboo-tables-flooring-apdcc.jpg' },
  { name: 'Alina Resort', src: '/nuweave/numat-bamboo-delivery-alina-resort.jpg' },
]

export default function NumatHomepage() {
  const { formatConvertedFromPhp, currency } = useCurrency()

  const { data: testimonialsData } = useSWR<Testimonial[]>('/api/testimonials', fetcher)
  const testimonials = Array.isArray(testimonialsData) ? testimonialsData : []

  const { data: blogData } = useSWR<BlogItem[]>('/api/news', fetcher)
  const blogItems = Array.isArray(blogData) ? blogData.slice(0, 3) : []

  const { data: productsData } = useSWR<Product[]>('/api/products', fetcher)

  // Featured first, then cheapest to dearest. PHP is the authoritative base.
  const products = Array.isArray(productsData)
    ? [...productsData].sort((a, b) => {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
        return (a.starting_price_php ?? 0) - (b.starting_price_php ?? 0)
      })
    : []

  const nuweave = products.find((p) => p.slug === 'nuweave') ?? null
  const variant = nuweave?.variants?.[0] ?? null

  const priceLabel = variant?.is_price_on_request
    ? 'Price on request'
    : formatConvertedFromPhp(variant?.base_price_php)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">

        {/* 1. Hero */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-[linear-gradient(to_bottom,_#f8f3ea,_#f4ede2)]">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-900/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-700/10 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit rounded-full border border-emerald-900/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900 shadow-sm">
                Engineered bamboo panels
              </div>

              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                The next generation of bamboo construction panels
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
                NuWeave is woven bamboo mat pressed under high heat and high pressure into a
                16 mm three ply board. Proudly made in the Philippines.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <span className="text-lg font-semibold text-stone-950">{priceLabel}</span>
                <span className="text-sm text-stone-600">a board.</span>
                <span className="text-sm font-semibold text-emerald-900">No minimum order.</span>
                <span className="text-sm text-stone-600">Buy one and try it on site.</span>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/request-samples"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-stone-900"
                >
                  Request a sample
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-900 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-50"
                >
                  Request a quote
                </Link>
              </div>

              {variant && (
                <p className="mt-4 text-sm text-stone-500">
                  {variant.size_label}, three ply.
                  {currency !== 'PHP' && (
                    <span> Converted from PHP at the rate of the day.</span>
                  )}
                </p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-white p-3 shadow-lg">
              <div className="relative h-[320px] overflow-hidden rounded-[1.5rem] sm:h-[440px]">
                <PlaceholderImage
                  src="/nuweave/numat-bamboo-formwork-construction-site.jpg"
                  alt="NuWeave engineered bamboo panel"
                  label="Hero image: NuWeave board on site"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Trust bar */}
        <section className="border-b border-stone-200 bg-[#f6f1e8]">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
            <div className="rounded-[2rem] bg-emerald-800 p-4 text-white">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {trustPoints.map((point) => (
                  <div
                    key={point}
                    className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium transition duration-300 hover:bg-white/15"
                  >
                    <span>{point}</span>
                    <ShieldCheck className="ml-3 h-4 w-4 shrink-0 text-white" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2b. Partnerships and investor: high on the page for credibility */}
        <PartnersSection />

        {/* 3. Why NuWeave */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Why NuWeave
          </p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            Stronger boards, straighter concrete, lower cost per pour
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="w-fit rounded-2xl bg-emerald-50 p-3">
                  <Icon className="h-5 w-5 text-emerald-800" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-stone-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. The range: every active product, PHP base, straight from Supabase */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  The range
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  Three boards, one standard sheet size
                </h2>
              </div>
              <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                View all products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {products.map((product) => {
                const v = product.variants?.[0] ?? null
                const label = v?.is_price_on_request
                  ? 'Price on request'
                  : formatConvertedFromPhp(product.starting_price_php ?? v?.base_price_php)

                return (
                  <div
                    key={product.id}
                    className="flex flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative h-56">
                      <PlaceholderImage
                        src={product.image_url ?? `/nuweave/product-${product.slug}.jpg`}
                        alt={product.name}
                        label={`Product image: ${product.name}`}
                      />
                      {product.is_featured && (
                        <span className="absolute left-4 top-4 rounded-full bg-emerald-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-xl font-semibold text-stone-950">{product.name}</h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">
                        {product.description}
                      </p>

                      <dl className="mt-5 space-y-2 text-sm">
                        {v?.size_label && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-stone-500">Sheet size</dt>
                            <dd className="text-right font-medium text-stone-900">{v.size_label}</dd>
                          </div>
                        )}
                        {v?.core_type && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-stone-500">Core</dt>
                            <dd className="text-right font-medium text-stone-900">{v.core_type}</dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-3">
                          <dt className="text-stone-500">Minimum order</dt>
                          <dd className="text-right font-medium text-stone-900">
                            {!v || v.moq <= 1 ? 'None' : `${v.moq} boards`}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto pt-6">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                            List price
                          </p>
                          <p className="mt-1 text-xl font-semibold text-stone-950">
                            {label}
                            <span className="ml-1 text-xs font-medium text-stone-600">per board</span>
                          </p>
                        </div>

                        <Link
                          href={`/products/${product.slug}`}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-900"
                        >
                          View {product.name}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-6 text-xs text-stone-500">
              Prices exclude shipping.
              {currency !== 'PHP'
                ? ' Converted from the PHP list price at the rate of the day.'
                : ''}
            </p>
          </div>
        </section>

        {/* 5. Tested performance: DOST results exactly as certified */}
        <section className="bg-[#f6f1e8]">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <div className="rounded-[2rem] bg-stone-950 p-6 text-white lg:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Tested performance
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Independently tested
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/75">
                    Samples tested under ASTM D1037 at the Regional Standards and Testing
                    Laboratories, Department of Science and Technology Region X, Cagayan de Oro.
                  </p>
                  <p className="mt-4 text-sm leading-6 text-white/50">
                    Every figure shown is transcribed from a Report of Analysis certificate.
                    Results refer only to the particular sample submitted and are listed against
                    the sample description printed on the certificate.
                  </p>
                  <Link
                    href="/testing"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                  >
                    View test data
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {dostReports.map((report) => (
                    <div
                      key={report.heading}
                      className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.05]"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2 text-emerald-300">
                          <FlaskConical className="h-4 w-4 shrink-0" />
                          <p className="text-sm font-semibold text-white">{report.heading}</p>
                          {report.certifiedAs && (
                            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/50">
                              Tested as {report.certifiedAs}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/45">
                          {report.method} · Analysed {report.analysed}
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-white/40">
                            <tr>
                              <th className="px-5 py-2.5 font-medium">Sample</th>
                              <th className="px-5 py-2.5 font-medium">Parameter</th>
                              <th className="px-5 py-2.5 text-right font-medium">Result</th>
                              <th className="px-5 py-2.5 text-right font-medium">Certificate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.rows.map((row) => (
                              <tr
                                key={`${row.cert}-${row.parameter}-${row.sample}`}
                                className="border-t border-white/[0.07]"
                              >
                                <td className="whitespace-nowrap px-5 py-2.5 text-white/60">{row.sample}</td>
                                <td className="px-5 py-2.5 text-white/80">{row.parameter}</td>
                                <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-white">
                                  {row.result}
                                </td>
                                <td className="whitespace-nowrap px-5 py-2.5 text-right text-white/40">{row.cert}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Applications */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Built for every application
            </h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {applications.map((item) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-56">
                    <PlaceholderImage src={item.src} alt={item.title} label={item.title} />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="pointer-events-none absolute bottom-4 left-4 right-4">
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. NuWeave vs plywood */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            NuWeave vs traditional plywood
          </h2>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-stone-500">Feature</th>
                  <th className="px-6 py-4 font-semibold text-stone-950">NuWeave</th>
                  <th className="px-6 py-4 font-semibold text-stone-500">Traditional plywood</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-t border-stone-200">
                    <td className="px-6 py-4 font-medium text-stone-700">{row.feature}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-800">{row.nuweave}</td>
                    <td className="px-6 py-4 text-stone-500">{row.plywood}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-emerald-900">
              Want the full cost per pour breakdown?
            </p>
            <Link
              href="/compare"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-900"
            >
              Compare materials
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* 8. Cost per pour calculator */}
        <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-8">
          <CostPerPourCalculator />
        </section>

        {/* 9. Manufacturing */}
        <section className="border-y border-stone-200 bg-stone-950">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              World class manufacturing, local expertise
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Manufactured at our factory in Manolo Fortich, Bukidnon.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/10">
                <div className="relative aspect-video">
                  <FactoryVideo
                    src="/nuweave/numat-bamboo-factory-walkthrough.mp4"
                    poster="/nuweave/numat-bamboo-factory-walkthrough-poster.jpg"
                    label="Factory walkthrough: Manolo Fortich, Bukidnon"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {manufacturing.map((item) => (
                  <div key={item.title} className="overflow-hidden rounded-[1.5rem] border border-white/10">
                    <div className="relative h-32">
                      <PlaceholderImage src={item.src} alt={item.title} label={item.title} />
                    </div>
                    <p className="bg-white/[0.05] px-4 py-3 text-xs font-semibold text-white">
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 10. Completed projects and customer feedback */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Proof
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            Delivered projects and customer feedback
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {completedProjects.map((project) => (
              <div
                key={project.name}
                className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-56">
                  <PlaceholderImage
                    src={project.src}
                    alt={project.name}
                    label={`Project photo: ${project.name}`}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-white/80" />
                    <p className="text-lg font-semibold text-white">{project.name}</p>
                    <span className="ml-auto rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      Completed
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {testimonials.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
                What customers say
              </h3>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {testimonials.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                      <Quote className="h-5 w-5" />
                    </div>
                    <p className="mt-5 whitespace-pre-line text-base leading-7 text-stone-700">
                      {item.testimonial}
                    </p>
                    <div className="mt-6 border-t border-stone-200 pt-4">
                      <p className="text-base font-semibold text-stone-950">{item.name}</p>
                      <p className="mt-1 text-sm text-stone-500">{item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 11. Blog */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  Latest
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  From the blog
                </h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {blogItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="group block overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  {item.cover_image_url ? (
                    <div className="relative h-52 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-stone-100">
                      <FileText className="h-10 w-10 text-stone-300" />
                    </div>
                  )}

                  <div className="p-6">
                    {item.published_at && (
                      <p className="text-xs font-medium text-stone-400">
                        {new Date(item.published_at).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-stone-950">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                        {item.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <NewsletterBand />

        {/* 12. Final CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-12 text-white shadow-xl lg:px-12 lg:py-16">
            <div className="absolute inset-0 opacity-30">
              <PlaceholderImage src="/nuweave/numat-engineered-bamboo-formwork-panels.jpg" alt="NuWeave board" label="" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />

            <div className="relative max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Next step
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to build with NuWeave?
              </h2>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/request-samples"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Request a sample
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-white/10"
                >
                  Request a quote
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
