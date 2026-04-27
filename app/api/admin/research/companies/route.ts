// app/api/admin/research/companies/route.ts
//
// Admin runner that drives the Claude company research engine at scale.
// Resolves a target domain list (pilot, specific, pending, stale), checks
// the company_research cache, calls researchCompany for each fresh target,
// and upserts the result. Returns aggregated counters and an approximate
// cost figure based on Sonnet 4 list prices.
//
// Auth: Authorization: Bearer <ADMIN_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  researchCompany,
  buildUsageLogRows,
  SONNET_INPUT_PER_TOKEN,
  SONNET_OUTPUT_PER_TOKEN,
  WEB_SEARCH_PER_REQUEST,
  type ResearchInput,
  type ResearchResult,
  type ResearchUsage,
} from "@/lib/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_MAX_COMPANIES = 5;
const MAX_MAX_COMPANIES = 10;
const DEFAULT_PARALLEL = 3;
const MAX_PARALLEL = 5;
const CACHE_TTL_DAYS = 90;
const REPRESENTATIVE_LEAD_FETCH_LIMIT = 5;
const PENDING_LEAD_SCAN_LIMIT = 3000;

// Pricing constants live in lib/research.ts (sourced from anthropic.com/pricing).
// We re export them locally so the runner uses the same values for in flight
// reporting that the log_service_usage RPC writes to service_usage_log.
const PRICE_INPUT_PER_TOKEN = SONNET_INPUT_PER_TOKEN;
const PRICE_OUTPUT_PER_TOKEN = SONNET_OUTPUT_PER_TOKEN;
const PRICE_WEB_SEARCH_PER_REQUEST = WEB_SEARCH_PER_REQUEST;

const NUMAT_CLIENT_SLUG = "numat";

// ---------- Body schema ----------

const BodySchema = z
  .object({
    scope: z.enum(["pilot", "specific", "pending", "stale"]).default("pilot"),
    domains: z.array(z.string()).optional(),
    max_companies: z.number().int().min(1).max(MAX_MAX_COMPANIES).default(DEFAULT_MAX_COMPANIES),
    parallel: z.number().int().min(1).max(MAX_PARALLEL).default(DEFAULT_PARALLEL),
    force_refresh: z.boolean().default(false),
    dry_run: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "specific") {
      if (!val.domains || val.domains.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "domains is required when scope is 'specific'",
          path: ["domains"],
        });
      }
    }
  });

type Body = z.infer<typeof BodySchema>;

// ---------- Auth + supabase ----------

function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Cached at module scope. The clients table is small and the slug to id
// mapping is stable, so a single lookup per cold start is enough.
let cachedNumatClientId: string | null = null;

async function getNumatClientId(sb: SupabaseClient): Promise<string> {
  if (cachedNumatClientId) return cachedNumatClientId;
  const { data, error } = await sb
    .from("clients")
    .select("id")
    .eq("slug", NUMAT_CLIENT_SLUG)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to resolve NUMAT client id: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(`NUMAT client not found in clients table (slug='${NUMAT_CLIENT_SLUG}')`);
  }
  cachedNumatClientId = data.id;
  return data.id;
}

interface LogUsageOutcome {
  ok: boolean;
  totalCostUsd: number;
  errorMessage: string | null;
}

async function logResearchUsage(
  sb: SupabaseClient,
  clientId: string,
  domain: string,
  usage: ResearchUsage,
): Promise<LogUsageOutcome> {
  const payload = buildUsageLogRows({ clientId, domain, usage });
  try {
    const { data, error } = await sb.rpc("log_service_usage", { payload });
    if (error) {
      return { ok: false, totalCostUsd: 0, errorMessage: error.message };
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { total_cost_usd?: number | string }
      | null;
    const raw = row?.total_cost_usd ?? 0;
    const totalCostUsd = typeof raw === "string" ? Number(raw) : Number(raw);
    return {
      ok: true,
      totalCostUsd: Number.isFinite(totalCostUsd) ? totalCostUsd : 0,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, totalCostUsd: 0, errorMessage: message };
  }
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

// ---------- Domain resolution ----------

function normalizeDomain(d: string): string {
  return d.trim().toLowerCase();
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function loadPilotDomains(sb: SupabaseClient): Promise<string[]> {
  const { data, error } = await sb
    .from("_b_research_pilot_30")
    .select("company_domain");
  if (error) throw new Error(`pilot lookup failed: ${error.message}`);
  return uniq(
    (data ?? [])
      .map((r) => normalizeDomain(String((r as { company_domain?: string | null }).company_domain ?? "")))
      .filter((d) => d.length > 0),
  );
}

async function loadPendingDomains(sb: SupabaseClient, max: number): Promise<string[]> {
  const { data: leadRows, error: leadErr } = await sb
    .from("master_leads")
    .select("company_domain")
    .eq("sequence_paused", false)
    .not("company_domain", "is", null)
    .neq("company_domain", "")
    .order("company_domain", { ascending: true })
    .limit(PENDING_LEAD_SCAN_LIMIT);
  if (leadErr) throw new Error(`master_leads lookup failed: ${leadErr.message}`);

  const candidateDomains = uniq(
    (leadRows ?? [])
      .map((r) => normalizeDomain(String((r as { company_domain?: string | null }).company_domain ?? "")))
      .filter((d) => d.length > 0),
  );

  if (candidateDomains.length === 0) return [];

  const { data: researched, error: rErr } = await sb
    .from("company_research")
    .select("company_domain");
  if (rErr) throw new Error(`company_research lookup failed: ${rErr.message}`);
  const researchedSet = new Set(
    (researched ?? []).map((r) =>
      normalizeDomain(String((r as { company_domain?: string }).company_domain ?? "")),
    ),
  );

  const pending: string[] = [];
  for (const d of candidateDomains) {
    if (researchedSet.has(d)) continue;
    pending.push(d);
    if (pending.length >= max) break;
  }
  return pending;
}

async function loadStaleDomains(sb: SupabaseClient, max: number): Promise<string[]> {
  const { data, error } = await sb
    .from("company_research")
    .select("company_domain, expires_at")
    .lt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(max * 4);
  if (error) throw new Error(`stale lookup failed: ${error.message}`);
  return uniq(
    (data ?? [])
      .map((r) => normalizeDomain(String((r as { company_domain?: string }).company_domain ?? "")))
      .filter((d) => d.length > 0),
  ).slice(0, max);
}

// ---------- Cache check ----------

interface CacheRow {
  company_domain: string;
  research_quality: string | null;
  expires_at: string | null;
}

async function loadCache(sb: SupabaseClient, domains: string[]): Promise<Map<string, CacheRow>> {
  const map = new Map<string, CacheRow>();
  if (domains.length === 0) return map;
  const { data, error } = await sb
    .from("company_research")
    .select("company_domain, research_quality, expires_at")
    .in("company_domain", domains);
  if (error) throw new Error(`cache lookup failed: ${error.message}`);
  for (const r of data ?? []) {
    const row = r as CacheRow;
    map.set(normalizeDomain(row.company_domain), row);
  }
  return map;
}

function isCacheCovered(row: CacheRow | undefined): boolean {
  if (!row) return false;
  if (row.research_quality === "failed") return false;
  if (!row.expires_at) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

// ---------- Representative lead ----------

interface RepresentativeLead {
  segment: string;
  company: string | null;
  country: string | null;
  title: string | null;
}

async function loadRepresentativeLead(
  sb: SupabaseClient,
  domain: string,
): Promise<RepresentativeLead | null> {
  const { data, error } = await sb
    .from("master_leads")
    .select("segment, company, country, title, full_name")
    .ilike("company_domain", domain)
    .limit(REPRESENTATIVE_LEAD_FETCH_LIMIT);
  if (error) throw new Error(`representative lead lookup failed: ${error.message}`);
  const rows = (data ?? []) as Array<{
    segment: string | null;
    company: string | null;
    country: string | null;
    title: string | null;
    full_name: string | null;
  }>;
  if (rows.length === 0) return null;

  const ranked = [...rows].sort((a, b) => {
    const score = (r: typeof a) =>
      (r.title ? 2 : 0) + (r.full_name ? 1 : 0);
    return score(b) - score(a);
  });
  const best = ranked[0];
  return {
    segment: best.segment ?? "other",
    company: best.company,
    country: best.country,
    title: best.title,
  };
}

// ---------- Upsert ----------

async function upsertResearch(
  sb: SupabaseClient,
  domain: string,
  result: ResearchResult,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await sb.from("company_research").upsert(
    {
      company_domain: domain,
      company_name: result.company_name,
      research_data: result,
      pain_hooks: result.pain_hooks,
      product_recommendations: result.product_recommendations,
      research_quality: result.research_quality,
      source_urls: result.source_urls,
      researched_at: nowIso,
      expires_at: expiresIso,
      updated_at: nowIso,
    },
    { onConflict: "company_domain" },
  );
  if (error) throw new Error(`upsert failed: ${error.message}`);
}

// ---------- Aggregation ----------

interface QualityCounts {
  high: number;
  medium: number;
  low: number;
  failed: number;
}

function emptyByQuality(): QualityCounts {
  return { high: 0, medium: 0, low: 0, failed: 0 };
}

// ---------- Handler ----------

async function resolveDomains(sb: SupabaseClient, body: Body): Promise<string[]> {
  if (body.scope === "pilot") return await loadPilotDomains(sb);
  if (body.scope === "specific") {
    return uniq((body.domains ?? []).map(normalizeDomain).filter((d) => d.length > 0));
  }
  if (body.scope === "pending") return await loadPendingDomains(sb, body.max_companies);
  return await loadStaleDomains(sb, body.max_companies);
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown = {};
  try {
    const text = await request.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", details: "request body is not valid JSON" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const supabase = getSupabaseAdmin();

  let candidates: string[];
  try {
    candidates = await resolveDomains(supabase, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to resolve domains", details: message }, { status: 500 });
  }

  // Cache filter (unless force_refresh).
  let researchable: string[];
  let skippedCached = 0;
  if (body.force_refresh) {
    researchable = candidates;
  } else {
    let cache: Map<string, CacheRow>;
    try {
      cache = await loadCache(supabase, candidates);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: "Cache lookup failed", details: message }, { status: 500 });
    }
    researchable = [];
    for (const d of candidates) {
      if (isCacheCovered(cache.get(d))) {
        skippedCached += 1;
      } else {
        researchable.push(d);
      }
    }
  }

  // Cap to max_companies.
  if (researchable.length > body.max_companies) {
    researchable = researchable.slice(0, body.max_companies);
  }

  if (body.dry_run) {
    return NextResponse.json({
      would_research: researchable.length,
      domains: researchable,
      skipped_cached: skippedCached,
      cost: {
        usd_total_estimate: 0,
        usd_total_logged: 0,
        input_tokens_total: 0,
        output_tokens_total: 0,
        web_search_requests_total: 0,
        logging_errors: [] as Array<{ domain: string; message: string }>,
      },
    });
  }

  let numatClientId: string;
  try {
    numatClientId = await getNumatClientId(supabase);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to resolve NUMAT client id", details: message },
      { status: 500 },
    );
  }

  const byQuality = emptyByQuality();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalWebSearches = 0;
  let segmentMismatches = 0;
  let processed = 0;
  let usdTotalLogged = 0;
  const errors: Array<{ domain: string; message: string }> = [];
  const loggingErrors: Array<{ domain: string; message: string }> = [];

  for (let i = 0; i < researchable.length; i += body.parallel) {
    const chunk = researchable.slice(i, i + body.parallel);
    type Settled =
      | { kind: "ok"; domain: string; result: ResearchResult }
      | { kind: "err"; domain: string; message: string };

    const settled: Settled[] = await Promise.all(
      chunk.map(async (domain): Promise<Settled> => {
        try {
          const lead = await loadRepresentativeLead(supabase, domain);
          const input: ResearchInput = {
            domain,
            believedSegment: lead?.segment ?? "unknown",
            believedCompany: lead?.company ?? null,
            believedCountry: lead?.country ?? null,
            contactTitleSeen: lead?.title ?? null,
          };
          const result = await researchCompany(input);
          await upsertResearch(supabase, domain, result);
          return { kind: "ok", domain, result };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { kind: "err", domain, message };
        }
      }),
    );

    for (const item of settled) {
      if (item.kind === "err") {
        errors.push({ domain: item.domain, message: item.message });
        continue;
      }
      processed += 1;
      const r = item.result;
      const q = r.research_quality;
      if (q === "high" || q === "medium" || q === "low" || q === "failed") {
        byQuality[q] += 1;
      }
      totalInputTokens += r.usage.input_tokens;
      totalOutputTokens += r.usage.output_tokens;
      totalWebSearches += r.usage.web_search_requests;
      if (!r.segment_match) segmentMismatches += 1;

      const logOutcome = await logResearchUsage(supabase, numatClientId, item.domain, r.usage);
      if (logOutcome.ok) {
        usdTotalLogged += logOutcome.totalCostUsd;
      } else {
        const message = logOutcome.errorMessage ?? "unknown logging error";
        console.error(`[research/companies] usage logging failed for ${item.domain}:`, message);
        loggingErrors.push({ domain: item.domain, message });
      }
    }
  }

  const approxCostUsd =
    totalInputTokens * PRICE_INPUT_PER_TOKEN +
    totalOutputTokens * PRICE_OUTPUT_PER_TOKEN +
    totalWebSearches * PRICE_WEB_SEARCH_PER_REQUEST;

  return NextResponse.json({
    processed,
    skipped_cached: skippedCached,
    by_quality: byQuality,
    usage: {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      web_search_requests: totalWebSearches,
      approx_cost_usd: Number(approxCostUsd.toFixed(4)),
    },
    segment_mismatches: segmentMismatches,
    errors,
    cost: {
      usd_total_estimate: Number(approxCostUsd.toFixed(4)),
      usd_total_logged: Number(usdTotalLogged.toFixed(4)),
      input_tokens_total: totalInputTokens,
      output_tokens_total: totalOutputTokens,
      web_search_requests_total: totalWebSearches,
      logging_errors: loggingErrors,
    },
  });
}
