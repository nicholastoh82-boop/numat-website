'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Leaf,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import ProductGallery from '@/components/products/product-gallery'
import ProductTechnicalSheet from '@/components/products/product-technical-sheet'
import { useCurrency } from '@/components/providers/currency-provider'
import { toast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/cart-store'
import type { ProductDetail, ProductVariant } from '@/lib/products/get-product'
import {
  NUFORM_GRADES,
  PRODUCT_ORDER,
  getMarketing,
  thicknessLabel,
  type GalleryImage,
} from '@/lib/product-media'

const WHATSAPP_NUMBER = '639613076458'
const QUICK_QUANTITIES = [10, 25, 50, 100]

type ListProduct = {
  id: string
  name: string
  slug: string
  starting_price_php: number | null
  variants: Array<{ base_price_php: number | null; is_available?: boolean; is_price_on_request?: boolean }>
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load')
  return res.json()
}

/** Priced only when active (already filtered server side), available and not on request. */
function livePrice(variant: ProductVariant | null | undefined): number | null {
  if (!variant || !variant.is_available || variant.is_price_on_request) return null
  return typeof variant.base_price_php === 'number' && variant.base_price_php > 0
    ? variant.base_price_php
    : null
}

function minPrice(variants: ProductVariant[]): number | null {
  const prices = variants.map(livePrice).filter((p): p is number => p != null)
  return prices.length ? Math.min(...prices) : null
}

export default function ProductPageClient({ initialProduct }: { initialProduct: ProductDetail }) {
  const product = initialProduct
  const router = useRouter()
  const { formatConvertedFromPhp, currency } = useCurrency()
  const { addItem, openCart } = useCartStore()

  const marketing = getMarketing(product.slug)
  const displayName = marketing?.displayName ?? product.name

  // Only variants a customer can actually order are offered.
  const variants = useMemo(
    () => product.variants.filter((v) => v.is_available),
    [product.variants],
  )

  const grades = useMemo(
    () => Array.from(new Set(variants.map((v) => v.grade).filter((g): g is string => Boolean(g)))),
    [variants],
  )
  const [grade, setGrade] = useState<string | null>(grades[0] ?? null)

  const gradeVariants = useMemo(
    () => (grade ? variants.filter((v) => v.grade === grade) : variants),
    [variants, grade],
  )

  const defaultVariant =
    gradeVariants.find((v) => v.thickness_mm === 12 && livePrice(v) != null) ??
    gradeVariants.find((v) => livePrice(v) != null) ??
    gradeVariants[0] ??
    null
  const [variantId, setVariantId] = useState<string | null>(defaultVariant?.id ?? null)
  const variant = gradeVariants.find((v) => v.id === variantId) ?? defaultVariant

  const moq = Math.max(1, variant?.min_order_qty ?? product.min_order_qty ?? 1)
  const [quantity, setQuantity] = useState(moq)
  const safeQty = Math.max(moq, quantity || 0)

  const unitPrice = livePrice(variant)
  const fromPrice = minPrice(variants)
  const gradeInfo = NUFORM_GRADES.find((g) => g.grade === grade)
  const itemName = gradeInfo ? gradeInfo.name : displayName

  // Curated gallery first, then anything uploaded through admin, without repeats.
  const gallery: GalleryImage[] = useMemo(() => {
    const curated = marketing?.gallery ?? []
    const uploaded = [
      ...(variant?.images ?? []),
      ...product.images,
    ].map((img) => ({ src: img.image_url, alt: img.alt_text || displayName, fit: 'cover' as const }))
    const fallback = product.image_url ? [{ src: product.image_url, alt: displayName, fit: 'cover' as const }] : []
    const seen = new Set<string>()
    return [...curated, ...uploaded, ...(curated.length || uploaded.length ? [] : fallback)].filter((img) => {
      if (!img.src || seen.has(img.src)) return false
      seen.add(img.src)
      return true
    })
  }, [marketing, variant, product.images, product.image_url, displayName])

  const { data: allProducts } = useSWR<ListProduct[]>('/api/products', fetcher)
  const related = (allProducts ?? [])
    .filter((p) => p.slug !== product.slug && (PRODUCT_ORDER as readonly string[]).includes(p.slug))
    .sort((a, b) => PRODUCT_ORDER.indexOf(a.slug as never) - PRODUCT_ORDER.indexOf(b.slug as never))

  function selectGrade(next: string) {
    setGrade(next)
    const pool = variants.filter((v) => v.grade === next)
    const keep = pool.find((v) => v.thickness_mm === variant?.thickness_mm)
    const pick = keep ?? pool.find((v) => livePrice(v) != null) ?? pool[0]
    setVariantId(pick?.id ?? null)
  }

  function addToOrder(goToCheckout: boolean) {
    if (!variant) return
    const thickness = thicknessLabel(variant.size_label, variant.thickness_mm)
    addItem({
      id: variant.id,
      variantId: variant.id,
      sku: variant.sku,
      name: itemName,
      specs: [
        thickness && `Thickness: ${thickness}`,
        'Sheet: 2440 x 1220 mm',
        `MOQ: ${moq} boards`,
      ]
        .filter(Boolean)
        .join(' | '),
      quantity: safeQty,
      unitPrice,
      minOrderQty: moq,
      unit: variant.unit || 'piece',
      imageUrl: gallery[0]?.src ?? product.image_url,
      isPriceOnRequest: unitPrice == null,
      family: product.slug,
      thickness,
      dimensions: '2440 x 1220 mm',
    })

    if (goToCheckout) {
      router.push('/request-quote')
      return
    }
    toast({
      title: 'Added to your order',
      description: `${safeQty} x ${itemName}${thickness ? `, ${thickness}` : ''}`,
    })
    openCart()
  }

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hello NUMAT, I would like to order ${itemName}${variant ? ` (${thicknessLabel(variant.size_label, variant.thickness_mm)})` : ''}. Quantity: ${safeQty} boards.`,
  )}`

  const total = unitPrice != null ? unitPrice * safeQty : null

  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f1]">
      <Header />
      <CartDrawer />

      <main className="flex-1 pb-28 text-stone-900 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-10">
          <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-stone-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-stone-900">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/products" className="hover:text-stone-900">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-stone-900">{itemName}</span>
          </nav>

          {/* Gallery and buy box */}
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ProductGallery images={gallery} priority />
            </div>

            <div>
              {marketing?.badge && (
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
                  {marketing.badge}
                </span>
              )}
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
                {itemName}
              </h1>
              {marketing?.tagline && (
                <p className="mt-2 text-lg font-medium text-emerald-900">{marketing.tagline}</p>
              )}
              <p className="mt-4 text-base leading-7 text-stone-600">
                {marketing?.pitch ?? product.description}
              </p>

              {fromPrice != null && (
                <p className="mt-5 text-sm text-stone-600">
                  From{' '}
                  <span className="text-2xl font-semibold text-stone-950">{formatConvertedFromPhp(fromPrice)}</span>{' '}
                  per board
                </p>
              )}

              <div className="mt-6 space-y-6 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                {grades.length > 1 && (
                  <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-stone-900">Choose your board</legend>
                    <div className="grid grid-cols-2 gap-3">
                      {grades.map((g) => {
                        const info = NUFORM_GRADES.find((x) => x.grade === g)
                        const active = g === grade
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => selectGrade(g)}
                            aria-pressed={active}
                            className={`rounded-2xl border-2 p-4 text-left transition ${
                              active ? 'border-emerald-800 bg-emerald-50' : 'border-stone-200 hover:border-stone-400'
                            }`}
                          >
                            <span className="block text-base font-semibold text-stone-950">{info?.name ?? g}</span>
                            <span className="mt-1 block text-xs leading-5 text-stone-600">{info?.promise}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )}

                {gradeVariants.length > 0 && (
                  <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-stone-900">
                      Thickness <span className="font-normal text-stone-500">(2440 x 1220 mm sheet)</span>
                    </legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {gradeVariants.map((v) => {
                        const active = v.id === variant?.id
                        const price = livePrice(v)
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVariantId(v.id)}
                            aria-pressed={active}
                            className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                              active ? 'border-emerald-800 bg-emerald-50' : 'border-stone-200 hover:border-stone-400'
                            }`}
                          >
                            <span className="block text-sm font-semibold text-stone-950">
                              {thicknessLabel(v.size_label, v.thickness_mm)}
                            </span>
                            <span className="block text-xs text-stone-600">
                              {price != null ? formatConvertedFromPhp(price) : 'Price on request'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )}

                <div>
                  <p className="mb-3 text-sm font-semibold text-stone-900">Quantity (boards)</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-stone-300 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(moq, safeQty - 1))}
                        disabled={safeQty <= moq}
                        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-stone-100 disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={quantity === 0 ? '' : String(quantity)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, '')
                          setQuantity(digits === '' ? 0 : Math.min(100000, parseInt(digits, 10)))
                        }}
                        onBlur={() => setQuantity(safeQty)}
                        aria-label="Quantity in boards"
                        className="w-16 bg-transparent text-center text-base font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(safeQty + 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-stone-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUANTITIES.filter((q) => q >= moq).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuantity(q)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            safeQty === q ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 text-stone-700 hover:border-stone-500'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Minimum order {moq} boards per thickness.</p>
                </div>

                <div className="rounded-2xl bg-stone-50 p-4">
                  <div className="flex items-baseline justify-between gap-3 text-sm text-stone-600">
                    <span>
                      {unitPrice != null ? `${formatConvertedFromPhp(unitPrice)} x ${safeQty} boards` : `${safeQty} boards`}
                    </span>
                  </div>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-stone-950">
                    {total != null ? formatConvertedFromPhp(total) : 'Price on request'}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {total != null
                      ? `Ex works price, delivery quoted separately.${currency !== 'PHP' ? ' Converted from PHP at the rate of the day.' : ''}`
                      : 'Add it to your order and we will confirm the price with you.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => addToOrder(false)}
                    disabled={!variant}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-stone-950 bg-white px-5 py-3.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-50 disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to order
                  </button>
                  <button
                    type="button"
                    onClick={() => addToOrder(true)}
                    disabled={!variant}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:opacity-50"
                  >
                    Order now
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  Prefer to chat? Order on WhatsApp
                </a>
              </div>

              <ul className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
                <li className="flex items-center gap-2"><Factory className="h-4 w-4 text-emerald-800" /> Made in Bukidnon, Philippines</li>
                <li className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald-800" /> Low minimum order: {moq} boards</li>
                <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-800" /> Delivery quoted to your site</li>
                <li className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-800" /> No payment until we confirm</li>
              </ul>
            </div>
          </div>

          {/* Why buyers choose it */}
          {marketing && (
            <section className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm lg:p-8">
                <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Why buyers choose {displayName}</h2>
                <ul className="mt-5 space-y-3">
                  {marketing.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-base leading-7 text-stone-700">
                      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.75rem] bg-emerald-900 p-6 text-white lg:p-8">
                <h2 className="text-2xl font-semibold tracking-tight">Best for</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {marketing.bestFor.map((item) => (
                    <span key={item} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-8 flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-white/85">
                  <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  Bamboo matures in 3 to 5 years, against 20 to 40 years for traditional timber.
                </div>
              </div>
            </section>
          )}

          {/* Completed deliveries */}
          {marketing?.deliveries && marketing.deliveries.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Completed deliveries</h2>
              <p className="mt-2 text-stone-600">{displayName} delivered to real projects.</p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {marketing.deliveries.map((d) => (
                  <figure key={d.client} className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
                    <div className="relative aspect-[16/9]">
                      <Image src={d.src} alt={d.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                    </div>
                    <figcaption className="flex items-center justify-between gap-3 px-5 py-4">
                      <span className="text-lg font-semibold text-stone-950">{d.client}</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                        Delivered
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* NuForm vs NuForm Lite */}
          {grades.length > 1 && (
            <section className="mt-16">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-950">NuForm or NuForm Lite?</h2>
              <p className="mt-2 max-w-2xl text-stone-600">
                Same engineered bamboo, same phenolic film on both faces. Pick the board that fits your pour.
              </p>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {NUFORM_GRADES.map((g) => {
                  const price = minPrice(variants.filter((v) => v.grade === g.grade))
                  const thicknesses = variants
                    .filter((v) => v.grade === g.grade)
                    .map((v) => thicknessLabel(v.size_label, v.thickness_mm))
                  const active = g.grade === grade
                  return (
                    <div
                      key={g.grade}
                      className={`rounded-[1.75rem] border-2 bg-white p-6 shadow-sm ${active ? 'border-emerald-800' : 'border-stone-200'}`}
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-800">{g.promise}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-stone-950">{g.name}</h3>
                      <dl className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
                          <dt className="text-stone-500">Best application</dt>
                          <dd className="text-right font-medium">{g.bestFor}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
                          <dt className="text-stone-500">Key advantage</dt>
                          <dd className="text-right font-medium">{g.advantage}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
                          <dt className="text-stone-500">Bending strength</dt>
                          <dd className="text-right font-medium">{g.strength}</dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-stone-100 pb-3">
                          <dt className="text-stone-500">Thicknesses</dt>
                          <dd className="text-right font-medium">{thicknesses.join(', ') || 'On request'}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-stone-500">Price</dt>
                          <dd className="text-right font-semibold text-stone-950">
                            {price != null ? `From ${formatConvertedFromPhp(price)}` : 'On request'}
                          </dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        onClick={() => {
                          selectGrade(g.grade)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                      >
                        Choose {g.name}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Specifications */}
          {marketing && (
            <section className="mt-16 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm lg:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Specifications</h2>
              <dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
                {[
                  ...marketing.specs,
                  {
                    label: 'Thicknesses available',
                    value:
                      Array.from(new Set(variants.map((v) => thicknessLabel(v.size_label, v.thickness_mm)))).join(', ') ||
                      'On request',
                  },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-6 border-b border-stone-100 py-3 text-sm">
                    <dt className="text-stone-500">{row.label}</dt>
                    <dd className="text-right font-medium text-stone-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="mt-8 space-y-8">
            <ProductTechnicalSheet slug={product.slug} hideSpecs />
          </div>

          {/* How ordering works */}
          <section className="mt-16 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm lg:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950">How ordering works</h2>
            <ol className="mt-6 grid gap-5 md:grid-cols-3">
              {[
                { icon: ShoppingBag, title: 'Build your order', body: 'Pick your boards, thicknesses and quantities. Prices and totals update as you go.' },
                { icon: ClipboardCheck, title: 'We confirm', body: 'Our team confirms stock, delivery cost to your site and payment details with you.' },
                { icon: Truck, title: 'Pay and receive', body: 'Once you approve, you pay and we produce and dispatch your boards.' },
              ].map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="rounded-2xl bg-stone-50 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">{i + 1}</span>
                    <Icon className="h-5 w-5 text-emerald-800" />
                  </div>
                  <h3 className="mt-4 font-semibold text-stone-950">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Rest of the range */}
          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950">Complete your order</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {related.map((p) => {
                  const m = getMarketing(p.slug)
                  const prices = p.variants
                    .filter((v) => v.is_available !== false && !v.is_price_on_request && v.base_price_php)
                    .map((v) => Number(v.base_price_php))
                  const from = prices.length ? Math.min(...prices) : null
                  return (
                    <div key={p.id} className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
                      {m && <ProductGallery images={m.gallery} compact />}
                      <div className="flex items-end justify-between gap-4 p-5">
                        <div>
                          <h3 className="text-xl font-semibold text-stone-950">{m?.displayName ?? p.name}</h3>
                          <p className="text-sm text-stone-600">{m?.tagline}</p>
                          {from != null && (
                            <p className="mt-2 text-sm text-stone-600">
                              From <span className="font-semibold text-stone-950">{formatConvertedFromPhp(from)}</span>
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/products/${p.slug}`}
                          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
                        >
                          Shop
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        {/* Mobile order bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-stone-500">
                {safeQty} x {itemName}
              </p>
              <p className="truncate text-lg font-semibold text-stone-950">
                {total != null ? formatConvertedFromPhp(total) : 'Price on request'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => addToOrder(false)}
              disabled={!variant}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to order
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
