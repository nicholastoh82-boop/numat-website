import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// helper to generate slugs
function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, display_order, is_active, created_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // create slug for frontend filters
  const mapped = (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: slugify(c.name),
    display_order: c.display_order ?? 999,
  }))

  return NextResponse.json(mapped)
}