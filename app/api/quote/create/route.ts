import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Supports creating both Proforma Invoices (default) and Invoices.
// Also supports Custom Order line items (no product_id, manual fields).
export async function POST(req: Request) {
  try {
    const supabase = createClient()
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
    } = body

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
          customer_tin: doc_type === "invoice" ? customer_tin : null,
          customer_address: doc_type === "invoice" ? customer_address : null,
          payment_due_date: doc_type === "invoice" ? payment_due_date : null,
          po_reference: doc_type === "invoice" ? po_reference : null,
          payment_status: doc_type === "invoice" ? "unpaid" : null,
          vat_enabled: Boolean(vat_enabled),
          vat_rate: Number(vat_rate),
          vat_amount: vatAmount,
          generated_by,
        },
      ])
      .select("id, quote_number")
      .single()

    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 })
    }

    // 2. Build line items — supports both catalog items (by product_id) and custom items
    const catalogIds = items
      .filter((i: any) => i.product_id && !i.is_custom)
      .map((i: any) => i.product_id)

    let productMap = new Map<string, any>()
    if (catalogIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, category, unit, unit_price, min_order_qty")
        .in("id", catalogIds)
      productMap = new Map(products?.map((p: any) => [p.id, p]))
    }

    const rows = items.map((i: any) => {
      const qty = Number(i.quantity)
      const unitPrice = Number(i.unit_price || 0)

      // Custom Order line — product_id is null
      if (i.is_custom || !i.product_id) {
        return {
          quote_id: quote.id,
          product_id: null,
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

      // Catalog item — enforce MOQ unless overridden
      const product = productMap.get(i.product_id)
      if (!product) {
        throw new Error(`Product not found: ${i.product_id}`)
      }
      const moq = Number(product.min_order_qty || 1)
      if (!i.moq_override && qty < moq) {
        throw new Error(`Minimum order for ${product.name} is ${moq}`)
      }

      return {
        quote_id: quote.id,
        product_id: product.id,
        product_name: product.name,
        product_specs: i.product_specs || null,
        sku: i.sku || null,
        category: product.category,
        unit: product.unit,
        quantity: qty,
        unit_price: unitPrice || Number(product.unit_price),
        total_price: qty * (unitPrice || Number(product.unit_price)),
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