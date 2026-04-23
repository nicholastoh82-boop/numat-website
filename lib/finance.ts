// lib/finance.ts
// NUMAT Finance helpers, SSR-safe, IFRS aligned.
// Drop this in place of the existing lib/finance.ts.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Supabase client, SSR-safe
// -----------------------------------------------------------------------------

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    return {
      from: () => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        upsert: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      rpc: async () => ({ data: null, error: null }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    } as unknown as SupabaseClient;
  }

  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _client = createBrowserClient(url, key);
  }
  return _client;
}

export const supabase = getSupabase();

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Currency = "PHP" | "USD" | "SGD";

export type EntryType =
  | "expense"
  | "income"
  | "transfer"
  | "fx_conversion"
  | "salary"
  | "salary_advance"
  | "revolving_fund_advance"
  | "liquidation"
  | "refund"
  | "shareholder_advance"
  | "bank_charge"
  | "withholding_tax"
  | "interest_income"
  | "reversal"
  | "other";

export type PlSection =
  | "Revenue"
  | "Cost of Goods Sold"
  | "Other Income"
  | "Operating Expenses"
  | "Finance Costs";

export type Account = {
  id: string;
  code: string;
  name: string;
  currency: Currency;
  account_type: "bank" | "revolving_fund" | "virtual";
  opening_balance: number | null;
  opening_balance_date: string | null;
  is_active: boolean | null;
};

export type Category = {
  id: number;
  code: string;
  name: string;
  cost_center_id: number | null;
  pl_section: PlSection | null;
  is_income: boolean;
  is_active: boolean | null;
};

export type Staff = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

export type Transaction = {
  id: string;
  transaction_date: string;
  entry_type: EntryType;
  amount: number;
  currency: Currency;
  from_account_id: string | null;
  to_account_id: string | null;
  category_id: number | null;
  description: string | null;
  vendor_payee: string | null;
  staff_id: string | null;
  notes: string | null;
  status: "pending" | "verified" | "flagged" | "reversed" | null;
  submitted_by: string | null;
  advance_status: "outstanding" | "settled" | "written_off" | null;
};

// -----------------------------------------------------------------------------
// IFRS P&L section order — this is the ONLY valid ordering
// -----------------------------------------------------------------------------

export const PL_SECTION_ORDER: PlSection[] = [
  "Revenue",
  "Cost of Goods Sold",
  "Other Income",
  "Operating Expenses",
  "Finance Costs",
];

export const PL_SECTION_LABELS: Record<PlSection, string> = {
  Revenue: "Revenue",
  "Cost of Goods Sold": "Cost of Goods Sold",
  "Other Income": "Other Income",
  "Operating Expenses": "Operating Expenses",
  "Finance Costs": "Finance Costs",
};

// -----------------------------------------------------------------------------
// Entry types that do NOT affect the P&L.
// These affect the balance sheet only and must be filtered out of P&L reports.
// -----------------------------------------------------------------------------

export const NON_PL_ENTRY_TYPES: EntryType[] = [
  "transfer",
  "fx_conversion",
  "salary_advance",
  "revolving_fund_advance",
  "liquidation",
  "shareholder_advance",
];

// -----------------------------------------------------------------------------
// Label maps (used across ledger, dashboard, and P&L report)
// -----------------------------------------------------------------------------

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer between accounts",
  fx_conversion: "FX conversion",
  salary: "Salary payment",
  salary_advance: "Salary advance",
  revolving_fund_advance: "Revolving fund advance",
  liquidation: "Liquidation",
  refund: "Refund received",
  shareholder_advance: "Shareholder advance",
  bank_charge: "Bank charge",
  withholding_tax: "Withholding tax",
  interest_income: "Interest income",
  reversal: "Reversal",
  other: "Other",
};

export const TX_STATUS_LABELS = {
  pending: "Pending review",
  verified: "Verified",
  flagged: "Flagged",
  reversed: "Reversed",
} as const;

export const ADVANCE_STATUS_LABELS = {
  outstanding: "Outstanding",
  settled: "Settled",
  written_off: "Written off",
} as const;

export const UE_BUCKET_LABELS = {
  PP: "Pre Processing",
  PR: "Processing",
  RM_PP: "R&M Pre Processing",
  RM_PR: "R&M Processing",
  MGT: "Management",
  OH: "Overhead",
  NOE: "Non Operating Expense",
  REVENUE: "Revenue",
} as const;

export const UE_BUCKET_LABELS_SHORT = {
  PP: "PP",
  PR: "PR",
  RM_PP: "RM PP",
  RM_PR: "RM PR",
  MGT: "MGT",
  OH: "OH",
  NOE: "NOE",
  REVENUE: "Rev",
} as const;

// -----------------------------------------------------------------------------
// Entry type metadata for the new transaction form
// -----------------------------------------------------------------------------

export const ENTRY_TYPE_META: Record<
  EntryType,
  { label: string; needsFromAccount: boolean; needsToAccount: boolean }
> = {
  expense: { label: "Expense", needsFromAccount: true, needsToAccount: false },
  income: { label: "Income", needsFromAccount: false, needsToAccount: true },
  transfer: { label: "Transfer between accounts", needsFromAccount: true, needsToAccount: true },
  fx_conversion: { label: "FX conversion", needsFromAccount: true, needsToAccount: true },
  salary: { label: "Salary payment", needsFromAccount: true, needsToAccount: false },
  salary_advance: { label: "Salary advance", needsFromAccount: true, needsToAccount: false },
  revolving_fund_advance: {
    label: "Revolving fund advance",
    needsFromAccount: true,
    needsToAccount: true,
  },
  liquidation: { label: "Liquidation", needsFromAccount: true, needsToAccount: false },
  refund: { label: "Refund received", needsFromAccount: false, needsToAccount: true },
  shareholder_advance: {
    label: "Shareholder advance",
    needsFromAccount: true,
    needsToAccount: false,
  },
  bank_charge: { label: "Bank charge", needsFromAccount: true, needsToAccount: false },
  withholding_tax: { label: "Withholding tax", needsFromAccount: true, needsToAccount: false },
  interest_income: { label: "Interest income", needsFromAccount: false, needsToAccount: true },
  reversal: { label: "Reversal", needsFromAccount: false, needsToAccount: true },
  other: { label: "Other", needsFromAccount: false, needsToAccount: false },
};

export const ENTRY_TYPE_OPTIONS: EntryType[] = Object.keys(
  ENTRY_TYPE_META
) as EntryType[];

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

export function formatMoney(
  value: number | string | null | undefined,
  currency: Currency | string = "PHP"
): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return "";
  const sym = currency === "USD" ? "$" : currency === "SGD" ? "S$" : "\u20b1";
  return `${sym}${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// FX helper — returns monthly avg PHP per USD for a given period.
// Falls back to a sensible default if the month is not yet populated.
// -----------------------------------------------------------------------------

export async function getPeriodFxRate(
  startISO: string,
  endISO: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("fin_get_period_fx_rate", {
      p_start: startISO,
      p_end: endISO,
    });
    if (error || data == null) return 58.5;
    return Number(data);
  } catch {
    return 58.5;
  }
}

// -----------------------------------------------------------------------------
// Running balance helper (for the dashboard balance chart)
// -----------------------------------------------------------------------------

export function computeRunningBalance(
  openingBalance: number,
  txs: Array<{
    transaction_date: string;
    amount: number;
    from_account_id: string | null;
    to_account_id: string | null;
  }>,
  accountId: string
): Array<{ date: string; balance: number }> {
  let bal = openingBalance || 0;
  const out: Array<{ date: string; balance: number }> = [];
  const sorted = [...txs].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );
  for (const t of sorted) {
    if (t.to_account_id === accountId) bal += Number(t.amount) || 0;
    if (t.from_account_id === accountId) bal -= Number(t.amount) || 0;
    out.push({ date: t.transaction_date, balance: bal });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------------------

export const FINANCE_NAV = [
  { href: "/finance", label: "Dashboard" },
  { href: "/finance/transactions", label: "Transactions" },
  { href: "/finance/new", label: "New entry" },
  { href: "/finance/fund", label: "Revolving fund" },
  { href: "/finance/reports", label: "Reports" },
];

// -----------------------------------------------------------------------------
// Data loaders (backward compatible with the old /finance/new and /finance/fund pages)
// -----------------------------------------------------------------------------

export async function loadAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("fin_accounts")
    .select("*")
    .eq("is_active", true)
    .neq("account_type", "virtual")
    .order("display_order", { ascending: true });
  if (error || !data) return [];
  return data as Account[];
}

export async function loadStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("fin_staff")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error || !data) return [];
  return data as Staff[];
}

export async function loadCoaTree(): Promise<{
  classifications: Array<{ id: number; code: string; name: string }>;
  costCenters: Array<{
    id: number;
    code: string;
    name: string;
    classification_id: number | null;
  }>;
  categories: Category[];
}> {
  const [cls, cc, cat] = await Promise.all([
    supabase.from("fin_classifications").select("*").order("display_order"),
    supabase.from("fin_cost_centers").select("*").order("display_order"),
    supabase.from("fin_categories").select("*").eq("is_active", true).order("display_order"),
  ]);
  return {
    classifications: (cls.data as any) || [],
    costCenters: (cc.data as any) || [],
    categories: ((cat.data as any) || []) as Category[],
  };
}

export async function uploadReceipt(
  file: File,
  relPath: string
): Promise<string | null> {
  try {
    const { error } = await supabase.storage
      .from("finance_receipts")
      .upload(relPath, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("finance_receipts").getPublicUrl(relPath);
    return data.publicUrl || null;
  } catch {
    return null;
  }
}