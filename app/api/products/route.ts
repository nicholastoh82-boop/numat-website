import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

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

  const mapped = (data ?? []).map((p: any) => {
    const activeVariants = (p.variants ?? [])
      .filter((v: any) => v.is_active !== false)
      .sort((a: any, b: any) => {
        const aSort = a.sort_order ?? 999999;
        const bSort = b.sort_order ?? 999999;
        return aSort - bSort;
      });

    return {
      id: p.id,
      name: p.name,
      title: p.name,
      slug: p.slug ?? "",
      description: p.description ?? "",
      image_url: p.image_url ?? "/placeholder-product.jpg",
      category: p.category?.name ?? "",
      unit_price: activeVariants[0]?.unit_price ?? null,
      variants: activeVariants,
      created_at: p.created_at,
    };
  });

  return NextResponse.json(mapped);
}