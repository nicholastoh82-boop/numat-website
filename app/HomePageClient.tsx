'use client'

import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Factory,
  FileText,
  FlaskConical,
  Handshake,
  Leaf,
  PackageCheck,
  Quote,
  Ruler,
  ShoppingBag,
  Sprout,
  Truck,
  Wrench,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import NewsletterBand from '@/components/newsletter-band'
import FactoryVideo from '@/components/factory-video'
import CostPerPourCalculator from '@/components/cost-per-pour-calculator'
import PartnersSection from '@/components/home/partners-section'
import ProductGallery from '@/components/products/product-gallery'
import { useCurrency } from '@/components/providers/currency-provider'
import { NUFORM_GRADES, PRODUCT_ORDER, getMarketing } from '@/lib/product-media'

type Testimonial = {
  id: string
  name: string
  location: string
  testimonial: string
}

type BlogItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image_url: string | null
  published_at: string | null
}

type Variant = {
  base_price_php: number | null
  is_price_on_request: boolean
  is_available?: boolean
}

type Product = {
  id: string
  name: string
  slug: string
  variants: Variant[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

/** Lowest live price from Supabase: available, not on request. */
function fromPrice(product: Product | undefined): number | null {
  const prices = (product?.variants ?? [])
    .filter((v) => v.is_available !== false && !v.is_price_on_request)
    .map((v) => Number(v.base_price_php))
    .filter((n) => Number.isFinite(n) && n > 0)
  return prices.length ? Math.min(...prices) : null
}

const heroPoints = [
  { icon: Factory, label: 'Made in Bukidnon' },
  { icon: PackageCheck, label: 'Order from 10 boards' },
  { icon: Truck, label: 'Delivery quoted to site' },
  { icon: BadgeCheck, label: 'Pay after we confirm' },
]

const bambooFacts = [
  { label: 'Growth cycle', bamboo: '3 to 5 years', wood: '20 to 40 years' },
  { label: 'Renewability', bamboo: 'Regrows from the same root', wood: 'Replanting needed' },
  { label: 'Sourcing', bamboo: 'Philippine farms', wood: 'Often imported' },
]

const applications = [
  { title: 'Wall forming', src: '/nuweave/numat-engineered-bamboo-formwork-panels.jpg' },
  { title: 'Column forming', src: '/nuweave/numat-bamboo-formwork-column-forming.jpg' },
  { title: 'Slab forming', src: '/nuweave/numat-bamboo-formwork-slab-forming.jpg' },
  { title: 'Beam forming', src: '/nuweave/numat-bamboo-formwork-beam-forming.jpg' },
]

const industries = [
  { title: 'Construction', src: '/products/site/industry-construction.jpg' },
  { title: 'Hospitality', src: '/products/site/industry-hospitality.jpg' },
  { title: 'Residential', src: '/products/site/industry-residential.jpg' },
  { title: 'Commercial', src: '/products/site/industry-commercial.jpg' },
  { title: 'Industrial', src: '/products/site/industry-industrial.jpg' },
  { title: 'Institutional', src: '/products/site/industry-institutional.jpg' },
]

const manufacturing = [
  { title: 'Raw material selection', src: '/nuweave/numat-bamboo-raw-material-selection.jpg' },
  { title: 'Weaving and lay up', src: '/nuweave/numat-bamboo-mat-weaving.jpg' },
  { title: 'Hot pressing', src: '/nuweave/numat-bamboo-hot-pressing.jpg' },
  { title: 'Finished board', src: '/products/nuform/nuform-board-stack.jpg' },
]

const whyNumat = [
  { icon: Factory, title: 'Local manufacturing', body: 'Proudly Philippine made, from bamboo to finished board.' },
  { icon: Wrench, title: 'Technical support', body: 'Help from product choice through to installation.' },
  { icon: Ruler, title: 'Product customisation', body: 'Thicknesses and builds tailored to your project.' },
  { icon: Truck, title: 'Supplier reliability', body: 'Consistent quality and clear delivery schedules.' },
  { icon: Handshake, title: 'Engineering assistance', body: 'We help you build better with our technical know how.' },
  { icon: Sprout, title: 'Sustainable solutions', body: 'Fast growing bamboo that supports local farming communities.' },
]

const completedProjects = [
  { name: 'Cubo Modular', src: '/nuweave/numat-bamboo-delivery-cubo-modular.jpg' },
  { name: 'APDCC', src: '/nuweave/numat-bamboo-tables-flooring-apdcc.jpg' },
  { name: 'Alina Resort', src: '/nuweave/numat-bamboo-delivery-alina-resort.jpg' },
]

function Photo({ src, alt, sizes, className = '' }: { src: string; alt: string; sizes: string; className?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} className={`object-cover ${className}`} />
}

export default function NumatHomepage() {
  const { formatConvertedFromPhp } = useCurrency()

  const { data: testimonialsData } = useSWR<Testimonial[]>('/api/testimonials', fetcher)
  const testimonials = Array.isArray(testimonialsData) ? testimonialsData.slice(0, 3) : []

  const { data: blogData } = useSWR<BlogItem[]>('/api/news', fetcher)
  const blogItems = Array.isArray(blogData) ? blogData.slice(0, 3) : []

  const { data: productsData } = useSWR<Product[]>('/api/products', fetcher)
  const products = (Array.isArray(productsData) ? productsData : [])
    .filter((p) => (PRODUCT_ORDER as readonly string[]).includes(p.slug))
    .sort((a, b) => PRODUCT_ORDER.indexOf(a.slug as never) - PRODUCT_ORDER.indexOf(b.slug as never))

  const nuform = products.find((p) => p.slug === 'nuform')
  const nuformFrom = fromPrice(nuform)
  const nuformMarketing = getMarketing('nuform')

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#faf7f1] text-stone-900">
        {/* 1. Hero */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900">
                <Leaf className="h-3.5 w-3.5" />
                Engineered bamboo, made in the Philippines
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Stronger boards. Straighter concrete. Lower cost per pour.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">
                Shop NuForm and NuForm Lite bamboo formwork, NuWev woven wall boards and NuBrid, the bamboo panel
                that replaces MDF. Live prices, low minimum orders, straight from our factory in Bukidnon.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products/nuform"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-7 py-4 text-base font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-900"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Shop NuForm
                  {nuformFrom != null && (
                    <span className="font-normal text-white/80">from {formatConvertedFromPhp(nuformFrom)}</span>
                  )}
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-stone-900 bg-white px-7 py-4 text-base font-semibold text-stone-900 transition hover:-translate-y-0.5 hover:bg-stone-50"
                >
                  Shop all boards
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {heroPoints.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <Icon className="h-4 w-4 shrink-0 text-emerald-800" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] sm:aspect-[5/4] lg:aspect-auto lg:h-full lg:min-h-[520px]">
                <Photo
                  src="/nuweave/numat-engineered-bamboo-formwork-panels.jpg"
                  alt="NuForm bamboo formwork panels in use on a Philippine construction site"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
              <Link
                href="/products/nuform"
                className="absolute bottom-4 left-4 right-4 flex items-center gap-4 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur transition hover:bg-white sm:left-auto sm:w-80"
              >
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f4efe6]">
                  <Image src="/products/nuform/nuform-board-stack.jpg" alt="" fill sizes="64px" className="object-contain" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Best seller</span>
                  <span className="block font-semibold text-stone-950">NuForm formwork board</span>
                  <span className="block text-sm text-stone-600">
                    {nuformFrom != null ? `From ${formatConvertedFromPhp(nuformFrom)} per board` : 'Phenolic film, both faces'}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-emerald-800" />
              </Link>
            </div>

            <p className="max-w-4xl border-t border-stone-200 pt-8 text-lg leading-8 text-stone-700 lg:col-span-2">
              NuMat transforms Philippine bamboo into engineered panels for construction, interiors,
              fabrication, and new material applications. Made locally, developed for real world use,
              and built for teams looking for better material possibilities.
            </p>
          </div>
        </section>

        {/* 2. Shop the range */}
        <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Shop the range</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Four boards, one material
              </h2>
            </div>
            <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 hover:underline">
              Compare all boards
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {PRODUCT_ORDER.map((slug) => {
              const m = getMarketing(slug)
              if (!m) return null
              const product = products.find((p) => p.slug === slug)
              const price = fromPrice(product)
              return (
                <article
                  key={slug}
                  className="flex flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative p-3">
                    <ProductGallery images={m.gallery} compact />
                    {m.badge && (
                      <span className="absolute left-6 top-6 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-6 pb-6 pt-2">
                    <h3 className="text-2xl font-semibold text-stone-950">{m.displayName}</h3>
                    <p className="mt-1 font-medium text-emerald-900">{m.tagline}</p>
                    {m.alsoAvailable && (
                      <p className="mt-1 text-sm font-semibold text-amber-800">{m.alsoAvailable}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.bestFor.slice(0, 4).map((use) => (
                        <span key={use} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                          {use}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-stone-500">From</p>
                        <p className="text-2xl font-semibold text-stone-950">
                          {price != null ? formatConvertedFromPhp(price) : product ? 'On request' : ' '}
                        </p>
                      </div>
                      <Link
                        href={`/products/${slug}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                      >
                        Shop now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-stone-500">Ex works prices per 2440 x 1220 mm sheet. Delivery quoted separately.</p>
        </section>

        {/* 3. NuForm vs NuForm Lite */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
            <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-[#f4efe6]">
              <Image
                src="/products/nuform/nuform-and-nuform-lite.jpg"
                alt="NuForm and NuForm Lite formwork boards"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-contain p-6"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">NuForm</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                NuForm or NuForm Lite. Two boards, one sustainable choice.
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                {nuformMarketing?.pitch}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {NUFORM_GRADES.map((g) => (
                  <div key={g.grade} className="rounded-2xl border border-stone-200 p-5">
                    <p className="text-lg font-semibold text-stone-950">{g.name}</p>
                    <p className="text-sm font-medium text-emerald-800">{g.promise}</p>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{g.bestFor}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/products/nuform"
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-2xl bg-emerald-800 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
              >
                Choose NuForm or NuForm Lite
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Partners */}
        <PartnersSection />

        {/* 5. Applications */}
        <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">NuForm on site</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            Fits the formwork system you already use
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {applications.map((item) => (
              <Link
                key={item.title}
                href="/products/nuform"
                className="group relative block h-64 overflow-hidden rounded-[1.5rem] border border-stone-200"
              >
                <Photo src={item.src} alt={`NuForm used for ${item.title.toLowerCase()}`} sizes="(min-width: 1280px) 25vw, 50vw" className="transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-4 left-4 text-lg font-semibold text-white">{item.title}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 6. Cost per pour */}
        <section className="mx-auto max-w-7xl px-4 pb-14 lg:px-8 lg:pb-20">
          <CostPerPourCalculator />
        </section>

        {/* 7. Why bamboo */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Why bamboo</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                A renewable material that grows back in years, not decades
              </h2>
              <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-5 py-3 font-medium text-stone-500">&nbsp;</th>
                      <th className="px-5 py-3 font-semibold text-emerald-900">Bamboo</th>
                      <th className="px-5 py-3 font-medium text-stone-500">Traditional wood</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bambooFacts.map((row) => (
                      <tr key={row.label} className="border-t border-stone-100">
                        <td className="px-5 py-4 font-medium text-stone-700">{row.label}</td>
                        <td className="px-5 py-4 font-semibold text-emerald-900">{row.bamboo}</td>
                        <td className="px-5 py-4 text-stone-500">{row.wood}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href="/testing"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 hover:underline"
              >
                <FlaskConical className="h-4 w-4" />
                See our independent test results
              </Link>
            </div>
            <div className="relative min-h-[320px] overflow-hidden rounded-[2rem]">
              <Photo src="/products/site/bamboo-raw-poles.jpg" alt="Harvested Philippine bamboo poles" sizes="(min-width: 1024px) 40vw, 100vw" />
            </div>
          </div>
        </section>

        {/* 8. Industries */}
        <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Industries</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            From concept to creation, your partner in sustainable building
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {industries.map((item) => (
              <div key={item.title} className="relative h-44 overflow-hidden rounded-[1.5rem] sm:h-56">
                <Photo src={item.src} alt={item.title} sizes="(min-width: 1024px) 33vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-4 left-4 text-lg font-semibold text-white">{item.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Manufacturing */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">From farm to finished board</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Made at our factory in Manolo Fortich, Bukidnon
            </h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="overflow-hidden rounded-[1.5rem] border border-stone-200">
                <div className="relative aspect-video">
                  <FactoryVideo
                    src="/nuweave/numat-bamboo-factory-walkthrough.mp4"
                    poster="/nuweave/numat-bamboo-factory-walkthrough-poster.jpg"
                    label="Factory walkthrough: Manolo Fortich, Bukidnon"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {manufacturing.map((item, i) => (
                  <div key={item.title} className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-stone-50">
                    <div className="relative h-32">
                      <Photo src={item.src} alt={item.title} sizes="(min-width: 1024px) 20vw, 50vw" />
                    </div>
                    <p className="px-4 py-3 text-xs font-semibold text-stone-800">
                      <span className="mr-1 text-emerald-800">{i + 1}.</span>
                      {item.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 10. Why NUMAT */}
        <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Why partner with NUMAT</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            More than a manufacturer. Your sustainability partner.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyNumat.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="w-fit rounded-2xl bg-emerald-50 p-3">
                  <Icon className="h-5 w-5 text-emerald-800" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-stone-950">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 11. Proof */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Delivered</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Projects built with NUMAT boards
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {completedProjects.map((project) => (
                <div key={project.name} className="relative h-56 overflow-hidden rounded-[1.5rem] border border-stone-200">
                  <Photo src={project.src} alt={`NUMAT boards delivered to ${project.name}`} sizes="(min-width: 640px) 33vw, 100vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <p className="absolute bottom-4 left-4 flex items-center gap-2 text-lg font-semibold text-white">
                    <Building2 className="h-4 w-4 text-white/80" />
                    {project.name}
                  </p>
                </div>
              ))}
            </div>

            {testimonials.length > 0 && (
              <div className="mt-10 grid gap-4 lg:grid-cols-3">
                {testimonials.map((item) => (
                  <figure key={item.id} className="rounded-[1.5rem] border border-stone-200 bg-[#faf7f1] p-6">
                    <Quote className="h-5 w-5 text-emerald-800" />
                    <blockquote className="mt-4 whitespace-pre-line text-base leading-7 text-stone-700">
                      {item.testimonial}
                    </blockquote>
                    <figcaption className="mt-5 border-t border-stone-200 pt-4">
                      <p className="font-semibold text-stone-950">{item.name}</p>
                      <p className="text-sm text-stone-500">{item.location}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 12. Blog */}
        {blogItems.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8 lg:py-20">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">From the blog</h2>
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 hover:underline">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {blogItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="group block overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {item.cover_image_url ? (
                    <div className="relative h-48 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-stone-100">
                      <FileText className="h-10 w-10 text-stone-300" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold leading-snug text-stone-950">{item.title}</h3>
                    {item.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{item.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <NewsletterBand />

        {/* 13. Final call to action */}
        <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 px-6 py-12 text-white shadow-xl sm:px-10 lg:px-14 lg:py-16">
            <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-30 lg:block">
              <Photo src="/products/nuform/nuform-board-stack.jpg" alt="" sizes="33vw" />
            </div>
            <div className="relative max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to build with bamboo?</h2>
              <p className="mt-3 text-lg text-white/80">
                Build your order in minutes. We confirm stock and delivery, and you pay only once you approve.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-base font-semibold text-emerald-900 transition hover:bg-emerald-50"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Start your order
                </Link>
                <a
                  href="https://wa.me/639613076458?text=Hello%20NUMAT%2C%20I%20would%20like%20to%20place%20an%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  Order on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
