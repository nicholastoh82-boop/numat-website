// =============================================================================
// File: app/api/receipt/[id]/edit/route.ts
//
// Edit a payment receipt. Admin-only. Updates the receipts row and
// recomputes the linked invoice's payment_status based on the new
// cumulative receipt total. Mirrors the validation logic in
// app/api/receipt/create/route.ts.
//
// Editable fields:
//   actual_amount, actual_date, payment_method, bank_reference, notes
//
// Currency fields (actual_currency, display_currency) are NOT editable
// because they are inherited from the invoice's locked FX state.
// =============================================================================

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { pickCategoryFromInvoiceItems, pickToAccountId, upsertFinTransactionForReceipt } from "@/lib/finance/receiptToTransaction"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

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

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized: admin role required to edit receipts." },
      { status: 401 }
    )
  }

  const { id: receiptId } = await params
  if (!receiptId) {
    return NextResponse.json({ error: "Receipt id is required" }, { status: 400 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { actual_amount, actual_date, payment_method, bank_reference, notes } =
    body

  // Validate inputs
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

  // Fetch the existing receipt
  const { data: receipt, error: rErr } = await supabase
    .from("receipts")
    .select("id, quote_id, actual_amount")
    .eq("id", receiptId)
    .single()
  if (rErr || !receipt) {
    return NextResponse.json(
      { error: `Receipt not found (${receiptId})` },
      { status: 404 }
    )
  }

  // Fetch invoice + sibling receipts for cumulative recompute
  const { data: invoice, error: invErr } = await supabase
    .from("quotes")
    .select("id, quote_number, currency, display_currency, total, display_total")
    .eq("id", receipt.quote_id)
    .single()
  if (invErr || !invoice) {
    return NextResponse.json(
      { error: "Linked invoice not found" },
      { status: 404 }
    )
  }

  const invoiceBaseTotal = Number(invoice.total) || 0
  const invoiceDisplayTotal = Number(invoice.display_total ?? invoice.total) || 0
  const fxRatio =
    invoiceBaseTotal > 0 ? invoiceDisplayTotal / invoiceBaseTotal : 1
  const newDisplayAmount = round2(parsedAmount * fxRatio)

  const { data: siblings } = await supabase
    .from("receipts")
    .select("id, actual_amount")
    .eq("quote_id", receipt.quote_id)
    .is("superseded_by", null)

  const otherCumulative = (siblings || [])
    .filter((r: any) => r.id !== receiptId)
    .reduce((sum: number, r: any) => sum + Number(r.actual_amount || 0), 0)

  const newCumulative = otherCumulative + parsedAmount
  if (newCumulative > invoiceBaseTotal + 0.01) {
    return NextResponse.json(
      {
        error: `Cumulative receipts after edit (${(invoice.currency || "").toUpperCase()} ${newCumulative.toFixed(2)}) would exceed invoice total (${(invoice.currency || "").toUpperCase()} ${invoiceBaseTotal.toFixed(2)}). Other receipts already account for ${(invoice.currency || "").toUpperCase()} ${otherCumulative.toFixed(2)}.`,
      },
      { status: 400 }
    )
  }

  // Update the receipt
  const { error: updErr } = await supabase
    .from("receipts")
    .update({
      actual_amount: round2(parsedAmount),
      display_amount: newDisplayAmount,
      actual_date,
      payment_method,
      bank_reference: bank_reference || null,
      notes: notes || null,
    })
    .eq("id", receiptId)

  if (updErr) {
    return NextResponse.json(
      { error: `Failed to update receipt: ${updErr.message}` },
      { status: 500 }
    )
  }

  // Recompute invoice payment_status
  const newPaymentStatus =
    newCumulative >= invoiceBaseTotal - 0.01
      ? "paid"
      : newCumulative > 0
      ? "partial"
      : "unpaid"

  await supabase
    .from("quotes")
    .update({ payment_status: newPaymentStatus })
    .eq("id", receipt.quote_id)

  // Mirror to fin_transactions so the Finance dashboard stays accurate.
  // Idempotent: helper updates the existing row keyed by source_receipt_id.
  try {
    const { data: items } = await supabase
      .from("quote_items")
      .select("sku, total_price")
      .eq("quote_id", receipt.quote_id)

    const { data: invForName } = await supabase
      .from("quotes")
      .select("customer_name, company, quote_number, currency")
      .eq("id", receipt.quote_id)
      .single()

    const baseCurrency = (invForName?.currency || invoice.currency || "PHP").toUpperCase()
    const categoryId = pickCategoryFromInvoiceItems(items || [])
    const toAccountId = pickToAccountId(baseCurrency, payment_method)
    const customerName = invForName?.customer_name || invForName?.company || "Customer"
    const description = `Sale receipt (edited) against ${invForName?.quote_number || invoice.quote_number} (${customerName}, ${payment_method})`

    const result = await upsertFinTransactionForReceipt(
      {
        source_receipt_id: receiptId,
        transaction_date: actual_date,
        amount: round2(parsedAmount),
        currency: baseCurrency,
        to_account_id: toAccountId,
        category_id: categoryId,
        description,
        bank_reference: bank_reference || null,
        vendor_payee: customerName,
      },
      admin.email,
    )
    if (!result.ok) {
      console.error(`[receipt/edit] fin_transactions mirror failed: ${result.error}`)
    }
  } catch (e: any) {
    console.error(`[receipt/edit] fin_transactions mirror exception: ${e?.message}`)
  }

  return NextResponse.json({
    success: true,
    receipt_id: receiptId,
    actual_amount: round2(parsedAmount),
    display_amount: newDisplayAmount,
    invoice_payment_status: newPaymentStatus,
    cumulative_received: round2(newCumulative),
  })
}
