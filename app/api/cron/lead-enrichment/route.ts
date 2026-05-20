// app/api/cron/lead-enrichment/route.ts
//
// Vercel Cron: every 30 minutes.
// Picks leads from master_leads that have a company_domain and have not been
// enriched in the last 30 days. Calls Gemini Flash to score each one for
// NUMAT ICP fit, extracts business description, products offered, pain hooks,
// and recommended NUMAT product matches. Writes results to master_leads and
// upserts the full payload into company_research.
//
// Throughput is controlled by env var ENRICHMENT_MAX_PER_RUN. Default is 5 for
// a safe initial validation period. Crank up to 25 or 50 once you've reviewed
// the first batch and are happy with quality.
//
// Cost note: Gemini 2.5 Flash is ~10x cheaper than Claude Sonnet for this
// workload. A full pass on 4500 leads with domains costs roughly USD 5 at the
// default 8k input / 1k output per lead, all absorbed by GCP startup credits.

import { authorized, supabaseGetRaw, supabasePatch, supabasePost } from "@/lib/cron/helpers";
import { enrichLead, type EnrichmentResult } from "@/lib/cron/enrich_lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type LeadRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  company_domain: string | null;
  country: string | null;
  segment: string | null;
  title: string | null;
  notes: string | null;
  intended_business: string | null;
  service_keywords: string | null;
  last_enriched_at: string | null;
  rep_email: string | null;
};

function batchSize(): number {
  const raw = process.env.ENRICHMENT_MAX_PER_RUN;
  const n = raw ? parseInt(raw, 10) : 5;
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(n, 50);
}

async function pickLeads(limit: number): Promise<LeadRow[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const select =
    "id,email,first_name,last_name,full_name,company,company_domain,country,segment,title,notes,intended_business,service_keywords,last_enriched_at,rep_email";
  const orFilter = `last_enriched_at.is.null,last_enriched_at.lt.${cutoff}`;
  const path =
    `master_leads?select=${select}` +
    `&company_domain=not.is.null` +
    `&company_domain=neq.` +
    `&status=neq.unsubscribed` +
    `&or=(${orFilter})` +
    `&order=priority_score.desc.nullslast,created_at.asc` +
    `&limit=${limit}`;
  return (await supabaseGetRaw<LeadRow[]>(path)) ?? [];
}

async function persistEnrichment(
  lead: LeadRow,
  result: EnrichmentResult
): Promise<void> {
  const now = new Date().toISOString();
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabasePatch(`master_leads?id=eq.${lead.id}`, {
    business_description: result.business_description || null,
    products_offered: result.products_offered,
    employee_size_band: result.employee_size_band,
    icp_fit_score: result.icp_fit_score,
    icp_fit_reason: result.icp_fit_reason || null,
    pain_hooks: result.pain_hooks,
    product_recommendations: result.product_recommendations,
    last_enriched_at: now,
    enrichment_tier: "gemini_flash_v1",
    updated_at: now,
  });

  if (lead.company_domain) {
    try {
      await supabasePost(
        `company_research?on_conflict=company_domain`,
        {
          company_domain: lead.company_domain,
          company_name: lead.company,
          research_data: {
            business_description: result.business_description,
            products_offered: result.products_offered,
            employee_size_band: result.employee_size_band,
            icp_fit_score: result.icp_fit_score,
            icp_fit_reason: result.icp_fit_reason,
          },
          pain_hooks: result.pain_hooks,
          product_recommendations: result.product_recommendations,
          research_quality:
            result.icp_fit_score >= 70 ? "high" : result.icp_fit_score >= 40 ? "medium" : "low",
          source_urls: result.source_urls,
          researched_at: now,
          expires_at: thirtyDays,
        },
        "return=minimal,resolution=merge-duplicates"
      );
    } catch (err) {
      console.error(
        `company_research upsert failed for ${lead.company_domain}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

async function processOne(lead: LeadRow): Promise<{
  id: string;
  email: string | null;
  status: "ok" | "error";
  icp_fit_score?: number;
  error?: string;
}> {
  try {
    const result = await enrichLead({
      company_name: lead.company,
      company_domain: lead.company_domain,
      country: lead.country,
      segment: lead.segment,
      title: lead.title,
      notes: lead.notes,
      intended_business: lead.intended_business,
      service_keywords: lead.service_keywords,
    });
    await persistEnrichment(lead, result);
    return {
      id: lead.id,
      email: lead.email,
      status: "ok",
      icp_fit_score: result.icp_fit_score,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`enrich failed for ${lead.email || lead.id}:`, msg);
    // Touch last_enriched_at to a far past date so we eventually retry, but
    // not on the next run (don't spin on the same broken lead).
    const retryAt = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();
    try {
      await supabasePatch(`master_leads?id=eq.${lead.id}`, {
        last_enriched_at: retryAt,
        enrichment_tier: "gemini_flash_v1_failed",
      });
    } catch {
      // ignore
    }
    return { id: lead.id, email: lead.email, status: "error", error: msg.slice(0, 200) };
  }
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const limit = batchSize();

  let leads: LeadRow[];
  try {
    leads = await pickLeads(limit);
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: `pickLeads failed: ${err instanceof Error ? err.message : String(err)}`,
        ms: Date.now() - started,
      },
      { status: 500 }
    );
  }

  const results: Awaited<ReturnType<typeof processOne>>[] = [];
  for (const lead of leads) {
    results.push(await processOne(lead));
  }

  const ok_count = results.filter((r) => r.status === "ok").length;
  const err_count = results.filter((r) => r.status === "error").length;
  const high_fit = results.filter(
    (r) => r.status === "ok" && (r.icp_fit_score ?? 0) >= 70
  ).length;

  return Response.json({
    ok: true,
    batch_size: limit,
    picked: leads.length,
    ok_count,
    err_count,
    high_fit,
    results,
    ms: Date.now() - started,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  return handle();
}
