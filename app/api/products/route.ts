import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (productsError) {
    return NextResponse.json(
      { error: productsError.message },
      { status: 500 }
    );
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true);

  if (categoriesError) {
    return NextResponse.json(
      { error: categoriesError.message },
      { status: 500 }
    );
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
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (variantsError) {
    return NextResponse.json(
      { error: variantsError.message },
      { status: 500 }
    );
  }

  const categoryMap = new Map(
    (categories ?? []).map((category: any) => [category.id, category.name])
  );

  const variantsByProductId = new Map<string, any[]>();

  for (const variant of variants ?? []) {
    const existing = variantsByProductId.get(variant.product_id) ?? [];
    existing.push(variant);
    variantsByProductId.set(variant.product_id, existing);
  }

  const mapped = (products ?? []).map((product: any) => {
    const productVariants = (variantsByProductId.get(product.id) ?? []).map(
      (variant: any) => ({
        id: variant.id,
        product_id: variant.product_id,
        sku: variant.sku ?? "",
        size_label: variant.size_label ?? null,
        length_mm: variant.length_mm ?? null,
        width_mm: variant.width_mm ?? null,
        thickness_mm: variant.thickness_mm ?? null,
        core_type: variant.core_type ?? null,
        ply_count: variant.ply_count ?? null,
        unit: variant.unit ?? "sheet",
        moq: variant.moq ?? 1,
        currency: variant.currency ?? "PHP",
        unit_price: variant.unit_price ?? null,
        is_price_on_request: variant.is_price_on_request ?? false,
        price_notes: variant.price_notes ?? null,
        is_active: variant.is_active ?? true,
        sort_order: variant.sort_order ?? null,
      })
    );

    return {
      id: product.id,
      name: product.name,
      title: product.name,
      slug: product.slug ?? "",
      description: product.description ?? "",
      image_url: product.image_url ?? "/placeholder-product.jpg",
      category: categoryMap.get(product.category_id) ?? "",
      unit_price: productVariants[0]?.unit_price ?? null,
      variants: productVariants,
      created_at: product.created_at,
    };
  });

  return NextResponse.json(mapped);
}