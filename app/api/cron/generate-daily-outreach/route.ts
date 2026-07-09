// app/api/cron/generate-daily-outreach/route.ts
//
// Vercel Cron: 7am MYT Mon to Fri (cron 0 23 * * 0-4 in UTC).
//
// Generates touch 1 cold outreach drafts for the next batch of leads:
//   - 20 best international leads for Mohan (excluding Philippines)
//   - 20 best Philippines leads for Eugene
//
// Eligibility:
//   - enrichment_tier = 'enriched'
//   - icp_fit_score >= 60
//   - has an email and is not unsubscribed
//   - not already in email_drafts
//   - not already in sequence_events as 'sent'
//
// Each draft is created via Gemini Flash with a tightly-prompted template
// that follows the NUMAT cold outreach rules (no certs/jargon, correct
// signature title, no hyphens).
//
// Output: rows inserted into email_drafts with status 'pending_review'.
// The send-daily-outreach-digest cron runs at 8am MYT and emails these
// to the relevant rep from nick@numat.ph.

import { authorized, supabaseGetRaw, supabasePost } from '@/lib/cron/helpers';
import { callGeminiProxy, extractText } from '@/lib/cron/vertex_proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PER_REP_DEFAULT = 20;
const CONCURRENCY = 8;
const SEQUENCE_NAME = 'cold_outreach_v1';
const FORMAT_VERSION = '2026-05-21-touch1';

type LeadRow = {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  segment: string | null;
  business_description: string | null;
  icp_fit_reason: string | null;
  pain_hooks: string[] | null;
  product_recommendations: string[] | null;
  buying_signal_summary: string | null;
  buying_signal_strength: string | null;
  buying_signal_detected_at: string | null;
  icp_fit_score: number | null;
};

type RepConfig = {
  key: string;
  email: string;
  full_name: string;
  title: string;
  filter: 'international' | 'philippines';
};

const REPS: RepConfig[] = [
  {
    key: 'erica_intl',
    email: 'erica@numat.ph',
    full_name: 'Erica Lu',
    title: 'Chief Marketing Officer',
    filter: 'international',
  },
  {
    key: 'erica_ph',
    email: 'erica@numat.ph',
    full_name: 'Erica Lu',
    title: 'Chief Marketing Officer',
    filter: 'philippines',
  },
  {
    key: 'janna_intl',
    email: 'janna@numat.ph',
    full_name: 'Janna Gutierez',
    title: 'Sales Representative',
    filter: 'international',
  },
  {
    key: 'lionel_ph',
    email: 'lionel@numat.ph',
    full_name: 'Lionel Tolibas',
    title: 'Sales Representative',
    filter: 'philippines',
  },
];

function batchSize(): number {
  const raw = process.env.OUTREACH_PER_REP;
  const n = raw ? parseInt(raw, 10) : PER_REP_DEFAULT;
  if (!Number.isFinite(n) || n <= 0) return PER_REP_DEFAULT;
  return Math.min(n, 50);
}

async function pickLeadsForRep(rep: RepConfig, limit: number): Promise<LeadRow[]> {
  // Use a raw or filter for country matching since we need to either include
  // Philippines or exclude it. PostgREST or filter syntax handles this.
  const countryFilter =
    rep.filter === 'philippines'
      ? 'country=eq.Philippines'
      : 'country=neq.Philippines';

  // Pull more than we need so we can drop any that already exist in
  // email_drafts, sequence_events, or share a company we just picked.
  const overshoot = Math.min(limit * 6, 200);
  const select =
    'id,email,full_name,first_name,company,country,city,segment,' +
    'business_description,icp_fit_reason,pain_hooks,product_recommendations,' +
    'buying_signal_summary,buying_signal_strength,buying_signal_detected_at,icp_fit_score';
  // Order so that leads with a fresh hot/warm buying signal float to the top,
  // then by ICP fit. buying_signal_detected_at is only set for hot/warm leads
  // (cold/none leave it null), so nullslast naturally demotes unsignalled leads.
  const path =
    'master_leads' +
    `?select=${select}` +
    `&enrichment_tier=eq.enriched` +
    `&icp_fit_score=gte.60` +
    `&email=not.is.null` +
    `&email=neq.` +
    `&status=neq.unsubscribed` +
    `&${countryFilter}` +
    `&order=buying_signal_detected_at.desc.nullslast,icp_fit_score.desc,priority_score.desc.nullslast,created_at.asc` +
    `&limit=${overshoot}`;
  const candidates = (await supabaseGetRaw<LeadRow[]>(path)) ?? [];

  if (candidates.length === 0) return [];

  // Filter out leads that already have a draft (by lead_id), AND leads
  // whose EMAIL DOMAIN has any prior outreach in sequence_events (so we
  // never email two different people at the same firm via this pipeline).
  // Domain is the reliable signal; fuzzy company name matching produced too
  // many false positives because of shared common words like "Architects",
  // "Design", "Group" etc.
  //
  // Personal email domains (gmail, yahoo, hotmail, outlook, icloud,
  // protonmail, live) are excluded from the domain filter because many
  // different companies share them. For personal-domain leads we still
  // dedupe by exact email and by lead_id.
  const personalDomains = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'protonmail.com',
    'live.com',
  ]);

  const ids = Array.from(new Set(candidates.map((c) => c.id))).filter(Boolean);
  const domains = Array.from(
    new Set(
      candidates
        .map((c) => (c.email ? c.email.split('@')[1]?.toLowerCase() : null))
        .filter((d): d is string => !!d && !personalDomains.has(d))
    )
  );

  const draftedIds = new Set<string>();
  const contactedDomains = new Set<string>();
  const blocklistedDomains = new Set<string>();
  try {
    const inIds = ids.map((i) => `"${i}"`).join(',');
    if (inIds) {
      const drafts = await supabaseGetRaw<Array<{ lead_id: string | null }>>(
        `email_drafts?select=lead_id&lead_id=in.(${encodeURIComponent(inIds)})`
      );
      for (const d of drafts) if (d.lead_id) draftedIds.add(d.lead_id);
    }
  } catch {}
  try {
    // Pull the full do_not_contact_domains table once per run. The list is
    // typically small (under 100 rows even after months) so we just grab it
    // all rather than filtering by candidate domains.
    const rows = await supabaseGetRaw<Array<{ domain: string }>>(
      `do_not_contact_domains?select=domain&limit=10000`
    );
    for (const r of rows) {
      if (r.domain) blocklistedDomains.add(r.domain.toLowerCase());
    }
  } catch {}
  try {
    // Pull email column from sequence_events for these domains. PostgREST
    // doesn't have a direct domain operator, so we fetch the rows whose
    // email ends with @{domain} and group client side. Cheap because the
    // domain list is small.
    if (domains.length > 0) {
      const orClauses = domains
        .map((d) => `email.ilike.*@${d.replace(/[%_\\]/g, '\\$&')}`)
        .join(',');
      const events = await supabaseGetRaw<Array<{ email: string }>>(
        `sequence_events?select=email&event_type=eq.sent&or=(${encodeURIComponent(
          orClauses
        )})`
      );
      for (const e of events) {
        const d = e.email?.split('@')[1]?.toLowerCase();
        if (d) contactedDomains.add(d);
      }
    }
  } catch {}

  const fresh = candidates.filter((c) => {
    if (draftedIds.has(c.id)) return false;
    const d = c.email?.split('@')[1]?.toLowerCase();
    if (d) {
      if (blocklistedDomains.has(d)) return false;
      if (!personalDomains.has(d) && contactedDomains.has(d)) return false;
    }
    return true;
  });

  // Within this batch, only one lead per email domain (so we don't email
  // five different people at the same firm in one go).
  const seenDomains = new Set<string>();
  const oneEach: LeadRow[] = [];
  for (const c of fresh) {
    const d = c.email?.split('@')[1]?.toLowerCase();
    if (d && !personalDomains.has(d)) {
      if (seenDomains.has(d)) continue;
      seenDomains.add(d);
    }
    oneEach.push(c);
    if (oneEach.length >= limit) break;
  }
  return oneEach;
}

function buildPrompt(lead: LeadRow, rep: RepConfig): string {
  const hooks = (lead.pain_hooks || []).slice(0, 2).join('; ');
  const productRecs = (lead.product_recommendations || []).slice(0, 2).join(', ');

  // When the radar found a fresh hot or warm signal, instruct the model to
  // open with it. This is the single biggest reply-rate lever: referencing a
  // specific recent event the prospect cares about.
  const hasSignal =
    (lead.buying_signal_strength === 'hot' || lead.buying_signal_strength === 'warm') &&
    !!lead.buying_signal_summary;
  const signalInstruction = hasSignal
    ? `\n\nIMPORTANT SIGNAL: This company has a recent buying signal (${lead.buying_signal_strength}): "${lead.buying_signal_summary}". Open the email by referencing this specific event in a natural, non-creepy way (for example "I saw that ..."). Do not exaggerate or invent details beyond what the signal states. This opener is the most important part of the email.`
    : '';

  return `You are drafting a cold outreach email for NUMAT Sustainable Manufacturing Inc., a Philippine engineered bamboo manufacturer. Write the FIRST touch in a sequence.

RECIPIENT CONTEXT:
Name: ${lead.first_name || lead.full_name || 'there'}
Company: ${lead.company || 'Unknown'}
Country: ${lead.country || 'Unknown'}
City: ${lead.city || 'Unknown'}
Business description: ${lead.business_description || 'N/A'}
ICP fit reason: ${lead.icp_fit_reason || 'N/A'}
Buying signal observed: ${lead.buying_signal_summary || 'None'}${signalInstruction}
Pain hooks: ${hooks || 'N/A'}
Recommended NUMAT products for this lead: ${productRecs || 'general'}

SENDER:
${rep.full_name}, ${rep.title}, NUMAT Sustainable Manufacturing Inc.

NUMAT PRODUCTS (only push the ones that fit the lead):
- NuBam Boards: engineered bamboo sheet goods for furniture, joinery, cabinetry
- NuWall: bamboo wall panels and cladding for interior fit out
- NuDoor: bamboo door panels and frames
- NuFloor: bamboo flooring for residential and commercial
- NuSlat: decorative bamboo slat panels for ceilings, walls, partitions

STRICT RULES:
1. Never claim certifications, LEED credits, fire ratings, acoustic ratings, ASTM ratings, or Class A ratings. NUMAT has none.
2. No shortforms or industry jargon. Plain professional English.
3. Never use hyphens or dashes anywhere. Rewrite with commas, parentheses, or new sentences.
4. Do not invent project names or facts. Reference only what is in the recipient context above.
5. Use the recommended NUMAT products as the product push, but rephrase naturally. Do not list 5 products. Pick 1 or 2 that fit.
6. Word count: 110 to 150 words in the body, not counting subject or signature.
7. End with a clear single ask: a short call next week OR a sample box to a specific address.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "subject": "specific subject line referencing a fact from the recipient context, under 80 chars",
  "body": "the full email body starting with the greeting Hi {first name},\\n\\n and ending before the signature block. Use \\n\\n for paragraph breaks. Do not include the signature.",
  "product_push": ["NuBam Boards"]
}`;
}

type DraftOutput = {
  subject: string;
  body: string;
  product_push: string[];
};

async function generateOneDraft(lead: LeadRow, rep: RepConfig): Promise<DraftOutput> {
  const prompt = buildPrompt(lead, rep);
  const data = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.4,
      max_output_tokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = extractText(data);
  if (!text) throw new Error('Gemini returned no text');
  // Strip markdown code fences in case the model wraps the JSON despite the
  // application/json mime type. Without this, a wrapped response fails JSON.parse
  // for every lead and the run produces zero drafts.
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as DraftOutput;
  if (!parsed.subject || !parsed.body) throw new Error('Gemini returned incomplete draft');
  return parsed;
}

function composeFinalBody(body: string, rep: RepConfig): string {
  // Append a uniform signature so the prompt doesn't have to handle it.
  return (
    body.trim() +
    `\n\nBest,\n${rep.full_name}\n${rep.title}\nNUMAT Sustainable Manufacturing Inc.`
  );
}

async function processRep(rep: RepConfig, limit: number) {
  const leads = await pickLeadsForRep(rep, limit);
  const results: Array<{
    lead_id: string;
    email: string;
    company: string | null;
    status: 'ok' | 'error';
    error?: string;
  }> = [];

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const slice = leads.slice(i, i + CONCURRENCY);
    const batch = await Promise.all(
      slice.map(async (lead) => {
        try {
          const draft = await generateOneDraft(lead, rep);
          const body = composeFinalBody(draft.body, rep);

          await supabasePost(
            'email_drafts',
            {
              lead_id: lead.id,
              recipient_email: lead.email,
              recipient_name: lead.full_name || lead.first_name,
              company: lead.company,
              rep_email: rep.email,
              rep_name: rep.full_name,
              subject: draft.subject.slice(0, 200),
              body,
              status: 'pending_review',
              buying_signal_strength: null,
              generated_by: 'claude_daily_outreach_v1',
            },
            'return=minimal'
          );

          return {
            lead_id: lead.id,
            email: lead.email,
            company: lead.company,
            status: 'ok' as const,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            lead_id: lead.id,
            email: lead.email,
            company: lead.company,
            status: 'error' as const,
            error: msg.slice(0, 200),
          };
        }
      })
    );
    results.push(...batch);
  }
  return { rep: rep.email, picked: leads.length, results };
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const perRep = batchSize();
  const repResults = [];
  for (const rep of REPS) {
    const r = await processRep(rep, perRep);
    repResults.push(r);
  }
  const okCount = repResults.reduce(
    (s, r) => s + r.results.filter((x) => x.status === 'ok').length,
    0
  );
  const errCount = repResults.reduce(
    (s, r) => s + r.results.filter((x) => x.status === 'error').length,
    0
  );
  console.log(
    '[generate-outreach]',
    JSON.stringify({
      per_rep: perRep,
      ok_count: okCount,
      err_count: errCount,
      reps: repResults.map((r) => ({
        rep: r.rep,
        picked: r.picked,
        first_error: r.results.find((x) => x.status === 'error')?.error ?? null,
      })),
    })
  );

  return Response.json({
    ok: true,
    per_rep: perRep,
    sequence_name: SEQUENCE_NAME,
    format_version: FORMAT_VERSION,
    ok_count: okCount,
    err_count: errCount,
    rep_results: repResults,
    ms: Date.now() - started,
  });
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
