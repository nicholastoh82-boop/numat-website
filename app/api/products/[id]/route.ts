import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      image_url,
      created_at,
      category:categories (
        id,
        name
      ),
      variants:product_variants (
        id,
        sku,
        thickness_mm,
        ply_count,
        length_mm,
        width_mm,
        unit_price,
        currency,
        unit,
        moq,
        is_active,
        sort_order
      )
    `)
    .eq("id", params.id)
    .eq("is_active", true)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}