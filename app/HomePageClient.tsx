'use client'

import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowRight,
  FileText,
  FlaskConical,
  Leaf,
  Quote,
  Recycle,
  Ruler,
  ShieldCheck,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import NewsletterBand from '@/components/newsletter-band'
import PlaceholderImage from '@/components/placeholder-image'
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
  variants: Variant[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// Reordered per the brief: DOST first, Philippine sourced and made second.
// "Minimum order 10 boards" was dropped: NuWeave has no MOQ for now (moq = 1).
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

// Attributed to the woven mat board as tested under ASTM D1037 by DOST-X
// Regional Standards and Testing Laboratory. Written as tested, not certified.
const testedFigures = [
  { label: 'Apparent Modulus of Elasticity', value: '10,256.71 MPa' },
  { label: 'Janka Hardness', value: 'Up to 7,377.33 N' },
]

const applications = [
  { title: 'Wall forming', src: '/nuweave/application-wall.jpg' },
  { title: 'Column forming', src: '/nuweave/application-column.jpg' },
  { title: 'Slab forming', src: '/nuweave/application-slab.jpg' },
  { title: 'Beam forming', src: '/nuweave/application-beam.jpg' },
]

const manufacturing = [
  { title: 'Raw material selection', src: '/nuweave/mfg-raw-material.jpg' },
  { title: 'Weaving and lay up', src: '/nuweave/mfg-weaving.jpg' },
  { title: 'Hot pressing', src: '/nuweave/mfg-pressing.jpg' },
  { title: 'Testing', src: '/nuweave/mfg-testing.jpg' },
]

const comparison = [
  { feature: 'Reuse cycles before failure', nuweave: 'Designed for repeated pours', plywood: 'Bulges after a few pours' },
  { feature: 'Load spread', nuweave: 'Interwoven mats across the sheet', plywood: 'Layered veneer' },
  { feature: 'Philippine made', nuweave: 'Yes', plywood: 'Usually imported' },
  { feature: 'Renewable in 3 to 5 years', nuweave: 'Yes', plywood: 'No, decades for hardwood' },
]

export default function NumatHomepage() {
  const { formatConvertedFromPhp, currency, phpRateDate } = useCurrency()

  const { data: testimonialsData } = useSWR<Testimonial[]>('/api/testimonials', fetcher)
  const testimonials = Array.isArray(testimonialsData) ? testimonialsData : []

  const { data: blogData } = useSWR<BlogItem[]>('/api/news', fetcher)
  const blogItems = Array.isArray(blogData) ? blogData.slice(0, 3) : []

  const { data: productsData } = useSWR<Product[]>('/api/products', fetcher)
  const nuweave = Array.isArray(productsData)
    ? productsData.find((p) => p.slug === 'nuweave') ?? null
    : null
  const variant = nuweave?.variants?.[0] ?? null

  const priceLabel = variant?.is_price_on_request
    ? 'Price on request'
    : formatConvertedFromPhp(variant?.base_price_php)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">

        {/* Hero */}
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

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
                <p className="mt-5 text-sm text-stone-600">
                  <span className="font-semibold text-stone-900">{priceLabel}</span> per board,
                  {' '}{variant.size_label}
                  {currency !== 'PHP' && phpRateDate && (
                    <span className="text-stone-500">
                      {' '}(converted from PHP at the {phpRateDate} rate)
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-white p-3 shadow-lg">
              <div className="relative h-[320px] overflow-hidden rounded-[1.5rem] sm:h-[440px]">
                <PlaceholderImage
                  src="/nuweave/hero.jpg"
                  alt="NuWeave engineered bamboo panel"
                  label="Hero image: NuWeave board on site"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
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

        {/* Why NuWeave */}
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

        {/* Hero product: spec and price */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div className="relative h-[300px] overflow-hidden rounded-[2rem] border border-stone-200 sm:h-[400px]">
                <PlaceholderImage
                  src="/nuweave/board.jpg"
                  alt="NuWeave board face"
                  label="Product image: NuWeave board face and edge"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  The board
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  NuWeave
                </h2>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  {nuweave?.description ??
                    'Engineered bamboo panel formed from woven bamboo mats bonded under high heat and high pressure into a 16 mm three ply board.'}
                </p>

                <dl className="mt-7 grid grid-cols-2 gap-4">
                  {[
                    { label: 'Board size', value: '2440 x 1220 mm (4ft x 8ft)' },
                    { label: 'Thickness', value: '16 mm' },
                    { label: 'Construction', value: '3 ply woven mat' },
                    { label: 'Minimum order', value: !variant || variant.moq <= 1 ? 'None' : `${variant.moq} boards` },
                  ].map((row) => (
                    <div key={row.label} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                        {row.label}
                      </dt>
                      <dd className="mt-1.5 text-sm font-semibold text-stone-950">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
                      List price
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-stone-950">
                      {priceLabel}
                      <span className="ml-1 text-sm font-medium text-stone-600">per board</span>
                    </p>
                    {currency !== 'PHP' && (
                      <p className="mt-1 text-xs text-stone-500">
                        Converted from the PHP list price
                        {phpRateDate ? ` at the ${phpRateDate} rate` : ''}. Excludes shipping.
                      </p>
                    )}
                  </div>
                  <Link
                    href="/request-quote"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-900"
                  >
                    Request a quote
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tested performance */}
        <section className="bg-[#f6f1e8]">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <div className="rounded-[2rem] bg-stone-950 p-6 text-white lg:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Tested performance
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Independently tested
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/75">
                    Tested under ASTM D1037 at the Department of Science and Technology
                    Regional Standards and Testing Laboratory.
                  </p>
                  <Link
                    href="/testing"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
                  >
                    View test data
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {testedFigures.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6"
                    >
                      <div className="flex items-center gap-2 text-emerald-300">
                        <FlaskConical className="h-4 w-4" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-3 text-2xl font-semibold leading-tight">{item.value}</p>
                    </div>
                  ))}

                  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 sm:col-span-2">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <Ruler className="h-4 w-4" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Test method
                      </p>
                    </div>
                    <p className="mt-3 text-lg font-semibold leading-tight">
                      ASTM D1037, Standard Test Methods for Evaluating Properties of Wood Base Fiber
                      and Particle Panel Materials
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Applications */}
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

        {/* NuWeave vs plywood */}
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

        {/* Manufacturing */}
        <section className="border-y border-stone-200 bg-stone-950">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              World class manufacturing, local expertise
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/70">
              Manufactured at our factory in Manolo Fortich, Bukidnon.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {manufacturing.map((item) => (
                <div key={item.title} className="overflow-hidden rounded-[1.5rem] border border-white/10">
                  <div className="relative h-44">
                    <PlaceholderImage src={item.src} alt={item.title} label={item.title} />
                  </div>
                  <p className="bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Customer feedback
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              What customers say
            </h2>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {testimonials.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                    <Quote className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-base leading-7 text-stone-700">{item.testimonial}</p>
                  <div className="mt-6 border-t border-stone-200 pt-4">
                    <p className="text-base font-semibold text-stone-950">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Blog */}
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

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-stone-950 px-8 py-12 text-white shadow-xl lg:px-12 lg:py-16">
            <div className="absolute inset-0 opacity-30">
              <PlaceholderImage src="/nuweave/cta.jpg" alt="NuWeave board" label="" />
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
