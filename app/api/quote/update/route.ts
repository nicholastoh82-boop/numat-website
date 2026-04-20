// ============================================================================
// File: app/api/quote/update/route.ts
//
// Server-side update for UNSENT draft quotes (proforma or invoice).
// Routes client Edit through service_role to avoid trigger/write inconsistencies.
//
// Constraints:
//   - Only unsent drafts editable (sent quotes must use Revise)
//   - Superseded quotes not editable
//   - Reps can only edit their own drafts or drafts on leads assigned to them
//   - FX preserved: display_total rescaled proportionally to new base total
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function getAuthenticatedCrmUser() {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user?.email) return null
    const { data } = await supabase.from("crm_users").select("*").eq("email", user.email).single()
    if (!data || !data.is_active) return null
    return data
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const crmUser = await getAuthenticatedCrmUser()
  if (!crmUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { quote_id, notes, items, customer_tin, customer_address, payment_due_date, po_reference, vat_enabled = false, vat_rate = 12.0 } = body

    if (!quote_id || typeof quote_id !== "string") {
      return NextResponse.json({ error: "quote_id required" }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one line item required" }, { status: 400 })
    }

    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("id, quote_number, doc_type, sent_at, superseded_by, currency, display_currency, display_total, total, lead_id, generated_by")
      .eq("id", quote_id)
      .single()
    if (qErr || !quote) return NextResponse.json({ error: "quote not found" }, { status: 404 })
    if (quote.sent_at) return NextResponse.json({ error: "Cannot edit a sent quote. Use Revise instead." }, { status: 400 })
    if (quote.superseded_by) return NextResponse.json({ error: "Cannot edit a superseded quote." }, { status: 400 })

    if (crmUser.role !== "admin") {
      const ownsAsGenerator = quote.generated_by === crmUser.email
      if (!ownsAsGenerator) {
        const { data: lead } = await supabase.from("master_leads").select("rep_email").eq("id", quote.lead_id).single()
        if (!lead || lead.rep_email !== crmUser.email) {
          return NextResponse.json({ error: "Not authorized to edit this quote." }, { status: 403 })
        }
      }
    }

    const isInvoice = quote.doc_type === "invoice"

    let subtotal = 0
    for (const i of items) {
      subtotal += Number(i.quantity || 0) * Number(i.unit_price || 0)
    }
    const vatAmount = isInvoice && vat_enabled ? subtotal * (Number(vat_rate) / 100) : 0
    const total = Math.round((subtotal + vatAmount) * 100) / 100

    let displayTotal: number | null = null
    const oldTotal = Number(quote.total) || 0
    const oldDisplay = Number(quote.display_total) || 0
    if (quote.display_currency && oldDisplay > 0 && oldTotal > 0) {
      displayTotal = Math.round(total * (oldDisplay / oldTotal) * 100) / 100
    }

    const updatePayload: Record<string, any> = {
      notes: notes || null,
      subtotal: Math.round(subtotal * 100) / 100,
      total,
      vat_amount: Math.round(vatAmount * 100) / 100,
    }
    if (isInvoice) {
      updatePayload.customer_tin = customer_tin || null
      updatePayload.customer_address = customer_address || null
      updatePayload.payment_due_date = payment_due_date || null
      updatePayload.po_reference = po_reference || null
      updatePayload.vat_enabled = vat_enabled
      updatePayload.vat_rate = vat_rate
    }
    if (displayTotal !== null) updatePayload.display_total = displayTotal

    const { error: updErr } = await supabase.from("quotes").update(updatePayload).eq("id", quote_id)
    if (updErr) throw new Error(`update quote: ${updErr.message}`)

    const { error: delErr } = await supabase.from("quote_items").delete().eq("quote_id", quote_id)
    if (delErr) throw new Error(`delete old items: ${delErr.message}`)

    const rows = items.map((i: any) => {
      const qty = Number(i.quantity || 0)
      const price = Number(i.unit_price || 0)
      if (i.is_custom || !i.product_id) {
        return {
          quote_id, product_id: null, variant_id: null,
          product_name: i.product_name || "Custom Order",
          product_specs: i.product_specs || null,
          sku: i.sku || "CUSTOM",
          category: i.category || "Custom",
          unit: i.unit || "piece",
          quantity: qty, unit_price: price, total_price: qty * price,
        }
      }
      return {
        quote_id, product_id: null, variant_id: i.product_id,
        product_name: i.product_name || i.sku,
        product_specs: i.product_specs || null,
        sku: i.sku,
        category: i.category || null,
        unit: i.unit || "piece",
        quantity: qty, unit_price: price, total_price: qty * price,
      }
    })
    const { error: insErr } = await supabase.from("quote_items").insert(rows)
    if (insErr) throw new Error(`insert new items: ${insErr.message}`)

    return NextResponse.json({
      ok: true, quote_id, quote_number: quote.quote_number,
      subtotal: Math.round(subtotal * 100) / 100, total,
      vat_amount: Math.round(vatAmount * 100) / 100,
      display_total: displayTotal, display_currency: quote.display_currency,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unknown error" }, { status: 500 })
  }
}
