// ============================================================================
// File: app/api/quote/delete/route.ts
//
// Hard-delete an UNSENT, non-superseded draft quote (and its quote_items).
//
// Use case: rep issued a Proforma or Invoice against the wrong lead. Before
// it's sent out there's no reason to keep the record — a hard delete is
// cleaner than a soft delete for a pure mistake.
//
// Safety:
//   - Sent quotes: refused (they're out there, must Revise instead)
//   - Superseded quotes: refused (they're part of the revision audit trail)
//   - Proformas with child invoices: refused (would orphan the children)
//   - Invoices with receipts: refused (would orphan payment records)
//   - Quotes with revisions: refused (would orphan the revision chain)
//
// Reps can only delete their own drafts or drafts on leads assigned to them.
// Admins can delete any eligible draft.
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
    const { quote_id, reason } = body

    if (!quote_id || typeof quote_id !== "string") {
      return NextResponse.json({ error: "quote_id required" }, { status: 400 })
    }

    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("id, quote_number, doc_type, sent_at, superseded_by, lead_id, generated_by")
      .eq("id", quote_id)
      .single()
    if (qErr || !quote) return NextResponse.json({ error: "quote not found" }, { status: 404 })
    if (quote.sent_at) {
      return NextResponse.json({ error: "Cannot delete a sent quote. Revise it instead." }, { status: 400 })
    }
    if (quote.superseded_by) {
      return NextResponse.json({ error: "Cannot delete a superseded quote (audit trail)." }, { status: 400 })
    }

    if (crmUser.role !== "admin") {
      const ownsAsGenerator = quote.generated_by === crmUser.email
      if (!ownsAsGenerator) {
        const { data: lead } = await supabase.from("master_leads").select("rep_email").eq("id", quote.lead_id).single()
        if (!lead || lead.rep_email !== crmUser.email) {
          return NextResponse.json({ error: "Not authorized to delete this quote." }, { status: 403 })
        }
      }
    }

    // Safety: proforma with child invoices
    const { count: childCount } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("converted_from_proforma_id", quote_id)
    if ((childCount || 0) > 0) {
      return NextResponse.json({
        error: `Cannot delete: this proforma has ${childCount} child invoice(s). Delete those first.`
      }, { status: 400 })
    }

    // Safety: invoice with receipts (shouldn't happen for unsent, but belt-and-suspenders)
    const { count: receiptCount } = await supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quote_id)
    if ((receiptCount || 0) > 0) {
      return NextResponse.json({
        error: `Cannot delete: this quote has ${receiptCount} receipt(s).`
      }, { status: 400 })
    }

    // Safety: quote is the ancestor of some revision chain
    const { count: revisionCount } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("revision_of", quote_id)
    if ((revisionCount || 0) > 0) {
      return NextResponse.json({
        error: `Cannot delete: this quote has ${revisionCount} revision(s).`
      }, { status: 400 })
    }

    // Hard delete: items first, then the quote
    const { error: delItemsErr } = await supabase.from("quote_items").delete().eq("quote_id", quote_id)
    if (delItemsErr) throw new Error(`delete items: ${delItemsErr.message}`)

    const { error: delErr } = await supabase.from("quotes").delete().eq("id", quote_id)
    if (delErr) throw new Error(`delete quote: ${delErr.message}`)

    return NextResponse.json({
      ok: true,
      quote_id,
      quote_number: quote.quote_number,
      doc_type: quote.doc_type,
      deleted_by: crmUser.email,
      reason: reason || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unknown error" }, { status: 500 })
  }
}
