'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, CheckCircle2, ClipboardCheck, MessageCircle, ShoppingBag, Truck } from 'lucide-react'
import ProductGallery from '@/components/products/product-gallery'
import { useCurrency } from '@/components/providers/currency-provider'
import { PRODUCT_ORDER, getMarketing } from '@/lib/product-media'

type Variant = {
  id: string
  base_price_php: number | null
  is_price_on_request?: boolean
  is_available?: boolean
  is_active?: boolean
  thickness_mm?: number | null
  grade?: string | null
}

type ShopProduct = {
  id: string
  name: string
  slug: string
  description?: string
  variants: Variant[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()
}

/** Lowest live price: active and available variants only, never on request. */
function fromPrice(variants: Variant[]): number | null {
  const prices = variants
    .filter((v) => v.is_active !== false && v.is_available !== false && !v.is_price_on_request)
    .map((v) => Number(v.base_price_php))
    .filter((n) => Number.isFinite(n) && n > 0)
  return prices.length ? Math.min(...prices) : null
}

export function ProductsContent({
  initialProducts,
}: {
  initialProducts: ShopProduct[]
  initialCategories?: unknown[]
}) {
  const { formatConvertedFromPhp, currency } = useCurrency()
  const { data } = useSWR<ShopProduct[]>('/api/products', fetcher, { fallbackData: initialProducts })

  const products = (Array.isArray(data) ? data : initialProducts)
    .filter((p) => (PRODUCT_ORDER as readonly string[]).includes(p.slug))
    .sort((a, b) => PRODUCT_ORDER.indexOf(a.slug as never) - PRODUCT_ORDER.indexOf(b.slug as never))

  return (
    <div className="bg-[#faf7f1] text-stone-900">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Shop</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            Engineered bamboo boards, priced and ready to order
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
            Made in Bukidnon from Philippine bamboo. Standard 4 by 8 ft sheets, live prices, and a minimum
            order of just 10 boards.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {products.map((product, index) => {
            const m = getMarketing(product.slug)
            const price = fromPrice(product.variants ?? [])
            const featured = index === 0
            return (
              <article
                key={product.id}
                className={`flex flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-sm transition hover:shadow-lg ${
                  featured ? 'border-emerald-800 lg:col-span-3 lg:grid lg:grid-cols-[1.1fr_0.9fr]' : 'border-stone-200'
                }`}
              >
                <div className="relative p-3">
                  {m && <ProductGallery images={m.gallery} compact priority={featured} />}
                  {m?.badge && (
                    <span className="absolute left-6 top-6 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
                      {m.badge}
                    </span>
                  )}
                </div>

                <div className={`flex flex-1 flex-col p-6 ${featured ? 'lg:justify-center lg:p-10' : ''}`}>
                  <h2 className={`${featured ? 'text-4xl' : 'text-2xl'} font-semibold tracking-tight text-stone-950`}>
                    {m?.displayName ?? product.name}
                  </h2>
                  {m?.alsoAvailable && (
                    <p className="mt-1 text-sm font-semibold text-amber-800">{m.alsoAvailable}</p>
                  )}
                  {m?.tagline && <p className="mt-1 font-medium text-emerald-900">{m.tagline}</p>}
                  {featured && m?.pitch && <p className="mt-4 leading-7 text-stone-600">{m.pitch}</p>}

                  {m && (
                    <ul className="mt-5 space-y-2">
                      {m.highlights.slice(0, featured ? 4 : 3).map((h) => (
                        <li key={h} className="flex items-start gap-2 text-sm leading-6 text-stone-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}

                  {featured && (
                    <p className="mt-5 text-sm text-stone-600">
                      Choose <span className="font-semibold text-stone-900">NuForm</span> for the most pours, or{' '}
                      <span className="font-semibold text-stone-900">NuForm Lite</span> for lighter, lower cost
                      forming. Both on one page.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-stone-500">From</p>
                      <p className="text-2xl font-semibold text-stone-950">
                        {price != null ? formatConvertedFromPhp(price) : 'Price on request'}
                        {price != null && <span className="ml-1 text-sm font-normal text-stone-500">per board</span>}
                      </p>
                    </div>
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900"
                    >
                      Shop {m?.displayName ?? product.name}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mt-4 text-xs text-stone-500">
          Ex works prices per 2440 x 1220 mm sheet, delivery quoted separately.
          {currency !== 'PHP' ? ' Converted from PHP at the rate of the day.' : ''}
        </p>

        {/* Which board */}
        <section className="mt-14 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
          <h2 className="px-6 pt-6 text-2xl font-semibold tracking-tight text-stone-950 lg:px-8">Which board do I need?</h2>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[560px] text-left text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  <th className="px-6 py-3 font-medium lg:px-8">If you are</th>
                  <th className="px-6 py-3 font-medium">Choose</th>
                  <th className="px-6 py-3 font-medium">From</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { need: 'Casting slabs, beams, walls or columns (NuForm Lite for lighter, standard work)', slug: 'nuform' },
                  { need: 'Cladding a feature wall or ceiling indoors', slug: 'nuweave' },
                  { need: 'Building cabinets, furniture or joinery instead of MDF', slug: 'nuhybrid' },
                ].map((row) => {
                  const p = products.find((x) => x.slug === row.slug)
                  const m = getMarketing(row.slug)
                  const price = p ? fromPrice(p.variants ?? []) : null
                  return (
                    <tr key={row.slug} className="border-t border-stone-100">
                      <td className="px-6 py-4 text-stone-700 lg:px-8">{row.need}</td>
                      <td className="px-6 py-4">
                        <Link href={`/products/${row.slug}`} className="font-semibold text-emerald-800 hover:underline">
                          {m?.displayName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium text-stone-900">
                        {price != null ? formatConvertedFromPhp(price) : 'On request'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* How ordering works */}
        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { icon: ShoppingBag, title: 'Build your order', body: 'Choose boards, thicknesses and quantities with live prices.' },
            { icon: ClipboardCheck, title: 'We confirm', body: 'We confirm stock, delivery cost and payment details with you.' },
            { icon: Truck, title: 'Pay and receive', body: 'Approve, pay, and we dispatch your boards to site.' },
          ].map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">{i + 1}</span>
                <Icon className="h-5 w-5 text-emerald-800" />
              </div>
              <h3 className="mt-4 font-semibold text-stone-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </section>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[1.75rem] bg-emerald-900 px-6 py-6 text-white sm:flex-row sm:items-center lg:px-8">
          <div>
            <p className="text-lg font-semibold">Ordering for a big project?</p>
            <p className="text-sm text-white/75">Talk to us about large orders and delivery schedules.</p>
          </div>
          <a
            href="https://wa.me/639613076458?text=Hello%20NUMAT%2C%20I%20would%20like%20to%20discuss%20a%20volume%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
