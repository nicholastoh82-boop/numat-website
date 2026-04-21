// app/api/cron/daily-reports/route.ts
//
// Consolidated replacement for three daily n8n workflows, running in parallel:
//   1. NARA — Insight Incorporator (daily 7am MYT)
//   2. NUMAT — Deal Stage Nudge (daily 8am MYT Mon-Fri)
//   3. numat_daily_campaign_report (daily 8am MYT)
//
// Scheduled via Supabase pg_cron. Mon-Fri only.

import {
  authorized,
  sendGmail,
  supabaseGet,
  supabaseGetRaw,
  supabasePost,
  supabasePatch,
  supabaseRpc,
} from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================================
// Job 1: NARA Insight Incorporator
// ============================================================================

type TrainingInsight = {
  id: string;
  insight_type: string | null;
  suggested_kb_entry_question: string | null;
  suggested_kb_entry_answer: string | null;
  language: string | null;
  dialect: string | null;
};

async function runNaraInsightIncorporator() {
  const insights = await supabaseGet<TrainingInsight[]>("nara_training_insights", {
    select: "*",
    status: "eq.approved",
    suggested_kb_entry_question: "not.is.null",
    order: "created_at.asc",
  });

  if (!insights.length) return { job: "nara_insight_incorporator", processed: 0 };

  const kbInserts = insights.map((i) => ({
    category: i.insight_type === "cultural_cue" ? "internal" : "faq",
    question: i.suggested_kb_entry_question,
    answer: i.suggested_kb_entry_answer,
    keywords: (i.suggested_kb_entry_question ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 8),
    is_active: true,
    language: i.language ?? "en",
    dialect: i.dialect,
  }));

  await supabasePost("nara_knowledge", kbInserts);

  const ids = insights.map((i) => i.id);
  const idsCsv = ids.map((id) => encodeURIComponent(id)).join(",");
  await supabasePatch(`nara_training_insights?id=in.(${idsCsv})`, {
    status: "incorporated",
    approved_at: new Date().toISOString(),
  });

  const count = insights.length;
  const plural = count === 1 ? " has" : "s have";
  await sendGmail({
    from: "Nick",
    to: "nick@numat.ph",
    subject: `NARA: ${count} approved insights incorporated into knowledge base`,
    html: `<p>Hi Nic,</p><p>${count} approved insight${plural} been added to NARA's knowledge base. NARA is now using these on every conversation.</p><p>To see them, query nara_knowledge in Supabase ordered by created_at desc, or check nara_training_insights where status = incorporated.</p>`,
  });

  return { job: "nara_insight_incorporator", processed: count };
}

// ============================================================================
// Job 2: Deal Stage Nudge
// ============================================================================

type StalledLead = {
  id: string;
  full_name: string;
  company: string | null;
  email: string;
  rep_assigned: string | null;
  rep_email: string | null;
  pipeline_stage: string | null;
  last_activity_at: string | null;
  last_activity_type: string | null;
  replied_at: string | null;
  quoted_at: string | null;
  reply_summary: string | null;
  reply_next_step: string | null;
  priority_score: number | null;
  priority_tier: string | null;
  country: string | null;
  title: string | null;
};

type ClassifiedLead = StalledLead & {
  reason: "needs_quote" | "quote_followup" | "stalled_deal";
  priority: number;
  days_stalled: number;
  action: string;
};

function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  return Math.floor((now - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}
function normalizeStage(s: string | null): string {
  return s ? String(s).toLowerCase().replace(/\s+/g, "_") : "";
}
function isClosedStage(s: string | null): boolean {
  return ["won", "lost", "dead", "archived", "closed", "unsubscribed"].includes(normalizeStage(s));
}
function isProgressStage(s: string | null): boolean {
  return ["contacted", "qualified", "engaged", "interested", "negotiating", "meeting_booked", "proposal_sent"].includes(
    normalizeStage(s)
  );
}
function classify(lead: StalledLead, now: number): ClassifiedLead | null {
  const repliedDays = daysSince(lead.replied_at, now);
  const quotedDays = daysSince(lead.quoted_at, now);
  const activityDays = daysSince(lead.last_activity_at, now);
  if (isClosedStage(lead.pipeline_stage)) return null;
  if (lead.replied_at && !lead.quoted_at && repliedDays !== null && repliedDays >= 3) {
    return { ...lead, reason: "needs_quote", priority: 1, days_stalled: repliedDays, action: `Send quote. They replied ${repliedDays} days ago.` };
  }
  if (lead.quoted_at && quotedDays !== null && quotedDays >= 5) {
    return { ...lead, reason: "quote_followup", priority: 2, days_stalled: quotedDays, action: `Follow up on quote, sent ${quotedDays} days ago with no response.` };
  }
  if (isProgressStage(lead.pipeline_stage) && activityDays !== null && activityDays >= 7) {
    return { ...lead, reason: "stalled_deal", priority: 3, days_stalled: activityDays, action: `Keep deal alive. No activity in ${activityDays} days.` };
  }
  return null;
}

function digestHtml(rep: string, count: number, byReason: Record<string, ClassifiedLead[]>): string {
  const rowHtml = (l: ClassifiedLead) => {
    const ctx =
      l.reason === "needs_quote"
        ? `Reply: <em>${(l.reply_summary ?? "").slice(0, 140)}</em>`
        : l.reason === "quote_followup"
        ? `Quote sent ${l.days_stalled} days ago, awaiting response`
        : `Last activity: ${l.last_activity_type ?? "n/a"} (${l.days_stalled} days ago)`;
    const tierColor = l.priority_tier === "hot" ? "#B91C1C" : l.priority_tier === "warm" ? "#C2410C" : "#3C4A40";
    return `<tr>
      <td style="padding:10px;border-bottom:1px solid #E4EAE5;vertical-align:top;"><strong>${l.full_name}</strong><br><span style="color:#8A958D;font-size:12px;">${l.title ?? ""}${l.title && l.company ? " · " : ""}${l.company ?? ""}</span><br><span style="color:#8A958D;font-size:12px;">${l.email} · ${l.country ?? ""}</span></td>
      <td style="padding:10px;border-bottom:1px solid #E4EAE5;vertical-align:top;font-size:12px;color:#3C4A40;">${ctx}<br>${l.reply_next_step ? `<strong>Next step:</strong> ${l.reply_next_step}` : ""}</td>
      <td style="padding:10px;border-bottom:1px solid #E4EAE5;vertical-align:top;text-align:center;font-size:12px;"><strong style="color:${tierColor};">${l.priority_tier ?? "-"}</strong><br><span style="color:#8A958D;">${l.priority_score ?? 0}</span></td>
    </tr>`;
  };
  const section = (title: string, rows: ClassifiedLead[]) => {
    if (!rows.length) return "";
    return `<h2 style="color:#2F5D3A;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin-top:24px;margin-bottom:8px;">${title} (${rows.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead><tr style="background-color:#F0F6F1;"><th style="padding:8px;text-align:left;font-size:11px;color:#2F5D3A;text-transform:uppercase;">Lead</th><th style="padding:8px;text-align:left;font-size:11px;color:#2F5D3A;text-transform:uppercase;">Context + Next Step</th><th style="padding:8px;text-align:center;font-size:11px;color:#2F5D3A;text-transform:uppercase;">Priority</th></tr></thead>
      <tbody>${rows.map(rowHtml).join("")}</tbody>
    </table>`;
  };
  return `<div style="font-family:Arial,sans-serif;max-width:800px;color:#0F1F14;background:#ffffff;padding:20px;">
    <h1 style="color:#2F5D3A;font-size:20px;margin-bottom:4px;">Your daily pipeline nudge</h1>
    <p style="color:#8A958D;font-size:13px;margin-top:0;">${count} lead${count === 1 ? "" : "s"} waiting on action, ${rep}.</p>
    ${section("Needs quote", byReason.needs_quote ?? [])}
    ${section("Quote sent, no response", byReason.quote_followup ?? [])}
    ${section("Stalled deals", byReason.stalled_deal ?? [])}
    <p style="margin-top:32px;color:#8A958D;font-size:12px;border-top:1px solid #E4EAE5;padding-top:16px;">This digest is generated daily by the NUMAT automation system.<br>Open the CRM: <a href="https://numatbamboo.com/crm" style="color:#2F5D3A;">numatbamboo.com/crm</a></p>
  </div>`;
}

async function runDealStageNudge() {
  const d3 = new Date(Date.now() - 3 * 86400_000).toISOString();
  const d5 = new Date(Date.now() - 5 * 86400_000).toISOString();
  const d7 = new Date(Date.now() - 7 * 86400_000).toISOString();
  const orFilter =
    `or=(and(replied_at.gte.2020-01-01,quoted_at.is.null,replied_at.lt.${d3}),` +
    `and(quoted_at.lt.${d5}),` +
    `and(last_activity_at.lt.${d7},pipeline_stage.not.in.(won,Won,lost,Dead,archived)))`;
  const select =
    "select=id,full_name,company,email,rep_assigned,rep_email,pipeline_stage,last_activity_at,last_activity_type,replied_at,quoted_at,reply_summary,reply_next_step,priority_score,priority_tier,country,title";
  const path = `master_leads?${orFilter}&${select}&order=priority_score.desc.nullslast&limit=500`;
  const leads = await supabaseGetRaw<StalledLead[]>(path);

  const now = Date.now();
  const classified = leads.map((l) => classify(l, now)).filter((l): l is ClassifiedLead => !!l);

  if (classified.length === 0) return { job: "deal_stage_nudge", reps: 0, leads: 0 };

  const groups: Record<string, { rep: string; rep_email: string; leads: ClassifiedLead[] }> = {};
  for (const lead of classified) {
    const rep = lead.rep_assigned ?? "Unassigned";
    const rep_email = lead.rep_email ?? "nick@numat.ph";
    if (!groups[rep]) groups[rep] = { rep, rep_email, leads: [] };
    groups[rep].leads.push(lead);
  }

  let repsNudged = 0;
  let leadsNudged = 0;
  const allLeadIds: string[] = [];

  for (const g of Object.values(groups)) {
    const sorted = g.leads.sort((a, b) => a.priority - b.priority || (b.priority_score ?? 0) - (a.priority_score ?? 0));
    const byReason: Record<string, ClassifiedLead[]> = { needs_quote: [], quote_followup: [], stalled_deal: [] };
    for (const l of sorted) byReason[l.reason].push(l);
    const html = digestHtml(g.rep, sorted.length, byReason);
    await sendGmail({
      from: "Nick",
      to: g.rep_email,
      subject: `Daily nudge: ${sorted.length} lead${sorted.length === 1 ? " needs" : "s need"} action`,
      html,
    });
    repsNudged++;
    leadsNudged += sorted.length;
    allLeadIds.push(...sorted.map((l) => l.id));
  }

  if (allLeadIds.length) {
    const idsCsv = allLeadIds.map((id) => encodeURIComponent(id)).join(",");
    await supabasePatch(`master_leads?id=in.(${idsCsv})`, {
      rep_nudged_at: new Date().toISOString(),
      rep_nudge_count: 1,
    });
  }

  return { job: "deal_stage_nudge", reps: repsNudged, leads: leadsNudged };
}

// ============================================================================
// Job 3: Daily Campaign Report
// ============================================================================

async function runDailyCampaignReport() {
  // RPC returns jsonb: { subject, html }
  const result = await supabaseRpc<{ subject?: string; html?: string } | null>("generate_daily_campaign_email", {
    p_campaign_id: "MULTI_REP_APR20_2026",
  });
  if (!result || !result.subject || !result.html) {
    return { job: "daily_campaign_report", sent: false, reason: "empty_rpc_result" };
  }
  await sendGmail({
    from: "Nick",
    to: "nick@numat.ph",
    subject: result.subject,
    html: result.html,
  });
  return { job: "daily_campaign_report", sent: true };
}

// ============================================================================
// Entry point
// ============================================================================

async function handle(): Promise<Response> {
  const started = Date.now();
  const results = await Promise.allSettled([
    runNaraInsightIncorporator(),
    runDealStageNudge(),
    runDailyCampaignReport(),
  ]);

  const summary = results.map((r, i) => {
    const jobNames = ["nara_insight_incorporator", "deal_stage_nudge", "daily_campaign_report"];
    if (r.status === "fulfilled") return { status: "ok", ...r.value };
    return { status: "error", job: jobNames[i], error: r.reason instanceof Error ? r.reason.message : String(r.reason) };
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