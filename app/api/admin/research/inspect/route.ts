// app/api/admin/research/inspect/route.ts
//
// Admin GET endpoint for browsing rows in company_research without leaving
// the terminal. Supports filtering by domain, primary_segment, quality,
// and ordering newest or oldest.
//
// Auth: Authorization: Bearer <ADMIN_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const QualityEnum = z.enum(["high", "medium", "low", "failed"]);
const OrderEnum = z.enum(["newest", "oldest"]);

const QuerySchema = z.object({
  domain: z.string().trim().min(1).optional(),
  segment: z.string().trim().min(1).optional(),
  quality: QualityEnum.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  order: OrderEnum.default("newest"),
});

function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function checkAuth(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  const presented = header.slice(7).trim();
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(adminSecret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface ResearchRow {
  company_domain: string;
  company_name: string | null;
  research_data: Record<string, unknown> | null;
  pain_hooks: unknown;
  product_recommendations: unknown;
  research_quality: string | null;
  source_urls: string[] | null;
  researched_at: string | null;
  expires_at: string | null;
}

function pickResearchField<T>(row: ResearchRow, key: string): T | null {
  if (!row.research_data || typeof row.research_data !== "object") return null;
  const v = (row.research_data as Record<string, unknown>)[key];
  return (v ?? null) as T | null;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawParams = {
    domain: url.searchParams.get("domain") ?? undefined,
    segment: url.searchParams.get("segment") ?? undefined,
    quality: url.searchParams.get("quality") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  const parsed = QuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }
  const { domain, segment, quality, limit, order } = parsed.data;

  const sb = getSupabaseAdmin();

  let q = sb
    .from("company_research")
    .select(
      "company_domain, company_name, research_data, pain_hooks, product_recommendations, research_quality, source_urls, researched_at, expires_at",
    );

  if (domain) {
    q = q.eq("company_domain", domain.toLowerCase());
  }
  if (quality) {
    q = q.eq("research_quality", quality);
  }
  if (segment) {
    // research_data ->> 'primary_segment' equals segment
    q = q.eq("research_data->>primary_segment", segment);
  }

  q = q.order("researched_at", { ascending: order === "oldest", nullsFirst: false }).limit(limit);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: "Failed to query company_research", details: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as ResearchRow[];
  const out = rows.map((row) => ({
    company_domain: row.company_domain,
    company_name: row.company_name,
    primary_segment: pickResearchField<string>(row, "primary_segment"),
    segment_match: pickResearchField<boolean>(row, "segment_match"),
    research_quality: row.research_quality,
    failure_reason: pickResearchField<string>(row, "failure_reason"),
    pain_hooks: row.pain_hooks,
    product_recommendations: row.product_recommendations,
    recent_signal: pickResearchField<unknown>(row, "recent_signal"),
    decision_maker_titles: pickResearchField<string[]>(row, "decision_maker_titles") ?? [],
    source_urls: row.source_urls ?? [],
    researched_at: row.researched_at,
    expires_at: row.expires_at,
  }));

  return NextResponse.json({ count: out.length, rows: out });
}
