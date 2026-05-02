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
//   enrichment_tier   = 'basic'  (Apollo bulk_match gives us the email)
//   source_payload    = full Apollo person object (for audit / re-normalize)
//   last_enriched_at  = now()
//
// Flow per run:
//   1. Authorize (Bearer CRON_SECRET, constant-time compare)
//   2. Fetch existing apollo_person_ids and dedup_keys from master_leads
//      (two queries, two Sets for O(1) lookup)
//   3. For each pool segment in parallel:
//      a. POST /api/v1/mixed_people/api_search (returns prospects WITHOUT
//         emails; the api_search endpoint does not include email fields)
//      b. Skip prospects whose apollo_person_id is already in master_leads
//         (cheap pre-filter, saves bulk_match credits on duplicates)
//      c. Enrich the rest via /api/v1/people/bulk_match in batches of 10
//         (this is the credit-cost step; ~1 credit per person enriched)
//      d. Filter to prospects that came back with a usable email
//      e. Compute dedup_key, skip any that already exist (catches the case
//         where the same email exists under a different apollo_person_id,
//         e.g. someone moved companies)
//      f. Bulk insert remaining rows with resolution=ignore-duplicates
//   4. Return per-segment + totals JSON summary
//
// Schedule: hook this up via vercel.json or Supabase pg_cron, e.g. 6am MYT
// daily so it runs before the existing apollo-leads-refresh at 7am.
// Conservative per_page=25 to keep Apollo credit burn predictable.

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

type ApolloSearchResponse = {
  people?: ApolloPerson[];
  pagination?: { page: number; per_page: number; total_entries: number };
};

type ApolloMatch = {
  id?: string;
  email?: string;
  linkedin_url?: string;
  country?: string;
};

type ApolloBulkMatchResponse = { matches?: ApolloMatch[] };

// ============================================================================
// Apollo API
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

async function apolloBulkMatch(
  details: Array<{
    id: string;
    first_name: string;
    last_name: string;
    organization_name: string;
  }>,
): Promise<ApolloMatch[]> {
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo bulk_match failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as ApolloBulkMatchResponse;
  return data.matches ?? [];
}

// ============================================================================
// Helpers
// ============================================================================

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

async function fetchExistingApolloIds(): Promise<Set<string>> {
  const rows = await supabaseGetRaw<Array<{ apollo_person_id: string | null }>>(
    "master_leads?select=apollo_person_id&apollo_person_id=not.is.null&limit=50000",
  );
  const set = new Set<string>();
  for (const r of rows) {
    if (r.apollo_person_id) set.add(r.apollo_person_id);
  }
  return set;
}

async function fetchExistingDedupKeys(): Promise<Set<string>> {
  const rows = await supabaseGetRaw<Array<{ dedup_key: string | null }>>(
    "master_leads?select=dedup_key&dedup_key=not.is.null&limit=50000",
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
  email: string;
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
  // p.email is the post-bulk_match email here. Reject anything that doesn't
  // look like an email address.
  if (!p.email || !p.email.includes("@")) return null;

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
  new_prospects: number;       // after apollo_person_id dedup, before enrichment
  enriched_with_email: number; // how many came back from bulk_match with email
  skipped_dedup_key: number;   // already exist by email or company|name
  new_inserts: number;
  error?: string;
};

async function processSegment(
  seg: Segment,
  existingApolloIds: Set<string>,
  existingDedupKeys: Set<string>,
): Promise<SegmentResult> {
  const result: SegmentResult = {
    segment: seg.segment,
    fetched: 0,
    new_prospects: 0,
    enriched_with_email: 0,
    skipped_dedup_key: 0,
    new_inserts: 0,
  };

  try {
    // 1. Search Apollo
    const people = await apolloSearch(seg, 25);
    result.fetched = people.length;

    // 2. Skip prospects whose apollo_person_id we've already seen.
    //    Saves bulk_match credits on duplicates.
    const newPeople = people.filter((p) => !existingApolloIds.has(p.id));
    result.new_prospects = newPeople.length;
    if (newPeople.length === 0) {
      return result;
    }

    // Add to existingApolloIds so concurrent segments don't re-enrich the
    // same person. Apollo can return the same person under multiple
    // segment searches when filters overlap.
    for (const p of newPeople) existingApolloIds.add(p.id);

    // 3. Enrich emails via bulk_match in batches of 10. Failures inside a
    //    batch keep the originals (without email) so we lose nothing
    //    silently; they just won't pass the email filter at insert time.
    const enriched: ApolloPerson[] = [];
    for (const batch of chunk(newPeople, 10)) {
      const details = batch.map((p) => ({
        id: p.id,
        first_name: p.first_name ?? "",
        last_name: p.last_name ?? "",
        organization_name: p.organization?.name ?? "",
      }));
      try {
        const matches = await apolloBulkMatch(details);
        const matchMap = new Map<string, ApolloMatch>();
        for (const m of matches) {
          if (m.id) matchMap.set(m.id, m);
        }
        for (const p of batch) {
          const m = matchMap.get(p.id);
          enriched.push({
            ...p,
            email: m?.email ?? p.email,
            linkedin_url: m?.linkedin_url ?? p.linkedin_url,
            country: m?.country ?? p.country,
          });
        }
      } catch (err) {
        console.error(`bulk_match batch failed for ${seg.segment}:`, err);
        enriched.push(...batch);
      }
    }

    // 4. Build inserts. Filter to those with usable email + not already in
    //    master_leads by dedup_key (catches cross-source duplicates).
    const inserts: LeadInsert[] = [];
    for (const p of enriched) {
      const row = buildLeadInsert(p, seg.segment);
      if (!row) continue;
      result.enriched_with_email += 1;

      const key = computeDedupKey(
        row.email,
        row.company,
        row.full_name,
        row.linkedin_url,
      );
      if (key && existingDedupKeys.has(key)) {
        result.skipped_dedup_key += 1;
        continue;
      }
      if (key) existingDedupKeys.add(key);
      inserts.push(row);
    }

    // 5. Insert
    if (inserts.length > 0) {
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

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  let existingApolloIds: Set<string>;
  let existingDedupKeys: Set<string>;
  try {
    [existingApolloIds, existingDedupKeys] = await Promise.all([
      fetchExistingApolloIds(),
      fetchExistingDedupKeys(),
    ]);
  } catch (err) {
    return Response.json(
      {
        ok: false,
        started_at: startedAt,
        error: `Failed to fetch existing dedup state: ${(err as Error).message}`,
      },
      { status: 500 },
    );
  }

  // Run segments sequentially rather than in parallel so bulk_match calls
  // don't double-enrich a person who appears in both segments. Sequential
  // also avoids hitting Apollo rate limits on adjacent calls.
  const results: SegmentResult[] = [];
  for (const seg of POOL_SEGMENTS) {
    results.push(await processSegment(seg, existingApolloIds, existingDedupKeys));
  }

  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.fetched,
      new_prospects: acc.new_prospects + r.new_prospects,
      enriched_with_email: acc.enriched_with_email + r.enriched_with_email,
      skipped_dedup_key: acc.skipped_dedup_key + r.skipped_dedup_key,
      new_inserts: acc.new_inserts + r.new_inserts,
      errors: acc.errors + (r.error ? 1 : 0),
    }),
    {
      fetched: 0,
      new_prospects: 0,
      enriched_with_email: 0,
      skipped_dedup_key: 0,
      new_inserts: 0,
      errors: 0,
    },
  );

  return Response.json(
    {
      ok: totals.errors === 0,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ms: Date.now() - startMs,
      existing_apollo_ids: existingApolloIds.size,
      existing_dedup_keys: existingDedupKeys.size,
      totals,
      by_segment: results,
    },
    { status: totals.errors > 0 ? 207 : 200 },
  );
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
