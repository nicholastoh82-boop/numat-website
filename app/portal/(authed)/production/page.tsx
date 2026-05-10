/* app/portal/(authed)/production/page.tsx
   Production landing: 5 station entry tabs + Inventory + Audit Log.
   Server gates by role; client component handles tab switching. */

import { requireRole } from '@/lib/portal/roles'
import { createClient } from '@/lib/supabase/server'
import ProductionShell from './_components/ProductionShell'

export const metadata = { title: 'Production | NUMAT Portal', robots: 'noindex, nofollow' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PortalProduction() {
  const user = await requireRole(['admin', 'ceo', 'ops'])
  const supabase = await createClient()

  // Active board variants for the board run dropdown
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku, thickness_mm, size_label, ply_count, products(name)')
    .eq('is_available', true)
    .or('sku.ilike.NUBAM%,sku.ilike.NUDOOR%,sku.ilike.NUFLOOR%,sku.ilike.%COMPOSITE%')
    .order('sku')

  // Inventory snapshot
  const { data: inv } = await supabase
    .from('prod_inventory')
    .select('product_type, variant_id, on_hand, updated_at')

  return (
    <ProductionShell
      userEmail={user.email ?? ''}
      variants={(variants ?? []) as any}
      initialInventory={(inv ?? []) as any}
    />
  )
}
