/* app/portal/(authed)/pricing/page.tsx
   Pricing reference for everyone in the portal. It reads the exact same rows the
   public website publishes from: products, categories and product_variants that
   are active. So this page can never disagree with the website. To change a
   price, edit it in the website product admin and it updates here too.

   Only the published sell side is shown. The internal cost and margin fields on
   the variants table (production cost, ex factory, minimum margin) are never
   selected or shown here, because this page is visible to all staff.

   White background, no hyphens or dashes per Nick's preferences. */

import { requirePortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pricing | NUMAT Portal',
  robots: 'noindex, nofollow',
}

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Category = { id: string; name: string; display_order: number | null }

type Product = {
  id: string
  name: string
  description: string | null
  unit: string | null
  base_price_usd: number | null
  is_price_on_request: boolean | null
  price_notes: string | null
  is_featured: boolean | null
  category_id: string | null
  moq: number | null
  moq_unit: string | null
}

type Variant = {
  id: string
  product_id: string
  size_label: string | null
  thickness_mm: number | null
  length_mm: number | null
  width_mm: number | null
  finish: string | null
  grade: string | null
  core_type: string | null
  ply_count: number | null
  unit: string | null
  moq: number | null
  base_price_usd: number | null
  is_price_on_request: boolean | null
  price_notes: string | null
  sort_order: number | null
  price_updated_at: string | null
}

function money(v: number | null | undefined): string {
  if (v === null || v === undefined || !(v > 0)) return ''
  return 'USD ' + Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function priceCell(onRequest: boolean | null, price: number | null, notes: string | null): string {
  if (onRequest) return notes ? 'Price on request (' + notes + ')' : 'Price on request'
  const m = money(price)
  if (!m) return notes ? notes : 'Price on request'
  return notes ? m + ' (' + notes + ')' : m
}

function spec(v: Variant): string {
  if (v.size_label && v.size_label.trim()) return v.size_label.trim()
  const parts: string[] = []
  if (v.thickness_mm) parts.push(v.thickness_mm + 'mm')
  if (v.length_mm && v.width_mm) parts.push(v.length_mm + ' by ' + v.width_mm + 'mm')
  if (v.ply_count) parts.push(v.ply_count + ' ply')
  return parts.join(', ') || 'Standard'
}

export default async function PortalPricingPage() {
  await requirePortalUser()
  const db = adminClient()

  const [{ data: products }, { data: categories }, { data: variants }] = await Promise.all([
    db
      .from('products')
      .select(
        'id, name, description, unit, base_price_usd, is_price_on_request, price_notes, is_featured, category_id, moq, moq_unit',
      )
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true }),
    db
      .from('categories')
      .select('id, name, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    db
      .from('product_variants')
      .select(
        'id, product_id, size_label, thickness_mm, length_mm, width_mm, finish, grade, core_type, ply_count, unit, moq, base_price_usd, is_price_on_request, price_notes, sort_order, price_updated_at',
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const prods = (products || []) as Product[]
  const cats = (categories || []) as Category[]
  const vars = (variants || []) as Variant[]

  const variantsByProduct = new Map<string, Variant[]>()
  for (const v of vars) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, [])
    variantsByProduct.get(v.product_id)!.push(v)
  }

  // Newest price timestamp across published variants, to show freshness.
  let lastUpdated: string | null = null
  for (const v of vars) {
    if (v.price_updated_at && (!lastUpdated || v.price_updated_at > lastUpdated)) {
      lastUpdated = v.price_updated_at
    }
  }
  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  // Group products under categories in display order, then an Other bucket.
  const catOrder = cats.slice()
  const productsByCat = new Map<string, Product[]>()
  for (const p of prods) {
    const key = p.category_id || 'none'
    if (!productsByCat.has(key)) productsByCat.set(key, [])
    productsByCat.get(key)!.push(p)
  }
  const sections: { title: string; items: Product[] }[] = []
  for (const c of catOrder) {
    const items = productsByCat.get(c.id)
    if (items && items.length) sections.push({ title: c.name, items })
  }
  const orphans = productsByCat.get('none')
  if (orphans && orphans.length) sections.push({ title: 'Other', items: orphans })

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900">Pricing</h1>
      <p className="mt-1 text-sm text-slate-600">
        These are the prices published on the NUMAT website. Anyone here can refer to them. To change
        a price, update it in the website product admin and this page updates with it.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <a
          href="/products"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
        >
          View on the website
        </a>
        {lastUpdatedLabel && (
          <span className="text-slate-500">Prices last updated on {lastUpdatedLabel}</span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        All prices are shown in USD, the figure the website publishes. On the website a visitor can
        switch the display to their own currency. Prices marked on request are quoted per enquiry.
      </div>

      {sections.length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-400">
          No published products yet. Add products in the website admin and they appear here.
        </p>
      )}

      {sections.map((section) => (
        <div key={section.title} className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {section.title}
          </h2>

          <div className="mt-3 space-y-5">
            {section.items.map((p) => {
              const pv = variantsByProduct.get(p.id) || []
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{p.name}</h3>
                        {p.is_featured && (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Featured
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        Sold per {p.unit || 'unit'}
                        {p.moq ? '. Minimum order ' + p.moq + ' ' + (p.moq_unit || p.unit || 'units') : ''}
                      </p>
                    </div>
                    {pv.length === 0 && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {priceCell(p.is_price_on_request, p.base_price_usd, p.price_notes)}
                        </div>
                        <div className="text-xs text-slate-400">per {p.unit || 'unit'}</div>
                      </div>
                    )}
                  </div>

                  {pv.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-2 pr-3 font-medium">Option</th>
                            <th className="py-2 pr-3 font-medium">Finish</th>
                            <th className="py-2 pr-3 font-medium">Grade</th>
                            <th className="py-2 pr-3 font-medium">Unit</th>
                            <th className="py-2 pl-3 text-right font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pv.map((v) => (
                            <tr key={v.id} className="border-b border-slate-100 last:border-0">
                              <td className="py-2 pr-3 text-slate-800">{spec(v)}</td>
                              <td className="py-2 pr-3 text-slate-600">{v.finish || ''}</td>
                              <td className="py-2 pr-3 text-slate-600">{v.grade || ''}</td>
                              <td className="py-2 pr-3 text-slate-600">{v.unit || p.unit || ''}</td>
                              <td className="py-2 pl-3 text-right font-medium text-slate-900">
                                {priceCell(v.is_price_on_request, v.base_price_usd, v.price_notes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
