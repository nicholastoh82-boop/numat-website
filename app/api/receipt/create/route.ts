// =============================================================================
// File: app/api/receipt/create/route.ts
//
// Commit C: Issue a Payment Receipt (commercial acknowledgment) against a sent
// invoice. Admin-only. Creates a receipts row and updates the linked invoice's
// payment_status to either "paid" (fully paid) or "partial" (amount received
// is less than the invoice total).
//
// Env vars required:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =============================================================================

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

// Verify the caller is an ACTIVE, ADMIN crm_user via the Supabase session cookie.
// Receipts are business-critical and affect invoice payment status, so this
// gate is strictly server-side (in addition to UI gating in the dashboard).
async function getAuthenticatedAdmin(): Promise<{ email: string } | null> {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )
    const {
      data: { user },
    } = await authClient.auth.getUser()
    if (!user?.email) return null

    const { data: crmUser } = await supabase
      .from("crm_users")
      .select("email, role, is_active")
      .eq("email", user.email)
      .single()

    if (!crmUser?.is_active || crmUser.role !== "admin") return null
    return { email: crmUser.email }
  } catch {
    return null
  }
}

const VALID_PAYMENT_METHODS = [
  "wire_transfer",
  "bank_deposit",
  "check",
  "gcash",
  "paymaya",
  "cash",
  "other",
]

export async function POST(req: Request) {
  // 1. Admin auth
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized: admin role required to issue receipts." },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const {
      quote_id,
      actual_amount,
      actual_date,
      payment_method,
      bank_reference,
      notes,
    } = body

    // 2. Payload validation
    if (!quote_id) {
      return NextResponse.json(
        { error: "quote_id is required" },
        { status: 400 }
      )
    }
    const parsedAmount = Number(actual_amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "actual_amount must be a positive number" },
        { status: 400 }
      )
    }
    if (!actual_date || !/^\d{4}-\d{2}-\d{2}/.test(String(actual_date))) {
      return NextResponse.json(
        { error: "actual_date must be a date string (YYYY-MM-DD)" },
        { status: 400 }
      )
    }
    if (!payment_method || !VALID_PAYMENT_METHODS.includes(payment_method)) {
      return NextResponse.json(
        {
          error: `payment_method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // 3. Fetch the linked invoice
    const { data: invoice, error: invErr } = await supabase
      .from("quotes")
      .select(
        "id, quote_number, doc_type, sent_at, currency, display_currency, total, display_total, payment_status, lead_id, customer_name, company, email"
      )
      .eq("id", quote_id)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json(
        { error: `Invoice not found (${quote_id})` },
        { status: 404 }
      )
    }

    // 4. Validate invoice is eligible for receipt issuance
    if (invoice.doc_type !== "invoice") {
      return NextResponse.json(
        {
          error: "Receipts can only be issued against invoices, not proformas.",
        },
        { status: 400 }
      )
    }
    if (!invoice.sent_at) {
      return NextResponse.json(
        {
          error:
            "Cannot issue a receipt for an unsent invoice. Send the invoice to the customer first.",
        },
        { status: 400 }
      )
    }
    if (invoice.payment_status === "paid") {
      return NextResponse.json(
        {
          error: `Invoice ${invoice.quote_number} is already marked paid. Issue a new invoice if additional payment is being acknowledged.`,
        },
        { status: 400 }
      )
    }

    // 5. Compute display_amount using the invoice's LOCKED FX rate
    //    The invoice has display_currency + display_total set (and locked) since
    //    it was either sent or converted from a proforma. We preserve that
    //    exchange rate on the receipt so the customer sees consistent numbers
    //    across invoice and receipt.
    const invoiceBaseTotal = Number(invoice.total) || 0
    const invoiceDisplayTotal = Number(invoice.display_total ?? invoice.total) || 0
    const invoiceBaseCurrency = (invoice.currency || "USD").toUpperCase()
    const invoiceDisplayCurrency = (invoice.display_currency || invoiceBaseCurrency).toUpperCase()

    // fx_ratio = display / base — the exact rate locked at invoice send-time
    const fxRatio =
      invoiceBaseTotal > 0 ? invoiceDisplayTotal / invoiceBaseTotal : 1
    const displayAmount = round2(parsedAmount * fxRatio)

    // 6. Guardrail: cumulative receipts on this invoice must not exceed its total
    const { data: existingReceipts } = await supabase
      .from("receipts")
      .select("actual_amount")
      .eq("quote_id", quote_id)
      .is("superseded_by", null)

    const cumulative = (existingReceipts || []).reduce(
      (sum: number, r: any) => sum + Number(r.actual_amount || 0),
      0
    )
    if (cumulative + parsedAmount > invoiceBaseTotal + 0.01) {
      return NextResponse.json(
        {
          error: `Cumulative receipts (${invoiceBaseCurrency} ${(cumulative + parsedAmount).toFixed(2)}) would exceed invoice total (${invoiceBaseCurrency} ${invoiceBaseTotal.toFixed(2)}). Previously acknowledged: ${invoiceBaseCurrency} ${cumulative.toFixed(2)}.`,
        },
        { status: 400 }
      )
    }

    // 7. Create the receipt
    const { data: receipt, error: receiptErr } = await supabase
      .from("receipts")
      .insert([
        {
          quote_id,
          actual_amount: round2(parsedAmount),
          actual_currency: invoiceBaseCurrency,
          display_amount: displayAmount,
          display_currency: invoiceDisplayCurrency,
          actual_date,
          payment_method,
          bank_reference: bank_reference || null,
          notes: notes || null,
          issued_by: admin.email,
        },
      ])
      .select("id, receipt_number, created_at")
      .single()

    if (receiptErr || !receipt) {
      return NextResponse.json(
        { error: `Failed to create receipt: ${receiptErr?.message}` },
        { status: 500 }
      )
    }

    // 8. Update the invoice's payment_status
    //    fully paid when cumulative matches invoice total (within rounding tolerance)
    //    partial when receipts exist but do not yet cover the full amount
    const newCumulative = cumulative + parsedAmount
    const newPaymentStatus =
      newCumulative >= invoiceBaseTotal - 0.01 ? "paid" : "partial"

    const { error: updErr } = await supabase
      .from("quotes")
      .update({ payment_status: newPaymentStatus })
      .eq("id", quote_id)

    if (updErr) {
      // Receipt already created; log but don't fail the request
      console.error(
        `[receipt/create] Failed to update invoice payment_status: ${updErr.message}`
      )
    }

    return NextResponse.json({
      success: true,
      receipt_id: receipt.id,
      receipt_number: receipt.receipt_number,
      invoice_number: invoice.quote_number,
      actual_amount: round2(parsedAmount),
      actual_currency: invoiceBaseCurrency,
      display_amount: displayAmount,
      display_currency: invoiceDisplayCurrency,
      invoice_payment_status: newPaymentStatus,
      cumulative_received: round2(newCumulative),
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    )
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
