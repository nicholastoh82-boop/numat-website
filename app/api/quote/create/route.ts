import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const body = await req.json()

    const {
      customer_name,
      company,
      email,
      phone,
      notes,
      items
    } = body

    // 1️⃣ Create quote header
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert([
        {
          customer_name,
          company,
          email,
          phone,
          notes
        }
      ])
      .select("id, quote_number")
      .single()

    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 })
    }

    // 2️⃣ Fetch product details
    const productIds = items.map((i: any) => i.product_id)

    const { data: products } = await supabase
      .from("products")
      .select("id, name, category, unit, unit_price, min_order_qty")
      .in("id", productIds)

    const productMap = new Map(products?.map((p: any) => [p.id, p]))

    // 3️⃣ Build quote line items
    const rows = items.map((i: any) => {
      const product = productMap.get(i.product_id)

      const qty = Number(i.quantity)
      const moq = Number(product.min_order_qty || 1)

      if (qty < moq) {
        throw new Error(`Minimum order for ${product.name} is ${moq}`)
      }

      return {
        quote_id: quote.id,
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        unit: product.unit,
        quantity: qty,
        unit_price: product.unit_price
      }
    })

    await supabase.from("quote_items").insert(rows)

    return NextResponse.json({
      success: true,
      quote_number: quote.quote_number
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}