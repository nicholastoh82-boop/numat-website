// app/api/cron/apollo-pool-pull/route.ts
//
// Daily Apollo pull into the universal lead pool.
// Targets ICPs that are useful for current and future businesses (Kastelon
// today, future ventures later), distinct from the NUMAT-focused
// architects / interior_designers / construction / property_developers /
// hotels_resorts segments handled by apollo-leads-refresh.
//
// New rows are stamped with:
//   source            = 'apollo_pool'
//   intended_business = 'pool'
//   enrichment_tier   = 'basic'  (Apollo gives us verified email)
//   source_payload    = full Apollo person object (for audit / re-normalize)
//   last_enriched_at  = now()
//
// Flow per run:
//   1. Authorize (Bearer CRON_SECRET, constant-time compare)
//   2. Fetch existing dedup_keys from master_leads (one query, Set for O(1))
//   3. For each pool segment in parallel:
//      a. POST Apollo /api/v1/mixed_people/api_search
//      b. Filter to verified-email prospects
//      c. Compute dedup_key, skip if already in master_leads
//      d. Bulk insert remaining rows with resolution=ignore-duplicates
//   4. Return per-segment + totals JSON summary
//
// Schedule: hook this up via Supabase pg_cron or vercel.json, e.g. 6am MYT
// daily so it runs after sleep but before the existing apollo-leads-refresh
// at 7am. Conservative per_page=25 to keep Apollo credit burn predictable.

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
// Pool segments (broader than NUMAT; sized for current and future businesses)
// ============================================================================

type Segment = {
  segment: string;
  titles: string[];
  locations: string[];
  employee_ranges: string[];
  seniorities: string[];
};

const POOL_SEGMENTS: Segment[] = [
  {
    // Founders and owner operators of micro / small businesses in core SEA.
    // Best fit for Kastelon's "business you have spent a lifetime building"
    // ICP. Also useful as a long term general purpose pool.
    segment: "pool_smb_owners",
    titles: [
      "Founder",
      "Co-Founder",
      "Owner",
      "Managing Director",
      "Director",
    ],
    locations: ["Malaysia", "Singapore", "Philippines"],
    employee_ranges: ["1,50"],
    seniorities: ["founder", "owner", "c_suite"],
  },
  {
    // C-suite of small to mid sized B2B companies, regional. Useful for
    // both Kastelon and any future B2B venture.
    segment: "pool_smb_executives",
    titles: [
      "CEO",
      "COO",
      "CFO",
      "General Manager",
      "Managing Director",
    ],
    locations: ["Malaysia", "Singapore", "Philippines", "Thailand", "Indonesia"],
    employee_ranges: ["11,200"],
    seniorities: ["c_suite", "owner", "founder"],
  },
];

// ============================================================================
// Apollo response types
// ============================================================================

type ApolloPerson = {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  email_status?: string;
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

type ApolloSearchResponse = {
  people?: ApolloPerson[];
  pagination?: { page: number; per_page: number; total_entries: number };
};

// ============================================================================
// Apollo search
// ============================================================================

async function apolloSearch(seg: Segment, perPage = 25): Promise<ApolloPerson[]> {
  const apiKey = required("APOLLO_API_KEY");
  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      per_page: perPage,
      page: 1,
      person_titles: seg.titles,
      person_locations: seg.locations,
      organization_num_employees_ranges: seg.employee_ranges,
      person_seniorities: seg.seniorities,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo search (${seg.segment}) failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as ApolloSearchResponse;
  return data.people ?? [];
}

// ============================================================================
// Dedup helpers
// ============================================================================

function computeDedupKey(
  email?: string,
  company?: string,
  fullName?: string,
  linkedinUrl?: string,
): string | null {
  const e = email?.trim().toLowerCase();
  const c = company?.trim().toLowerCase();
  const n = fullName?.trim().toLowerCase();
  const l = linkedinUrl?.trim().toLowerCase();
  if (e && e.length > 0) return e;
  if (c && n) return `${c}|${n}`;
  if (c && l) return `${c}|${l}`;
  return null;
}

async function fetchExistingDedupKeys(): Promise<Set<string>> {
  // Pull only dedup_keys from master_leads. ~8.8k rows is fine for a single
  // GET; if the pool grows past ~50k, switch to a hashed Bloom filter or
  // per-insert lookup.
  const rows = await supabaseGetRaw<Array<{ dedup_key: string | null }>>(
    "master_leads?select=dedup_key&dedup_key=not.is.null",
  );
  const set = new Set<string>();
  for (const r of rows) {
    if (r.dedup_key) set.add(r.dedup_key);
  }
  return set;
}

// ============================================================================
// Lead row builder
// ============================================================================

type LeadInsert = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  title?: string;
  company?: string;
  company_domain?: string;
  country?: string;
  city?: string;
  linkedin_url?: string;
  segment: string;
  source: string;
  apollo_person_id: string;
  intended_business: string;
  enrichment_tier: string;
  last_enriched_at: string;
  source_payload: ApolloPerson;
};

function buildLeadInsert(p: ApolloPerson, segName: string): LeadInsert | null {
  // Only keep verified email prospects. Apollo email_status values:
  //   verified  = good
  //   guessed   = pattern matched, not confirmed (skip for pool quality)
  //   unavailable | locked | null = no email (skip)
  if (!p.email || p.email_status !== "verified") return null;

  const fullName =
    p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" ") ?? undefined;

  return {
    first_name: p.first_name,
    last_name: p.last_name,
    full_name: fullName || undefined,
    email: p.email.trim().toLowerCase(),
    title: p.title,
    company: p.organization?.name,
    company_domain: p.organization?.primary_domain,
    country: p.country,
    city: p.city,
    linkedin_url: p.linkedin_url,
    segment: segName,
    source: "apollo_pool",
    apollo_person_id: p.id,
    intended_business: "pool",
    enrichment_tier: "basic",
    last_enriched_at: new Date().toISOString(),
    source_payload: p,
  };
}

// ============================================================================
// Per-segment runner
// ============================================================================

type SegmentResult = {
  segment: string;
  fetched: number;
  verified_email: number;
  new_inserts: number;
  skipped_duplicates: number;
  error?: string;
};

async function processSegment(
  seg: Segment,
  existingKeys: Set<string>,
): Promise<SegmentResult> {
  const result: SegmentResult = {
    segment: seg.segment,
    fetched: 0,
    verified_email: 0,
    new_inserts: 0,
    skipped_duplicates: 0,
  };

  try {
    const people = await apolloSearch(seg, 25);
    result.fetched = people.length;

    const inserts: LeadInsert[] = [];
    for (const p of people) {
      const row = buildLeadInsert(p, seg.segment);
      if (!row) continue;
      result.verified_email += 1;

      const key = computeDedupKey(
        row.email,
        row.company,
        row.full_name,
        row.linkedin_url,
      );
      if (key && existingKeys.has(key)) {
        result.skipped_duplicates += 1;
        continue;
      }
      // Prevent duplicates within this single batch as well.
      if (key) existingKeys.add(key);
      inserts.push(row);
    }

    if (inserts.length > 0) {
      // resolution=ignore-duplicates protects against any DB-level unique
      // constraints we add later (e.g. on apollo_person_id) without
      // changing this code.
      await supabasePost(
        "master_leads",
        inserts,
        "return=minimal,resolution=ignore-duplicates",
      );
      result.new_inserts = inserts.length;
    }
  } catch (err) {
    result.error = (err as Error).message;
  }

  return result;
}

// ============================================================================
// Route handler
// ============================================================================

export async function GET(req: Request) {
  if (!authorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = new Date().toISOString();

  let existingKeys: Set<string>;
  try {
    existingKeys = await fetchExistingDedupKeys();
  } catch (err) {
    return Response.json(
      {
        ok: false,
        started_at: startedAt,
        error: `Failed to fetch existing dedup keys: ${(err as Error).message}`,
      },
      { status: 500 },
    );
  }

  const results = await Promise.all(
    POOL_SEGMENTS.map((seg) => processSegment(seg, existingKeys)),
  );

  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.fetched,
      verified_email: acc.verified_email + r.verified_email,
      new_inserts: acc.new_inserts + r.new_inserts,
      skipped_duplicates: acc.skipped_duplicates + r.skipped_duplicates,
      errors: acc.errors + (r.error ? 1 : 0),
    }),
    {
      fetched: 0,
      verified_email: 0,
      new_inserts: 0,
      skipped_duplicates: 0,
      errors: 0,
    },
  );

  return Response.json({
    ok: totals.errors === 0,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    totals,
    by_segment: results,
  });
}
