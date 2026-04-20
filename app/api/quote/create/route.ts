import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Supports creating Proforma Invoices, standalone Invoices, and Invoices
// converted from an existing sent Proforma (deposit / balance / full).
// For converted invoices, all customer + financial fields are inherited from
// the parent proforma to guarantee consistency with the signed proforma's
// locked display values.
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      doc_type = "proforma_invoice",
      customer_name,
      company,
      email,
      phone,
      notes,
      items,
      lead_id,
      currency = "USD",
      // Invoice-specific (ignored for proforma)
      customer_tin,
      customer_address,
      payment_due_date,
      po_reference,
      vat_enabled = false,
      vat_rate = 12.0,
      generated_by,
      // Proforma-specific: deposit % the rep agreed (default 50).
      // Used when converting this proforma to a deposit invoice later.
      deposit_percent,
      // Revision tracking (set when creating a new revision of a sent quote)
      revision_of,
      revision_number,
      // Invoice lifecycle (Commit B):
      //   invoice_type: 'deposit' | 'balance' | 'full' — sets the invoice kind
      //   converted_from_proforma_id: UUID of the parent proforma being invoiced
      invoice_type,
      converted_from_proforma_id,
    } = body

    // =========================================================================
    // BRANCH: Invoice converted from a sent Proforma (deposit / balance / full)
    // =========================================================================
    if (converted_from_proforma_id && doc_type === "invoice") {
      return await handleConvertedInvoice({
        parent_id: converted_from_proforma_id,
        invoice_type,
        deposit_percent,
        generated_by,
        po_reference,
        notes,
        payment_due_date,
      })
    }

    // =========================================================================
    // BRANCH: Standalone Proforma or Invoice (original path)
    // =========================================================================
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one line item required" }, { status: 400 })
    }

    // Compute totals from line items
    let subtotal = 0
    for (const i of items) {
      const qty = Number(i.quantity || 0)
      const price = Number(i.unit_price || 0)
      subtotal += qty * price
    }
    const vatAmount = vat_enabled ? subtotal * (Number(vat_rate) / 100) : 0
    const total = subtotal + vatAmount

    // Default validity / payment windows: 30 days from today.
    // Set at creation so the PDF route doesn't need to backfill, and the CRM
    // UI / email templates always have a real date to display.
    // Callers may override payment_due_date for invoices; otherwise we default.
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10) // YYYY-MM-DD
    const effectiveValidUntil = thirtyDaysFromNow
    const effectivePaymentDueDate =
      doc_type === "invoice"
        ? payment_due_date || thirtyDaysFromNow
        : thirtyDaysFromNow

    // 1. Create quote header
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert([
        {
          doc_type,
          customer_name,
          company,
          email,
          phone,
          notes,
          lead_id,
          currency,
          subtotal,
          total,
          valid_until: effectiveValidUntil,
          customer_tin: doc_type === "invoice" ? customer_tin : null,
          customer_address: doc_type === "invoice" ? customer_address : null,
          payment_due_date: effectivePaymentDueDate,
          po_reference: doc_type === "invoice" ? po_reference : null,
          payment_status: doc_type === "invoice" ? "unpaid" : null,
          vat_enabled: Boolean(vat_enabled),
          vat_rate: Number(vat_rate),
          vat_amount: vatAmount,
          generated_by,
          revision_of: revision_of || null,
          revision_number: Number(revision_number || 0),
          // Store the rep-agreed deposit % on proformas so it pre-fills when
          // converting to a deposit invoice later. Defaults to 50 on proformas,
          // null on standalone invoices.
          deposit_percent:
            doc_type === "proforma_invoice"
              ? Number(deposit_percent ?? 50)
              : null,
        },
      ])
      .select("id, quote_number")
      .single()

    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 })
    }

    // 2. Build line items — supports both catalog items (by variant_id) and custom items
    const variantIds = items
      .filter((i: any) => i.product_id && !i.is_custom)
      .map((i: any) => i.product_id)

    let variantMap = new Map<string, any>()
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, product_id, sku, size_label, unit, moq, base_price_usd")
        .in("id", variantIds)
      variantMap = new Map(variants?.map((v: any) => [v.id, v]))
    }

    const rows = items.map((i: any) => {
      const qty = Number(i.quantity)
      const unitPrice = Number(i.unit_price || 0)

      // Custom Order line — no variant_id, no product_id
      if (i.is_custom || !i.product_id) {
        return {
          quote_id: quote.id,
          product_id: null,
          variant_id: null,
          product_name: i.product_name || "Custom Order",
          product_specs: i.product_specs || null,
          sku: i.sku || "CUSTOM",
          category: i.category || "Custom",
          unit: i.unit || "piece",
          quantity: qty,
          unit_price: unitPrice,
          total_price: qty * unitPrice,
        }
      }

      // Catalog item — lookup by variant id
      const variant = variantMap.get(i.product_id)
      if (!variant) {
        throw new Error(`Variant not found: ${i.product_id}`)
      }
      const moq = Number(variant.moq || 1)
      if (!i.moq_override && qty < moq) {
        throw new Error(`Minimum order for ${variant.sku} is ${moq}`)
      }

      return {
        quote_id: quote.id,
        product_id: variant.product_id,
        variant_id: variant.id,
        product_name: i.product_name || variant.sku,
        product_specs: i.product_specs || variant.size_label || null,
        sku: variant.sku,
        category: i.category || null,
        unit: variant.unit,
        quantity: qty,
        unit_price: unitPrice || Number(variant.base_price_usd),
        total_price: qty * (unitPrice || Number(variant.base_price_usd)),
      }
    })

    const { error: itemsError } = await supabase.from("quote_items").insert(rows)
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quote_id: quote.id,
      quote_number: quote.quote_number,
      doc_type,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// Commit B: Convert a sent Proforma to an Invoice (Deposit / Balance / Full).
//
// Design principles:
//   1. Inherit everything possible from the parent proforma (customer, TIN,
//      address, currency, lead_id, etc.) so the invoice is guaranteed to match
//      the contract the customer already signed off on.
//   2. LOCK display_currency and display_total at creation, derived from the
//      parent's already-locked values. The PDF route must never refetch FX
//      for converted invoices — the proforma's sent rate is the contractual
//      rate.
//   3. Use a single synthetic line item for Deposit and Balance invoices
//      (matches B2B accounting convention for partial-payment invoices).
//      Full invoices copy the parent's line items verbatim.
//   4. Guardrails: can't double-bill, can't exceed parent total, can't issue
//      a Full invoice if any partial invoices already exist.
// =============================================================================
async function handleConvertedInvoice({
  parent_id,
  invoice_type,
  deposit_percent,
  generated_by,
  po_reference,
  notes,
  payment_due_date,
}: {
  parent_id: string
  invoice_type: "deposit" | "balance" | "full"
  deposit_percent?: number
  generated_by?: string
  po_reference?: string
  notes?: string
  payment_due_date?: string
}) {
  if (!invoice_type || !["deposit", "balance", "full"].includes(invoice_type)) {
    return NextResponse.json(
      { error: "invoice_type must be 'deposit', 'balance', or 'full'" },
      { status: 400 }
    )
  }

  // 1. Fetch parent proforma
  const { data: parent, error: parentErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", parent_id)
    .single()

  if (parentErr || !parent) {
    return NextResponse.json(
      { error: `Parent proforma not found (${parent_id})` },
      { status: 404 }
    )
  }

  // 2. Validate parent state
  if (parent.doc_type !== "proforma_invoice") {
    return NextResponse.json(
      { error: "Can only convert proformas to invoices, not existing invoices." },
      { status: 400 }
    )
  }
  if (!parent.sent_at) {
    return NextResponse.json(
      { error: "Cannot convert an unsent proforma. Send it to the customer first." },
      { status: 400 }
    )
  }
  if (parent.superseded_by) {
    return NextResponse.json(
      {
        error:
          "This proforma has been superseded by a revision. Convert the latest revision instead.",
      },
      { status: 400 }
    )
  }

  // 3. Fetch non-superseded invoice siblings against this parent
  const { data: siblings } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, doc_type, invoice_type, total, display_total, created_at, superseded_by"
    )
    .eq("converted_from_proforma_id", parent_id)
    .is("superseded_by", null)

  const activeSiblings = (siblings || []).filter((s: any) => s.doc_type === "invoice")

  // 4. Compute amounts + build line items based on invoice_type
  const parentTotal = Number(parent.total)
  const parentDisplayTotal = Number(parent.display_total || parent.total)
  const parentCurrency: string = parent.currency
  const parentDisplayCurrency: string = parent.display_currency || parentCurrency

  let invoiceTotal: number
  let invoiceDisplayTotal: number
  let lineItems: any[] = []
  let effectiveDepositPct: number | null = null

  if (invoice_type === "deposit") {
    const pct = clamp(
      Number(deposit_percent ?? parent.deposit_percent ?? 50),
      1,
      100
    )

    // Prevent cumulative deposits from exceeding parent total
    const existingDepositAmount = activeSiblings
      .filter((s: any) => s.invoice_type === "deposit")
      .reduce((sum: number, s: any) => sum + Number(s.total), 0)
    const thisDepositAmount = parentTotal * (pct / 100)

    if (existingDepositAmount + thisDepositAmount > parentTotal + 0.01) {
      return NextResponse.json(
        {
          error: `Existing deposit invoices total ${parentCurrency} ${existingDepositAmount.toFixed(
            2
          )}. Adding a ${pct}% deposit (${parentCurrency} ${thisDepositAmount.toFixed(
            2
          )}) would exceed the proforma total (${parentCurrency} ${parentTotal.toFixed(2)}).`,
        },
        { status: 400 }
      )
    }

    invoiceTotal = round2(thisDepositAmount)
    invoiceDisplayTotal = round2(parentDisplayTotal * (pct / 100))
    effectiveDepositPct = pct

    lineItems = [
      {
        product_name: `Deposit Payment, ${pct}% of Proforma Invoice ${parent.quote_number}`,
        product_specs: `Partial payment against order total ${parentCurrency} ${parentTotal.toFixed(
          2
        )}`,
        sku: `DEPOSIT-${pct}`,
        category: "Deposit",
        unit: "payment",
        quantity: 1,
        unit_price: invoiceTotal,
      },
    ]
  } else if (invoice_type === "balance") {
    const issuedAmount = activeSiblings.reduce(
      (sum: number, s: any) => sum + Number(s.total),
      0
    )
    const issuedDisplayAmount = activeSiblings.reduce(
      (sum: number, s: any) => sum + Number(s.display_total || s.total),
      0
    )
    const remainingAmount = parentTotal - issuedAmount

    if (remainingAmount <= 0.01) {
      return NextResponse.json(
        {
          error: `Parent proforma already fully invoiced. Total ${parentCurrency} ${parentTotal.toFixed(
            2
          )}, already issued ${parentCurrency} ${issuedAmount.toFixed(2)}.`,
        },
        { status: 400 }
      )
    }

    const remainingPct = Math.max(
      1,
      Math.round((remainingAmount / parentTotal) * 100)
    )
    const depositInvoices = activeSiblings.filter(
      (s: any) => s.invoice_type === "deposit"
    )
    const depositRef =
      depositInvoices.length > 0
        ? depositInvoices.map((d: any) => d.quote_number).join(", ")
        : "prior invoices"

    invoiceTotal = round2(remainingAmount)
    invoiceDisplayTotal = round2(parentDisplayTotal - issuedDisplayAmount)

    lineItems = [
      {
        product_name: `Balance Payment, remaining ${remainingPct}% of Proforma Invoice ${parent.quote_number}`,
        product_specs: `Net of ${parentCurrency} ${issuedAmount.toFixed(
          2
        )} previously invoiced via ${depositRef}`,
        sku: `BALANCE-${remainingPct}`,
        category: "Balance",
        unit: "payment",
        quantity: 1,
        unit_price: invoiceTotal,
      },
    ]
  } else {
    // Full invoice
    if (activeSiblings.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot issue a Full Invoice because ${activeSiblings.length} invoice(s) already exist against this proforma (${activeSiblings
            .map((s: any) => s.quote_number)
            .join(", ")}). Use a Balance Invoice instead.`,
        },
        { status: 400 }
      )
    }

    invoiceTotal = round2(parentTotal)
    invoiceDisplayTotal = round2(parentDisplayTotal)

    const { data: parentItems, error: itemsErr } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", parent_id)

    if (itemsErr || !parentItems?.length) {
      return NextResponse.json(
        { error: "Parent proforma has no line items to copy." },
        { status: 400 }
      )
    }

    lineItems = parentItems.map((i: any) => ({
      product_id: i.product_id,
      variant_id: i.variant_id,
      product_name: i.product_name,
      product_specs: i.product_specs,
      sku: i.sku,
      category: i.category,
      unit: i.unit,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }))
  }

  // 5. Default windows: 30 days for an invoice
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const effectivePaymentDueDate = payment_due_date || thirtyDaysFromNow
  const effectiveValidUntil = thirtyDaysFromNow

  // 6. Insert invoice header — inherits customer fields + locked display values
  const { data: invoice, error: invoiceError } = await supabase
    .from("quotes")
    .insert([
      {
        doc_type: "invoice",
        invoice_type,
        converted_from_proforma_id: parent_id,
        // Inherit customer context from parent
        customer_name: parent.customer_name,
        company: parent.company,
        email: parent.email,
        phone: parent.phone,
        customer_tin: parent.customer_tin,
        customer_address: parent.customer_address,
        lead_id: parent.lead_id,
        // LOCK financial context to parent's already-locked values
        currency: parentCurrency,
        display_currency: parentDisplayCurrency,
        subtotal: invoiceTotal,
        total: invoiceTotal,
        display_total: invoiceDisplayTotal,
        vat_enabled: false,
        vat_rate: 0,
        vat_amount: 0,
        // Invoice lifecycle
        payment_status: "unpaid",
        valid_until: effectiveValidUntil,
        payment_due_date: effectivePaymentDueDate,
        po_reference: po_reference ?? parent.po_reference,
        notes: notes ?? parent.notes,
        generated_by,
        // Deposit tracking (set on deposit invoices for accounting reference)
        deposit_percent: effectiveDepositPct,
      },
    ])
    .select("id, quote_number")
    .single()

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 })
  }

  // 7. Insert line items
  const itemRows = lineItems.map((i: any) => ({
    quote_id: invoice.id,
    product_id: i.product_id ?? null,
    variant_id: i.variant_id ?? null,
    product_name: i.product_name,
    product_specs: i.product_specs,
    sku: i.sku,
    category: i.category,
    unit: i.unit,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: round2(i.quantity * i.unit_price),
  }))

  const { error: itemsInsertError } = await supabase
    .from("quote_items")
    .insert(itemRows)

  if (itemsInsertError) {
    return NextResponse.json(
      { error: itemsInsertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    quote_id: invoice.id,
    quote_number: invoice.quote_number,
    doc_type: "invoice",
    invoice_type,
    parent_proforma: parent.quote_number,
    total: invoiceTotal,
    display_total: invoiceDisplayTotal,
    display_currency: parentDisplayCurrency,
  })
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}