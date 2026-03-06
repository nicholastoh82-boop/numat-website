import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      image_url,
      category_id,
      is_active,
      created_at,
      category:categories (
        id,
        name
      ),
      variants:product_variants (
        id,
        product_id,
        sku,
        size_label,
        length_mm,
        width_mm,
        thickness_mm,
        core_type,
        ply_count,
        unit,
        moq,
        currency,
        unit_price,
        is_price_on_request,
        price_notes,
        is_active,
        sort_order
      )
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    title: p.name,
    slug: p.slug ?? "",
    description: p.description ?? "",
    image_url: p.image_url ?? "/placeholder-product.jpg",
    category: p.category?.name ?? "",
    unit_price: p.variants?.[0]?.unit_price ?? null,
    variants: (p.variants ?? []).filter((v: any) => v.is_active !== false),
    created_at: p.created_at,
  }));

  return NextResponse.json(mapped);
}