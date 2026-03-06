import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 }
    );
  }

  const { id } = await params;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { error: productError?.message ?? "Product not found." },
      { status: 404 }
    );
  }

  let categoryName = "";

  if (product.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", product.category_id)
      .maybeSingle();

    categoryName = category?.name ?? "";
  }

  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select(`
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
    `)
    .eq("product_id", id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (variantsError) {
    return NextResponse.json(
      { error: variantsError.message },
      { status: 500 }
    );
  }

  const mappedVariants = (variants ?? []).map((variant: any) => ({
    id: variant.id,
    sku: variant.sku ?? "",
    thickness_mm: variant.thickness_mm ?? null,
    ply_count: variant.ply_count ?? null,
    dimensions:
      variant.length_mm && variant.width_mm
        ? `${variant.length_mm}mm x ${variant.width_mm}mm`
        : null,
    unit_price: variant.unit_price ?? null,
    currency: variant.currency ?? "PHP",
    unit: variant.unit ?? "sheet",
    min_order_qty: variant.moq ?? 1,
    core_type: variant.core_type ?? null,
    size_label: variant.size_label ?? null,
    is_price_on_request: variant.is_price_on_request ?? false,
    price_notes: variant.price_notes ?? null,
  }));

  return NextResponse.json({
    id: product.id,
    name: product.name,
    slug: product.slug ?? "",
    description: product.description ?? "",
    image_url: product.image_url ?? "/placeholder-product.jpg",
    category: categoryName,
    sku: mappedVariants[0]?.sku ?? "",
    thickness_mm: mappedVariants[0]?.thickness_mm ?? null,
    ply_count: mappedVariants[0]?.ply_count ?? null,
    dimensions: mappedVariants[0]?.dimensions ?? null,
    unit_price: mappedVariants[0]?.unit_price ?? null,
    currency: mappedVariants[0]?.currency ?? "PHP",
    unit: mappedVariants[0]?.unit ?? "sheet",
    min_order_qty: mappedVariants[0]?.min_order_qty ?? 1,
    variants: mappedVariants,
  });
}