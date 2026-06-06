/* app/portal/(authed)/production/page.tsx
   Production landing. Shows two AI tools at the top (QC Check + Forecast),
   then the 5 station entry tabs + Inventory + Audit Log below.
   Server gates by role; client component handles tab switching. */

import Link from 'next/link'
import { requireRole } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import ProductionShell from './_components/ProductionShell'

export const metadata = { title: 'Production | NUMAT Portal', robots: 'noindex, nofollow' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TOOLS = [
  {
    href: '/crm/production/qc',
    emoji: '📷',
    title: 'QC Check',
    description:
      'Photograph boards, veneers, and slats at any station. Gemini Vision flags defects in seconds and returns a PASS, NEEDS REVIEW, or REJECT verdict with defect type, location, and severity.',
    roles: 'Admin, Ops, Sales',
    cta: 'Open QC Check',
    card: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
  },
  {
    href: '/crm/production/forecast',
    emoji: '📈',
    title: 'Production Forecast',
    description:
      'Board output actuals for the last 6 months plus a 3-month forward forecast. Shows implied veneer and slat needs so purchasing can plan material orders in advance.',
    roles: 'Admin, Ops, CEO',
    cta: 'Open Forecast',
    card: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
]

export default async function PortalProduction() {
  // Sales (Bryan as COO) is included so he can use the QC tool from this page.
  // Station entry forms below are primarily for admin/ceo/ops day to day use.
  const user = await requireRole(['admin', 'ceo', 'ops', 'sales'])
  const supabase = await createClient()

  // Active board variants for the board run dropdown
  const { data: stdVariants } = await supabase
    .from('product_variants')
    .select('id, sku, thickness_mm, size_label, ply_count, products(name)')
    .eq('is_available', true)
    .or('sku.ilike.NUBAM%,sku.ilike.NUDOOR%,sku.ilike.NUFLOOR%,sku.ilike.%COMPOSITE%')
    .order('sku')

  // NuBam Hybrid variant stays is_available=false (hidden from the public site and quotes).
  // It is surfaced here only so production can log hybrid board runs.
  const { data: hybridVariants } = await supabase
    .from('product_variants')
    .select('id, sku, thickness_mm, size_label, ply_count, products(name)')
    .ilike('sku', 'NBH%')
    .order('sku')

  const variants = [...(stdVariants ?? []), ...(hybridVariants ?? [])]

  // Inventory snapshot
  const { data: inv } = await supabase
    .from('prod_inventory')
    .select('product_type, variant_id, on_hand, updated_at')

  return (
    <div>
      {/* Top: AI tools (QC + Forecast) */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {TOOLS.map((t) => (
            <div
              key={t.href}
              className={`border-2 rounded-xl p-5 flex flex-col ${t.card} transition`}
            >
              <div className="text-4xl mb-3">{t.emoji}</div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{t.title}</h2>
              <p className="text-sm text-slate-700 flex-1 mb-4">{t.description}</p>
              <div className="text-xs text-slate-500 mb-3">Access: {t.roles}</div>
              <Link
                href={t.href}
                className={`${t.btn} text-white text-sm font-semibold px-4 py-2.5 rounded-lg text-center transition`}
              >
                {t.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Below: existing station entry tabs and inventory */}
      <ProductionShell
        userEmail={user.email ?? ''}
        variants={(variants ?? []) as any}
        initialInventory={(inv ?? []) as any}
      />
    </div>
  )
}
