// app/api/cron/monday-reports/route.ts
//
// Monday-morning reports orchestrator. Runs 5 reports in parallel via
// Promise.allSettled so one failing report never stops the others:
//   - AR Aging Report       -> nick@numat.ph
//   - Finance Report        -> nick@numat.ph
//   - Margin Floor Audit    -> nick@numat.ph
//   - Hotel Outreach Report -> mark@numat.ph
//   - NARA Weekly Learning  -> nick@numat.ph (uses Anthropic API)
//
// Scheduled via Supabase pg_cron: Monday 8am MYT (Mon 00:00 UTC).

import { authorized } from "@/lib/cron/helpers";
import { generateArAgingReport } from "@/lib/cron/reports/ar-aging";
import { generateFinanceReport } from "@/lib/cron/reports/finance";
import { generateMarginFloorReport } from "@/lib/cron/reports/margin-floor";
import { generateHotelOutreachReport } from "@/lib/cron/reports/hotel-outreach";
import { runNaraWeeklyLearning } from "@/lib/cron/reports/nara-learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const JOBS = [
  { name: "ar_aging", fn: generateArAgingReport },
  { name: "finance", fn: generateFinanceReport },
  { name: "margin_floor", fn: generateMarginFloorReport },
  { name: "hotel_outreach", fn: generateHotelOutreachReport },
  { name: "nara_learning", fn: runNaraWeeklyLearning },
] as const;

async function handle(): Promise<Response> {
  const started = Date.now();
  const results = await Promise.allSettled(JOBS.map((j) => j.fn()));
  const summary = results.map((r, i) => {
    const name = JOBS[i].name;
    if (r.status === "fulfilled") return { status: "ok", ...r.value };
    return { status: "error", report: name, error: r.reason instanceof Error ? r.reason.message : String(r.reason) };
  });
  const anyError = summary.some((s) => s.status === "error");
  return Response.json({ ok: !anyError, results: summary, ms: Date.now() - started }, { status: anyError ? 207 : 200 });
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return await handle();
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return await handle();
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}