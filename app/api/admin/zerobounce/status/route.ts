// app/api/admin/zerobounce/status/route.ts
//
// Admin progress dashboard for the ZeroBounce runner. Reports total leads,
// pending vs already validated, status distribution, suppression rows
// produced by the runner, and live ZeroBounce credit balance.
//
// Auth: Authorization: Bearer <ADMIN_SECRET>.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { getCredits, type ZBStatus } from "@/lib/zerobounce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NUMAT_CLIENT_SLUG = "numat";
const ZEROBOUNCE_SOURCE = "zerobounce_v2";
const ALL_STATUSES: ZBStatus[] = [
  "valid",
  "invalid",
  "catch-all",
  "unknown",
  "spamtrap",
  "abuse",
  "do_not_mail",
];

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

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Implementation choice: one count(head:true) query per status. master_leads
  // can grow large, so we avoid pulling full zb_status columns into memory.
  const [totalRes, pendingRes, alreadyRes] = await Promise.all([
    supabase
      .from("master_leads")
      .select("id", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", ""),
    supabase
      .from("master_leads")
      .select("id", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", "")
      .is("zb_validated_at", null),
    supabase
      .from("master_leads")
      .select("id", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", "")
      .not("zb_validated_at", "is", null),
  ]);

  if (totalRes.error || pendingRes.error || alreadyRes.error) {
    const message = (totalRes.error ?? pendingRes.error ?? alreadyRes.error)!.message;
    return NextResponse.json(
      { error: "Failed to query lead counts", details: message },
      { status: 500 },
    );
  }

  const statusCountResults = await Promise.all(
    ALL_STATUSES.map((s) =>
      supabase
        .from("master_leads")
        .select("id", { count: "exact", head: true })
        .eq("zb_status", s),
    ),
  );
  const nullCountRes = await supabase
    .from("master_leads")
    .select("id", { count: "exact", head: true })
    .is("zb_status", null);

  const byStatus: Record<string, number> = {};
  ALL_STATUSES.forEach((s, i) => {
    const res = statusCountResults[i];
    byStatus[s] = res.error ? 0 : res.count ?? 0;
  });
  byStatus.null_count = nullCountRes.error ? 0 : nullCountRes.count ?? 0;

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", NUMAT_CLIENT_SLUG)
    .maybeSingle();

  let suppressionCount = 0;
  if (!clientError && client?.id) {
    const { count } = await supabase
      .from("email_suppression_list")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("source", ZEROBOUNCE_SOURCE);
    suppressionCount = count ?? 0;
  }

  let credits = 0;
  try {
    credits = await getCredits();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[zerobounce status] getCredits failed:", message);
  }

  return NextResponse.json({
    total_with_email: totalRes.count ?? 0,
    pending_validation: pendingRes.count ?? 0,
    already_validated: alreadyRes.count ?? 0,
    by_status: byStatus,
    suppression_rows: { numat_zerobounce_v2: suppressionCount },
    zerobounce_credits: credits,
    ready_to_send_count: byStatus.valid ?? 0,
  });
}
