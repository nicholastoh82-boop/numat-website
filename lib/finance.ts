// lib/finance.ts
// Shared types, labels and helpers for the /finance module.
// SSR-safe: on the server (Next.js prerender), supabase is a no-op stub.
// Real usage only happens in the browser via useEffect and event handlers.

import { createBrowserClient } from "@supabase/ssr";

export function getFinanceSupabase(): any {
  // Server-side (prerender): return a harmless stub so module load never throws.
  if (typeof window === "undefined") return {} as any;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ---------- Types ----------

export type Account = {
  id: string;
  code: string;
  name: string;
  currency: "PHP" | "USD" | "SGD";
  account_type: "bank" | "revolving_fund" | "virtual";
  opening_balance: number | null;
  opening_balance_date: string | null;
  is_active: boolean | null;
  display_order: number | null;
};

export type AccountBalance = Account & { current_balance: number };

export type Classification = { id: number; code: string; name: string; display_order: number | null };
export type CostCenter = { id: number; code: string; name: string; classification_id: number | null };
export type Category = {
  id: number;
  code: string;
  name: string;
  ue_bucket: UeBucket | null;
  is_income: boolean | null;
  cost_center_id: number | null;
  pl_account_code: string | null;
  pl_section: PlSection | null;
};

export type Staff = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  default_currency: string | null;
  is_active: boolean | null;
};

export type Transaction = {
  id: string;
  transaction_date: string;
  entry_type: EntryType;
  classification_id: number | null;
  cost_center_id: number | null;
  category_id: number | null;
  ue_bucket: UeBucket | null;
  amount: number;
  currency: "PHP" | "USD" | "SGD";
  from_account_id: string | null;
  to_account_id: string | null;
  fx_rate: number | null;
  vendor_payee: string | null;
  description: string | null;
  requisitioner: string | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  staff_id: string | null;
  revolving_fund_batch_id: string | null;
  advance_txn_id: string | null;
  advance_status: AdvanceStatus | null;
  settled_by_txn_id: string | null;
  reverses_transaction_id: string | null;
  bank_reference: string | null;
  notes: string | null;
  status: TxStatus | null;
  submitted_by: string | null;
  submitted_at: string | null;
};

export type RevolvingFundBatch = {
  id: string;
  batch_number: string;
  disbursed_on: string;
  disbursed_amount: number;
  disbursed_currency: string | null;
  fund_account_id: string;
  source_account_id: string;
  custodian: string | null;
  disbursed_by: string | null;
  status: "open" | "liquidating" | "closed" | null;
  opened_at: string | null;
  closed_at: string | null;
  notes: string | null;
};

export type EntryType =
  | "expense" | "income" | "transfer" | "fx_conversion"
  | "salary" | "salary_advance" | "revolving_fund_advance" | "liquidation"
  | "refund" | "shareholder_advance" | "bank_charge" | "withholding_tax"
  | "interest_income" | "reversal" | "other";

export type UeBucket = "PP" | "PR" | "RM_PP" | "RM_PR" | "MGT" | "OH" | "NOE" | "REVENUE";
export type PlSection = "Income" | "Cost of Sales" | "Other Income" | "Expenses" | "Other Expenses";
export type AdvanceStatus = "outstanding" | "settled" | "written_off";
export type TxStatus = "pending" | "verified" | "flagged" | "reversed";

// ---------- Full-name label maps (no shortforms) ----------

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  expense: "Expense",
  income: "Income (Sale or Receipt)",
  transfer: "Transfer (Between Accounts)",
  fx_conversion: "Foreign Exchange Conversion",
  salary: "Salary Payment",
  salary_advance: "Salary Advance (Recoverable)",
  revolving_fund_advance: "Revolving Fund Disbursement",
  liquidation: "Revolving Fund Liquidation",
  refund: "Refund Received",
  shareholder_advance: "Shareholder Advance (Capital In)",
  bank_charge: "Bank Charge",
  withholding_tax: "Withholding Tax",
  interest_income: "Interest Income",
  reversal: "Reversal (Cancel Prior Entry)",
  other: "Other",
};

export const UE_BUCKET_LABELS: Record<UeBucket, string> = {
  PP: "Pre Processing (Raw Bamboo Stage)",
  PR: "Processing (Factory Production Stage)",
  RM_PP: "Repairs and Maintenance, Pre Processing",
  RM_PR: "Repairs and Maintenance, Processing",
  MGT: "Management and Administration (Salaries, Statutory, Staff Welfare)",
  OH: "Overhead (Office, Marketing, Logistics, Utilities)",
  NOE: "Non Operating Expense (Bank, Legal, Travel, Subscriptions, FX)",
  REVENUE: "Revenue",
};

export const UE_BUCKET_SHORT: Record<UeBucket, string> = {
  PP: "Pre Processing",
  PR: "Processing",
  RM_PP: "R and M Pre Processing",
  RM_PR: "R and M Processing",
  MGT: "Management and Admin",
  OH: "Overhead",
  NOE: "Non Operating",
  REVENUE: "Revenue",
};

export const ADVANCE_STATUS_LABELS: Record<AdvanceStatus, string> = {
  outstanding: "Outstanding (Not Yet Settled)",
  settled: "Settled",
  written_off: "Written Off",
};

export const TX_STATUS_LABELS: Record<TxStatus, string> = {
  pending: "Pending Review",
  verified: "Verified",
  flagged: "Flagged for Review",
  reversed: "Reversed (Cancelled)",
};

export const PL_SECTION_ORDER: PlSection[] = [
  "Income",
  "Cost of Sales",
  "Other Income",
  "Expenses",
  "Other Expenses",
];

// ---------- Formatters ----------

export function formatMoney(amount: number | null | undefined, currency: string = "PHP"): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "";
  const symbol = currency === "PHP" ? "\u20B1" : currency === "USD" ? "$" : currency === "SGD" ? "S$" : "";
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function entryTypeLabel(t: EntryType | string | null | undefined): string {
  if (!t) return "";
  return ENTRY_TYPE_LABELS[t as EntryType] ?? String(t);
}

export function bucketLabel(b: UeBucket | string | null | undefined, short = false): string {
  if (!b) return "";
  const map = short ? UE_BUCKET_SHORT : UE_BUCKET_LABELS;
  return map[b as UeBucket] ?? String(b);
}

// ---------- Running balance ----------

export type DailyBalancePoint = {
  date: string;
  accountCode: string;
  accountName: string;
  currency: string;
  runningBalance: number;
};

export function computeRunningBalance(
  account: Account,
  txns: any[]
): DailyBalancePoint[] {
  const points: DailyBalancePoint[] = [];
  const opening = Number(account.opening_balance || 0);

  const startDate =
    account.opening_balance_date ||
    (txns[0]?.transaction_date ?? new Date().toISOString().slice(0, 10));
  points.push({
    date: startDate,
    accountCode: account.code,
    accountName: account.name,
    currency: account.currency,
    runningBalance: opening,
  });

  const byDay: Record<string, number> = {};
  for (const t of txns) {
    if (t.status === "reversed") continue;
    const day = t.transaction_date;
    let delta = 0;
    if (t.to_account_id === account.id) delta += Number(t.amount);
    if (t.from_account_id === account.id) delta -= Number(t.amount);
    if (delta === 0) continue;
    byDay[day] = (byDay[day] || 0) + delta;
  }

  let running = opening;
  const sortedDays = Object.keys(byDay).sort();
  for (const day of sortedDays) {
    running += byDay[day];
    points.push({
      date: day,
      accountCode: account.code,
      accountName: account.name,
      currency: account.currency,
      runningBalance: running,
    });
  }
  return points;
}

// ---------- FX helpers ----------

export type MonthlyFxRate = { year: number; month: number; avg_rate: number; end_rate: number | null };

export async function getPeriodFxRate(startDate: string, endDate: string): Promise<number> {
  const sb = getFinanceSupabase();
  const { data, error } = await sb.rpc("fin_get_period_fx_rate", { p_start: startDate, p_end: endDate });
  if (error) throw error;
  return Number(data);
}

// ---------- Route helpers ----------

export const FINANCE_NAV = [
  { href: "/finance", label: "Dashboard" },
  { href: "/finance/new", label: "Add Transaction" },
  { href: "/finance/transactions", label: "All Transactions" },
  { href: "/finance/fund", label: "Revolving Fund" },
  { href: "/finance/reports", label: "Reports" },
];

// ---------- Backward compatibility exports ----------
// Kept for existing /finance/new, /finance/fund, /finance/fund/[id], and layout pages.

// SSR-safe supabase singleton. On the server during prerender, this is an empty
// object stub so lib/finance.ts module load never throws. All real supabase usage
// happens inside useEffect and event handlers, which only run in the browser.
export const supabase: any =
  typeof window !== "undefined" ? getFinanceSupabase() : ({} as any);

// Today's date as YYYY-MM-DD (local time).
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Entry type metadata: which accounts each type requires.
const ENTRY_TYPE_META: Record<EntryType, { needsFromAccount: boolean; needsToAccount: boolean }> = {
  expense:                { needsFromAccount: true,  needsToAccount: false },
  income:                 { needsFromAccount: false, needsToAccount: true  },
  transfer:               { needsFromAccount: true,  needsToAccount: true  },
  fx_conversion:          { needsFromAccount: true,  needsToAccount: true  },
  salary:                 { needsFromAccount: true,  needsToAccount: false },
  salary_advance:         { needsFromAccount: true,  needsToAccount: false },
  revolving_fund_advance: { needsFromAccount: true,  needsToAccount: true  },
  liquidation:            { needsFromAccount: true,  needsToAccount: false },
  refund:                 { needsFromAccount: false, needsToAccount: true  },
  shareholder_advance:    { needsFromAccount: false, needsToAccount: true  },
  bank_charge:            { needsFromAccount: true,  needsToAccount: false },
  withholding_tax:        { needsFromAccount: true,  needsToAccount: false },
  interest_income:        { needsFromAccount: false, needsToAccount: true  },
  reversal:               { needsFromAccount: false, needsToAccount: true  },
  other:                  { needsFromAccount: false, needsToAccount: false },
};

// Entry type options for dropdowns, including needs flags for form field gating and validation.
export const ENTRY_TYPE_OPTIONS: Array<{
  value: EntryType;
  label: string;
  needsFromAccount: boolean;
  needsToAccount: boolean;
}> = (Object.keys(ENTRY_TYPE_LABELS) as EntryType[]).map((v) => ({
  value: v,
  label: ENTRY_TYPE_LABELS[v],
  ...ENTRY_TYPE_META[v],
}));

// Fetch the full chart of accounts tree (classifications > cost centers > categories).
export async function loadCoaTree(): Promise<{
  classifications: Classification[];
  costCenters: CostCenter[];
  categories: Category[];
}> {
  const sb = getFinanceSupabase();
  const [cls, cc, cat] = await Promise.all([
    sb.from("fin_classifications").select("*").eq("is_active", true).order("display_order"),
    sb.from("fin_cost_centers").select("*").eq("is_active", true).order("display_order"),
    sb.from("fin_categories").select("*").eq("is_active", true).order("display_order"),
  ]);
  return {
    classifications: (cls.data as Classification[]) ?? [],
    costCenters: (cc.data as CostCenter[]) ?? [],
    categories: (cat.data as Category[]) ?? [],
  };
}

export async function loadAccounts(): Promise<Account[]> {
  const sb = getFinanceSupabase();
  const { data } = await sb
    .from("fin_accounts")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return (data as Account[]) ?? [];
}

export async function loadStaff(): Promise<Staff[]> {
  const sb = getFinanceSupabase();
  const { data } = await sb
    .from("fin_staff")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return (data as Staff[]) ?? [];
}

export async function uploadReceipt(
  file: File,
  prefix: string = "misc"
): Promise<{ url: string; path: string } | null> {
  const sb = getFinanceSupabase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${prefix}/${timestamp}_${safeName}`;
  const { error } = await sb.storage.from("finance_receipts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error("uploadReceipt failed:", error);
    return null;
  }
  const { data } = sb.storage.from("finance_receipts").getPublicUrl(path);
  return { url: data.publicUrl, path };
}