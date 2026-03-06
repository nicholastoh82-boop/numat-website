import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const variants = (data?.variants ?? [])
    .filter((v: any) => v.is_active !== false)
    .sort((a: any, b: any) => {
      const aOrder = a.sort_order ?? 9999;
      const bOrder = b.sort_order ?? 9999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(a.thickness_mm ?? 0) - Number(b.thickness_mm ?? 0);
    });

  const firstVariant = variants[0] ?? null;

  const mapped = {
    id: data.id,
    name: data.name,
    title: data.name,
    slug: data.slug ?? "",
    description: data.description ?? "",
    image_url: data.image_url ?? "/placeholder-product.jpg",
    category: (data as any)?.category?.name ?? "",

    sku: firstVariant?.sku ?? "",
    thickness_mm: firstVariant?.thickness_mm ?? null,
    ply_count: firstVariant?.ply_count ?? null,
    length_mm: firstVariant?.length_mm ?? 2440,
    width_mm: firstVariant?.width_mm ?? 1220,
    dimensions: firstVariant?.size_label ?? "2440 x 1220 mm",

    unit_price: firstVariant?.unit_price ?? null,
    currency: firstVariant?.currency ?? "PHP",
    unit: firstVariant?.unit ?? "sheet",
    min_order_qty: firstVariant?.moq ?? 1,
    is_price_on_request: !!firstVariant?.is_price_on_request,
    price_notes: firstVariant?.price_notes ?? "",

    variants,
    created_at: data.created_at,
  };

  return NextResponse.json(mapped);
}