import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type NewsContentBlock = {
  type: "heading" | "paragraph" | "image" | "quote";
  value: string;
  caption?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeContent(content: unknown): NewsContentBlock[] {
  if (!Array.isArray(content)) return [];

  return content
    .filter((item): item is Record<string, unknown> => {
      return !!item && typeof item === "object";
    })
    .map((block): NewsContentBlock => {
      const type =
        block.type === "heading" ||
        block.type === "paragraph" ||
        block.type === "image" ||
        block.type === "quote"
          ? block.type
          : "paragraph";

      return {
        type,
        value: typeof block.value === "string" ? block.value : "",
        ...(typeof block.caption === "string" ? { caption: block.caption } : {}),
      };
    })
    .filter((block) => block.value.length > 0);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const limitParam = searchParams.get("limit");

    let query = supabase
      .from("news")
      .select("*")
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (featured === "true") {
      query = query.eq("featured", true);
    }

    if (featured === "false") {
      query = query.eq("featured", false);
    }

    if (limitParam) {
      const limit = Number(limitParam);
      if (!Number.isNaN(limit) && limit > 0) {
        query = query.limit(limit);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching news:", error);
      return NextResponse.json(
        { error: "Failed to fetch news." },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error("Unexpected GET /api/admin/news error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
    const cover_image_url =
      typeof body.cover_image_url === "string"
        ? body.cover_image_url.trim()
        : "";
    const status =
      body.status === "published" || body.status === "draft"
        ? body.status
        : "draft";
    const featured = Boolean(body.featured);
    const seo_title =
      typeof body.seo_title === "string" ? body.seo_title.trim() : "";
    const seo_description =
      typeof body.seo_description === "string"
        ? body.seo_description.trim()
        : "";

    const slug =
      typeof body.slug === "string" && body.slug.trim().length > 0
        ? slugify(body.slug)
        : slugify(title);

    const content = normalizeContent(body.content);

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Slug could not be generated." },
        { status: 400 }
      );
    }

    const { data: existingSlug } = await supabase
      .from("news")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { error: "Slug already exists. Please use a different title or slug." },
        { status: 400 }
      );
    }

    const published_at =
      status === "published"
        ? typeof body.published_at === "string" && body.published_at
          ? body.published_at
          : new Date().toISOString()
        : null;

    const payload = {
      title,
      slug,
      excerpt,
      content,
      cover_image_url: cover_image_url || null,
      status,
      featured,
      published_at,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
    };

    const { data, error } = await supabase
      .from("news")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Error creating news:", error);
      return NextResponse.json(
        { error: "Failed to create news post." },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected POST /api/admin/news error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}