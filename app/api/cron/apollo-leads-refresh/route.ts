// app/api/cron/apollo-leads-refresh/route.ts
//
// Replacement for n8n workflow `NUMAT — Apollo → master_leads (5 segments)`.
// Scheduled via Supabase pg_cron: Mon-Fri 7am MYT.
//
// Flow per run:
//   1. Fetch existing apollo_person_ids from master_leads (one query, Set for O(1) lookup)
//   2. For each of 5 segments in parallel:
//      a. POST Apollo /mixed_people/search
//      b. Filter to verified-email prospects, compute priority_score, assign rep
//      c. Dedupe against existing Apollo person IDs
//      d. For each batch of 10 new prospects: POST /people/bulk_match to enrich emails
//      e. Merge enriched emails back onto records
//      f. Bulk insert into master_leads (resolution=ignore-duplicates)
//   3. Return per-segment summary

import {
  authorized,
  required,
  supabaseGetRaw,
  supabasePost,
} from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================================
// Segment definitions (preserved from n8n workflow)
// ============================================================================

type Segment = {
  segment: string;
  titles: string[];
  keywords: string[];
  locations: string[];
  employee_ranges: string[];
};

const SEGMENTS: Segment[] = [
  {
    segment: "architects",
    titles: ["Principal Architect", "Senior Architect", "Project Architect", "Architect", "Design Director", "Head of Design", "Founding Partner"],
    keywords: ["architecture", "architect", "design studio", "architectural"],
    locations: ["Philippines", "Singapore", "Malaysia", "Thailand", "Indonesia", "Vietnam", "Australia", "New Zealand"],
    employee_ranges: ["11,5000"],
  },
  {
    segment: "interior_designers",
    titles: ["Interior Designer", "Senior Interior Designer", "Principal Designer", "Design Lead", "Interior Design Director", "Creative Director"],
    keywords: ["interior design", "interiors", "fit out", "fitout"],
    locations: ["Philippines", "Singapore", "Malaysia", "Thailand", "Indonesia", "Vietnam", "Australia", "New Zealand"],
    employee_ranges: ["11,2500"],
  },
  {
    segment: "construction",
    titles: ["Project Manager", "Construction Manager", "Procurement Manager", "Director of Construction", "VP Construction", "Head of Procurement"],
    keywords: ["construction", "general contractor", "contractor", "building"],
    locations: ["Philippines", "Singapore", "Malaysia", "Thailand", "Indonesia", "Vietnam", "Australia", "New Zealand"],
    employee_ranges: ["50,5000"],
  },
  {
    segment: "property_developers",
    titles: ["Head of Procurement", "Director of Development", "VP Development", "Project Director", "Development Manager", "Head of Construction"],
    keywords: ["real estate", "property development", "developer", "developments"],
    locations: ["Philippines", "Singapore", "Malaysia", "Thailand", "Indonesia", "Vietnam", "Australia", "New Zealand"],
    employee_ranges: ["50,5000"],
  },
  {
    segment: "hotels_resorts",
    titles: ["Procurement Manager", "General Manager", "Resort Manager", "F&B Director", "Director of Procurement", "Operations Manager"],
    keywords: ["hotel", "resort", "hospitality"],
    locations: ["Philippines", "Singapore", "Malaysia", "Thailand", "Indonesia", "Vietnam"],
    employee_ranges: ["50,5000"],
  },
];

// ============================================================================
// Types
// ============================================================================

type ApolloPerson = {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
  has_email?: boolean;
  title?: string;
  country?: string;
  city?: string;
  linkedin_url?: string;
  organization?: {
    name?: string;
    website_url?: string;
    primary_domain?: string;
    estimated_num_employees?: number;
  };
};

type ApolloSearchResponse = { people?: ApolloPerson[] };

type ApolloMatch = {
  id?: string;
  email?: string;
  linkedin_url?: string;
  country?: string;
};

type ApolloBulkMatchResponse = { matches?: ApolloMatch[] };

type LeadRecord = {
  apollo_person_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  title: string;
  company: string;
  company_domain: string;
  country: string;
  city: string;
  linkedin_url: string;
  segment: string;
  priority_score: number;
  priority_tier: "hot" | "warm" | "cool" | "cold";
  rep_assigned: "Bryan" | "Mohan";
  rep_email: string;
  status: string;
  source: string;
  lead_source: string;
  pipeline_stage: string;
  last_activity_at: string;
  last_activity_type: string;
};

// ============================================================================
// Scoring helpers
// ============================================================================

function computePriority(person: ApolloPerson, segment: string): number {
  let score = 0;
  const segmentScores: Record<string, number> = {
    architects: 28,
    interior_designers: 25,
    construction: 30,
    property_developers: 30,
    hotels_resorts: 22,
  };
  score += segmentScores[segment] ?? 15;

  const emp = person.organization?.estimated_num_employees ?? 0;
  if (emp >= 200 && emp <= 2000) score += 20;
  else if (emp >= 50 && emp < 200) score += 15;
  else if (emp > 2000) score += 12;
  else if (emp >= 11) score += 8;

  const c = (person.country ?? "").toLowerCase();
  const sea = ["philippines", "singapore", "malaysia", "thailand", "indonesia", "vietnam"];
  if (sea.includes(c)) score += 15;
  else if (["australia", "new zealand"].includes(c)) score += 10;
  else score += 5;

  const t = (person.title ?? "").toLowerCase();
  if (/director|vp|head|principal|chief|founder|owner/i.test(t)) score += 10;
  else if (/senior|lead|manager/i.test(t)) score += 7;
  else score += 4;

  if (person.email_status === "verified") score += 10;
  else if (person.has_email) score += 5;

  return Math.min(score, 100);
}

function tierFor(score: number): LeadRecord["priority_tier"] {
  if (score >= 75) return "hot";
  if (score >= 55) return "warm";
  if (score >= 35) return "cool";
  return "cold";
}

function assignRep(country: string): { rep_assigned: "Bryan" | "Mohan"; rep_email: string } {
  if ((country ?? "").toLowerCase() === "philippines") return { rep_assigned: "Bryan", rep_email: "bryan@numat.ph" };
  return { rep_assigned: "Mohan", rep_email: "mohan@numat.ph" };
}

// ============================================================================
// Apollo API
// ============================================================================

async function apolloSearch(seg: Segment): Promise<ApolloPerson[]> {
  const apiKey = required("APOLLO_API_KEY");
  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      per_page: 25,
      page: 1,
      person_titles: seg.titles,
      person_locations: seg.locations,
      q_organization_keyword_tags: seg.keywords,
      organization_num_employees_ranges: seg.employee_ranges,
      person_seniorities: ["manager", "director", "vp", "c_suite", "founder", "owner"],
    }),
  });
  if (!res.ok) throw new Error(`Apollo search (${seg.segment}) failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as ApolloSearchResponse;
  return data.people ?? [];
}

async function apolloBulkMatch(details: Array<{ id: string; first_name: string; last_name: string; organization_name: string }>): Promise<ApolloMatch[]> {
  const apiKey = required("APOLLO_API_KEY");
  const res = await fetch("https://api.apollo.io/api/v1/people/bulk_match", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({ reveal_personal_emails: false, details }),
  });
  if (!res.ok) throw new Error(`Apollo bulk_match failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as ApolloBulkMatchResponse;
  return data.matches ?? [];
}

// ============================================================================
// Per-segment pipeline
// ============================================================================

function toLeadRecord(p: ApolloPerson, segment: string): LeadRecord {
  const score = computePriority(p, segment);
  const rep = assignRep(p.country ?? "");
  return {
    apollo_person_id: p.id,
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    full_name: p.name ?? "",
    email: p.email ?? "",
    title: p.title ?? "",
    company: p.organization?.name ?? "",
    company_domain: p.organization?.website_url ?? p.organization?.primary_domain ?? "",
    country: p.country ?? "",
    city: p.city ?? "",
    linkedin_url: p.linkedin_url ?? "",
    segment,
    priority_score: score,
    priority_tier: tierFor(score),
    ...rep,
    status: "new",
    source: "apollo_search",
    lead_source: `apollo_${segment}`,
    pipeline_stage: "new",
    last_activity_at: new Date().toISOString(),
    last_activity_type: "apollo_discovered",
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runSegment(seg: Segment, existingIds: Set<string>) {
  const apolloReturned = await apolloSearch(seg);

  // The new /mixed_people/api_search endpoint does not return email addresses
  // or verification flags. We can't pre-filter, so we send all results through
  // bulk_match enrichment and filter by email presence afterwards.
  if (apolloReturned.length === 0) {
    return { segment: seg.segment, apollo_returned: 0, new_prospects: 0, inserted: 0 };
  }

  // Build lead records from search results (emails will be empty at this stage)
  const records = apolloReturned.map((p) => toLeadRecord(p, seg.segment));

  // Dedupe against existing apollo_person_ids
  const newRecords = records.filter((r) => !existingIds.has(r.apollo_person_id));
  if (newRecords.length === 0) {
    return { segment: seg.segment, apollo_returned: apolloReturned.length, new_prospects: 0, inserted: 0 };
  }

  // Enrich emails via bulk_match, in batches of 10
  const enriched: LeadRecord[] = [];
  for (const batch of chunk(newRecords, 10)) {
    const details = batch.map((r) => ({
      id: r.apollo_person_id,
      first_name: r.first_name,
      last_name: r.last_name,
      organization_name: r.company,
    }));
    try {
      const matches = await apolloBulkMatch(details);
      const emailMap = new Map<string, { email: string; linkedin_url: string; country: string }>();
      for (const m of matches) {
        if (m.id) {
          emailMap.set(m.id, {
            email: m.email ?? "",
            linkedin_url: m.linkedin_url ?? "",
            country: m.country ?? "",
          });
        }
      }
      for (const r of batch) {
        const e = emailMap.get(r.apollo_person_id);
        enriched.push({
          ...r,
          email: e?.email || r.email,
          linkedin_url: e?.linkedin_url || r.linkedin_url,
          country: e?.country || r.country,
        });
      }
    } catch (err) {
      // If a single batch fails, keep the original records (without enrichment) rather than losing them
      console.error(`bulk_match batch failed for ${seg.segment}:`, err);
      enriched.push(...batch);
    }
  }

  // Keep only records with a usable email
  const insertable = enriched.filter((r) => r.email && r.email.includes("@"));
  if (insertable.length === 0) {
    return { segment: seg.segment, apollo_returned: apolloReturned.length, new_prospects: newRecords.length, inserted: 0 };
  }

  // Bulk insert — duplicates silently ignored (unique constraint on apollo_person_id in DB)
  await supabasePost("master_leads", insertable, "return=minimal,resolution=ignore-duplicates");

  return {
    segment: seg.segment,
    apollo_returned: apolloReturned.length,
    new_prospects: newRecords.length,
    inserted: insertable.length,
  };
}

// ============================================================================
// Entry point
// ============================================================================

async function handle(): Promise<Response> {
  const started = Date.now();

  // One query for all existing apollo_person_ids
  const existing = await supabaseGetRaw<Array<{ apollo_person_id: string }>>(
    "master_leads?select=apollo_person_id&apollo_person_id=not.is.null&limit=50000"
  );
  const existingIds = new Set<string>();
  for (const row of existing) if (row.apollo_person_id) existingIds.add(row.apollo_person_id);

  // Run all 5 segments in parallel
  const results = await Promise.allSettled(SEGMENTS.map((s) => runSegment(s, existingIds)));

  const summary = results.map((r, i) => {
    if (r.status === "fulfilled") return { status: "ok", ...r.value };
    return {
      status: "error",
      segment: SEGMENTS[i].segment,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const anyError = summary.some((s) => s.status === "error");
  const totalInserted = summary.reduce((a, s) => a + ((s as { inserted?: number }).inserted ?? 0), 0);

  return Response.json(
    {
      ok: !anyError,
      existing_known: existingIds.size,
      total_inserted: totalInserted,
      results: summary,
      ms: Date.now() - started,
    },
    { status: anyError ? 207 : 200 }
  );
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