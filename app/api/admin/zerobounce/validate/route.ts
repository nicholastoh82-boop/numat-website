// app/api/admin/zerobounce/validate/route.ts
//
// TODO: cost logging via log_service_usage RPC is pending (separate follow up commit).
//
// Admin runner that pushes leads from master_leads through the ZeroBounce
// validateBatch endpoint, then applies verdicts via the
// public.zerobounce_apply_batch RPC. The RPC writes the suppression rows
// (numat scope plus global scope) for any hard fails.
//
// Auth: Authorization: Bearer <ADMIN_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { getCredits, validateBatch, type ZBStatus, type ZBVerdict } from "@/lib/zerobounce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 100;
const DEFAULT_MAX_BATCHES = 10;
const MAX_MAX_BATCHES = 50;
const STALE_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ALL_STATUSES: ZBStatus[] = [
  "valid",
  "invalid",
  "catch-all",
  "unknown",
  "spamtrap",
  "abuse",
  "do_not_mail",
];

type Scope = "pending" | "stale" | "all";

interface ValidateBody {
  scope: Scope;
  batch_size: number;
  max_batches: number;
  dry_run: boolean;
}

function getSupabaseAdmin() {
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

function parseBody(
  raw: unknown,
): { ok: true; body: ValidateBody } | { ok: false; details: string } {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, details: "body must be a JSON object" };
  }
  const r = raw as Record<string, unknown>;

  const scopeRaw = r.scope ?? "pending";
  if (scopeRaw !== "pending" && scopeRaw !== "stale" && scopeRaw !== "all") {
    return { ok: false, details: "scope must be one of pending, stale, all" };
  }
  const scope = scopeRaw as Scope;

  const batchSizeRaw = r.batch_size ?? DEFAULT_BATCH_SIZE;
  if (
    typeof batchSizeRaw !== "number" ||
    !Number.isInteger(batchSizeRaw) ||
    batchSizeRaw < 1 ||
    batchSizeRaw > MAX_BATCH_SIZE
  ) {
    return { ok: false, details: `batch_size must be an integer between 1 and ${MAX_BATCH_SIZE}` };
  }

  const maxBatchesRaw = r.max_batches ?? DEFAULT_MAX_BATCHES;
  if (
    typeof maxBatchesRaw !== "number" ||
    !Number.isInteger(maxBatchesRaw) ||
    maxBatchesRaw < 1 ||
    maxBatchesRaw > MAX_MAX_BATCHES
  ) {
    return { ok: false, details: `max_batches must be an integer between 1 and ${MAX_MAX_BATCHES}` };
  }

  const dryRunRaw = r.dry_run ?? false;
  if (typeof dryRunRaw !== "boolean") {
    return { ok: false, details: "dry_run must be a boolean" };
  }

  return {
    ok: true,
    body: {
      scope,
      batch_size: batchSizeRaw,
      max_batches: maxBatchesRaw,
      dry_run: dryRunRaw,
    },
  };
}

function staleThresholdISO(): string {
  return new Date(Date.now() - STALE_WINDOW_DAYS * MS_PER_DAY).toISOString();
}

function emptyByStatus(): Record<ZBStatus, number> {
  return {
    valid: 0,
    invalid: 0,
    "catch-all": 0,
    unknown: 0,
    spamtrap: 0,
    abuse: 0,
    do_not_mail: 0,
  };
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

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid request", details: parsed.details }, { status: 400 });
  }
  const { scope, batch_size, max_batches, dry_run } = parsed.body;

  let initialCredits = 0;
  try {
    initialCredits = await getCredits();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch ZeroBounce credits", details: message },
      { status: 502 },
    );
  }

  const required = batch_size * max_batches;
  if (!dry_run && initialCredits < required) {
    return NextResponse.json(
      { error: "Insufficient ZeroBounce credits", credits: initialCredits, required },
      { status: 402 },
    );
  }

  const supabase = getSupabaseAdmin();
  const limit = batch_size * max_batches;

  let q = supabase
    .from("master_leads")
    .select("id, email")
    .not("email", "is", null)
    .neq("email", "");

  if (scope === "pending") {
    q = q.is("zb_validated_at", null);
  } else if (scope === "stale") {
    q = q.lt("zb_validated_at", staleThresholdISO());
  } else {
    q = q.or(`zb_validated_at.is.null,zb_validated_at.lt.${staleThresholdISO()}`);
  }

  const { data: leadRows, error: selectError } = await q
    .order("id", { ascending: true })
    .limit(limit);

  if (selectError) {
    return NextResponse.json(
      { error: "Failed to load leads", details: selectError.message },
      { status: 500 },
    );
  }

  // Some leads may share an email with different ids; one verdict per address is enough.
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const row of leadRows ?? []) {
    const e = (row?.email ?? "").trim().toLowerCase();
    if (!e) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    emails.push(e);
  }

  if (emails.length === 0) {
    return NextResponse.json({
      done: true,
      batches_processed: 0,
      leads_validated: 0,
      by_status: emptyByStatus(),
      suppression_rows_added: 0,
      credits_remaining_estimate: initialCredits,
      errors: [] as Array<{ batch_index: number; message: string }>,
    });
  }

  const byStatus = emptyByStatus();
  let leadsValidated = 0;
  let suppressionRowsAdded = 0;
  let batchesProcessed = 0;
  // Tracks emails actually shipped to the ZeroBounce API. Credits are
  // burned at send time regardless of whether the downstream RPC apply
  // step succeeds, so this drives credits_remaining_estimate. Still an
  // estimate: ZeroBounce returns free re validations within 5 days for
  // the same address, which we cannot detect without a follow up call.
  let totalEmailsSentToZb = 0;
  const errors: Array<{ batch_index: number; message: string }> = [];

  for (let i = 0; i < emails.length; i += batch_size) {
    const chunk = emails.slice(i, i + batch_size);
    const batchIndex = Math.floor(i / batch_size);

    if (dry_run) {
      console.log(`[zerobounce dry_run] batch ${batchIndex} size ${chunk.length}`);
      batchesProcessed += 1;
      continue;
    }

    try {
      totalEmailsSentToZb += chunk.length;
      const { verdicts } = await validateBatch(chunk);

      const payload = verdicts.map((v: ZBVerdict) => ({
        email: v.email,
        status: v.status,
        sub_status: v.sub_status,
        free_email: v.free_email,
        did_you_mean: v.did_you_mean,
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc("zerobounce_apply_batch", {
        payload,
      });
      if (rpcError) {
        throw new Error(`zerobounce_apply_batch RPC failed: ${rpcError.message}`);
      }

      const result = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
        | { updated_leads?: number; suppressed_numat?: number; suppressed_global?: number }
        | null;

      const updated = Number(result?.updated_leads ?? verdicts.length);
      leadsValidated += updated;
      suppressionRowsAdded += Number(result?.suppressed_numat ?? 0);

      for (const v of verdicts) {
        if (ALL_STATUSES.includes(v.status)) {
          byStatus[v.status] += 1;
        }
      }
      batchesProcessed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[zerobounce] batch ${batchIndex} failed:`, message);
      errors.push({ batch_index: batchIndex, message });
    }
  }

  let pendingAfter = 0;
  {
    const { count, error } = await supabase
      .from("master_leads")
      .select("id", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", "")
      .is("zb_validated_at", null);
    if (!error) pendingAfter = count ?? 0;
  }

  return NextResponse.json({
    batches_processed: batchesProcessed,
    leads_validated: leadsValidated,
    by_status: byStatus,
    suppression_rows_added: suppressionRowsAdded,
    credits_remaining_estimate: Math.max(0, initialCredits - totalEmailsSentToZb),
    errors,
    done: pendingAfter === 0,
  });
}
