'use client'

import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'
import {
  ArrowRight,
  FileText,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Quote,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'

type Testimonial = {
  id: string
  name: string
  location: string
  testimonial: string
  sort_order?: number
}

type NewsItem = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_image_url: string | null
  published_at: string | null
  featured: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function NumatBambooHomepageRevamp() {
  const { data: testimonialsData } = useSWR<Testimonial[]>('/api/testimonials', fetcher)
  const testimonials = Array.isArray(testimonialsData) ? testimonialsData : []

  const { data: newsData } = useSWR<NewsItem[]>('/api/news', fetcher)
  const newsItems = Array.isArray(newsData) ? newsData.slice(0, 3) : []

  const trustPoints = [
    'Sustainably Harvested',
    'MOQ from 10 boards',
    'Export-ready supply',
    'Fast quote turnaround',
    'DOST / ASTM D1037 tested',
  ]

  const productFamilies = [
    {
      title: 'Furniture Boards',
      subtitle: 'Cabinetry, tables, shelving',
      image: '/Bamboo-Furniture.png',
      href: '/products?category=furniture',
    },
    {
      title: 'Wall Panels',
      subtitle: 'Interior surfaces, feature walls',
      image: '/Bamboo-Wall.png',
      href: '/products?category=nuwall',
    },
    {
      title: 'Doors & Joinery',
      subtitle: 'Panels, doors, components',
      image: '/Bamboo-Door.png',
      href: '/products?category=nudoor',
    },
    {
      title: 'Flooring',
      subtitle: 'Interior surfaces, premium finish',
      image: '/Bamboo-Flooring.png',
      href: '/products?category=nufloor',
    },
    {
      title: 'Fit-Out Boards',
      subtitle: 'Project and board applications',
      image: '/Bamboo-Board.png',
      href: '/products?category=nubam-boards',
    },
    {
      title: 'Decorative Bamboo',
      subtitle: 'Feature walls and design-led use',
      image: '/Bamboo-DIY.png',
      href: '/products',
    },
  ]

  const applicationGallery = [
    { title: 'Interior Fit-Outs', image: '/Bamboo-Wall.png' },
    { title: 'Furniture Manufacturing', image: '/Bamboo-Furniture.png' },
    { title: 'Doors & Panels', image: '/Bamboo-Door.png' },
    { title: 'Cabinetry & Joinery', image: '/Bamboo-DIY.png' },
    { title: 'Flooring Surfaces', image: '/Bamboo-Flooring.png' },
    { title: 'Project Boards', image: '/Bamboo-Board.png' },
  ]

  const testingCards = [
    { label: 'MOR', value: '22.77–69.44 MPa' },
    { label: 'MOE', value: '2211.82–10256.71 MPa' },
    { label: 'Compression', value: '25.19–30.46 MPa' },
    { label: 'Hardness', value: '3918.33–7377.33 N' },
  ]

  const resourceCards = [
    { title: 'Data Sheets', href: '/technical-resources', icon: FileText },
    { title: 'Dimensions', href: '/technical-resources', icon: PackageCheck },
    { title: 'Certifications', href: '/testing', icon: ShieldCheck },
    { title: 'Applications', href: '/technical-resources', icon: Leaf },
  ]

  const visualTrust = [
    { title: 'FSC-Certified Sourcing', image: '/Bamboo-Wall.png' },
    { title: 'Project-Ready Boards', image: '/Bamboo-Board.png' },
    { title: 'Commercial Support', image: '/Bamboo-Door.png' },
    { title: 'Interior-Focused Finish', image: '/Bamboo-Flooring.png' },
  ]

  const quickIcons = [
    'Commercial interiors',
    'Furniture production',
    'Joinery and cabinetry',
    'Procurement-ready support',
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 bg-[#f6f1e8] text-stone-900">

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-stone-200 bg-[linear-gradient(to_bottom,_#f8f3ea,_#f4ede2)]">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-900/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-700/10 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-14">
            <div className="flex flex-col justify-center animate-[fadeUp_.7s_ease-out]">
              <div className="mb-4 inline-flex w-fit rounded-full border border-emerald-900/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900 shadow-sm">
                Engineered bamboo boards
              </div>

              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Premium Bamboo Boards for Interiors, Furniture, and Projects
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
                Built for buyers sourcing boards for cabinetry, fit-outs, doors,
                wall finishes, flooring, and commercial applications.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-stone-900"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-sm font-semibold text-emerald-700 animate-[subtlePulse_2.5s_ease-in-out_infinite]">
                  ✦ Get a quote in 24 hours — no commitment needed.
                </p>
              </div>

              <div className="mt-7 grid max-w-xl grid-cols-2 gap-3">
                {quickIcons.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-stone-200 bg-white/90 px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-800" />
                      <p className="text-sm font-medium text-stone-700">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:grid-rows-[1.15fr_0.85fr] animate-[fadeUp_.8s_ease-out]">
              <div className="group relative overflow-hidden rounded-[2rem] border border-stone-200 bg-white p-3 shadow-lg lg:col-span-2">
                <div className="relative h-[320px] overflow-hidden rounded-[1.5rem] sm:h-[430px]">
                  <Image
                    src="/Bamboo-DIY.png"
                    alt="Engineered bamboo boards for commercial interiors and projects"
                    fill
                    priority
                    className="object-cover transition duration-700 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 rounded-[1.5rem] border border-white/20 bg-white/88 p-5 shadow-xl backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600">
                      Procurement-ready support
                    </p>
                    <p className="mt-1 text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
                      Specs, sampling, and commercial guidance for serious buyers
                    </p>
                  </div>
                </div>
              </div>

              <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-stone-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-full min-h-[208px]">
                  <Image
                    src="/Bamboo-Furniture.png"
                    alt="Furniture and cabinetry applications"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm font-medium text-white/80">Application</p>
                    <p className="mt-1 text-lg font-semibold text-white">Furniture & cabinetry</p>
                  </div>
                </div>
              </div>

              <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-stone-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-full min-h-[208px]">
                  <Image
                    src="/Bamboo-Board.png"
                    alt="Export-ready bamboo board supply"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm font-medium text-white/80">Commercial</p>
                    <p className="mt-1 text-lg font-semibold text-white">Export-ready supply</p>
                  </div>
                </div>
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

        {/* News & Activities */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  Latest updates
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  News & Activities
                </h2>
              </div>
              <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {newsItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="group block overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  {item.cover_image_url ? (
                    <div className="relative h-52 overflow-hidden">
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {item.featured && (
                        <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">
                          Featured
                        </span>
                      )}
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
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    )}
                    <h3 className="mt-2 text-lg font-semibold leading-snug text-stone-950">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="mt-2 text-sm leading-6 text-stone-500 line-clamp-2">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      Read more
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

        {/* Product Families */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Product Families
            </h2>
            <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {productFamilies.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group block overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div className="relative h-72 overflow-hidden">
                  <Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-[1.07]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/85">{item.subtitle}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Visual Applications */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Visual Applications
              </h2>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-12">
              <div className="group relative self-start overflow-hidden rounded-[2rem] border border-stone-200 shadow-sm xl:col-span-5">
                <div className="relative h-[652px]">
                  <Image src="/Bamboo-Wall.png" alt="Premium bamboo wall and interior surfaces" fill className="object-cover transition duration-700 group-hover:scale-[1.05]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <p className="text-2xl font-semibold text-white">Interior Fit-Outs</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:col-span-7 xl:grid-cols-2">
                {applicationGallery.slice(1, 5).map((item) => (
                  <div key={item.title} className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative h-[200px]">
                      <Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-lg font-semibold text-white">{item.title}</p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg xl:col-span-2">
                  <div className="relative h-[220px]">
                    <Image src={applicationGallery[5].image} alt={applicationGallery[5].title} fill className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-lg font-semibold text-white">{applicationGallery[5].title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testing */}
        <section className="bg-[#f6f1e8]">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="rounded-[2rem] bg-stone-950 p-6 text-white lg:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Testing highlights
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Performance at a Glance
                  </h2>
                  <p className="mt-4 text-base leading-7 text-white/75">
                    DOST / ASTM D1037 mechanical testing supports commercial evaluation.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/testing" className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition duration-300 hover:bg-stone-100">
                      View Testing
                    </Link>
                    <Link href="/contact" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-white/10">
                      Contact Sales
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {testingCards.map((item) => (
                    <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">{item.label}</p>
                      <p className="mt-3 text-2xl font-semibold leading-tight">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Resources */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Technical Resources
              </h2>
              <Link href="/technical-resources" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {resourceCards.map((resource) => {
                const Icon = resource.icon
                return (
                  <Link key={resource.title} href={resource.href} className="group block rounded-[1.75rem] border border-stone-200 bg-stone-50 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                    <div className="w-fit rounded-2xl bg-white p-3 shadow-sm">
                      <Icon className="h-5 w-5 text-emerald-800" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-stone-950">{resource.title}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                      View
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="mt-8 rounded-[2rem] border border-emerald-200 bg-emerald-50 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-900">Not sure which material is right for your project?</p>
                <p className="mt-1 text-sm text-emerald-700">See how NuBam stacks up against plywood, MDF, and solid wood across strength, sustainability, and cost.</p>
              </div>
              <Link
                href="/compare"
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-900"
              >
                Compare Materials
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
        </section>

        

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  Customer feedback
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  What Customers Say
                </h2>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {testimonials.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                      <Quote className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                      Verified feedback
                    </span>
                  </div>
                  <p className="mt-5 text-base leading-7 text-stone-700">"{item.testimonial}"</p>
                  <div className="mt-6 border-t border-stone-200 pt-4">
                    <p className="text-base font-semibold text-stone-950">{item.name}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trust & Credibility */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Trust & Credibility
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visualTrust.map((item) => (
              <div key={item.title} className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-64">
                  <Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xl font-semibold text-white">{item.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Material gallery */}
        <section className="border-y border-stone-200 bg-[#efe7d9]">
          <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm lg:col-span-2">
                <div className="relative h-[320px]">
                  <Image src="/Bamboo-Furniture.png" alt="Premium bamboo furniture board visual" fill className="object-cover transition duration-700 group-hover:scale-[1.05]" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
                  <div className="absolute bottom-5 left-5 max-w-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Material appeal</p>
                    <p className="mt-2 text-3xl font-semibold text-white">Premium natural finish for design-led interiors</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
                  <div className="relative h-[152px]">
                    <Image src="/Bamboo-DIY.png" alt="Decorative use" fill className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-lg font-semibold text-white">Decorative use</p>
                    </div>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
                  <div className="relative h-[152px]">
                    <Image src="/Bamboo-Board.png" alt="Project board supply" fill className="object-cover transition duration-700 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-lg font-semibold text-white">Project board supply</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="relative overflow-hidden rounded-[2rem] border border-stone-900/10 bg-stone-950 px-8 py-12 text-white shadow-xl lg:px-12 lg:py-16">
            <div className="absolute inset-0 opacity-35">
              <Image src="/Bamboo-Board.png" alt="Premium engineered bamboo board" fill className="object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />

            <div className="relative max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Next step</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to Source Bamboo Boards for Your Next Project?
              </h2>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
                <Link
                  href="/request-quote"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-stone-100"
                >
                  Request Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-sm font-semibold text-emerald-300 animate-[subtlePulse_2.5s_ease-in-out_infinite]">
                  ✦ Get a quote in 24 hours — no commitment needed.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />

      <style jsx global>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}