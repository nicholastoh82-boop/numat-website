// app/api/finance/accounts/route.ts
//
// Returns the list of active bank-like accounts that can receive a customer
// payment. Used to populate the "Deposited to" dropdown in the CRM receipt
// modal. Excludes virtual and suspense accounts.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isActiveCrmUser(userEmail: string): Promise<boolean> {
  const sc = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data } = await sc.from("crm_users").select("is_active").eq("email", userEmail).single();
  return Boolean(data?.is_active);
}

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isActiveCrmUser(user.email))) return NextResponse.json({ error: "CRM access denied" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Auth error" }, { status: 401 });
  }

  const sc = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sc
    .from("fin_accounts")
    .select("id, code, name, currency, account_type")
    .eq("is_active", true)
    .in("account_type", ["bank", "revolving_fund"])
    .order("currency")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data || [] });
}
