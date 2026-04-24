// lib/finance.ts
// NUMAT Finance helpers, SSR-safe, IFRS aligned.

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
        eq: () => ({ data: [], error: null }),
        neq: () => ({ data: [], error: null }),
        gte: () => ({ data: [], error: null }),
        lte: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null }),
        limit: () => ({ data: [], error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      rpc: async () => ({ data: null, error: null }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
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

// Backward compatible alias used by newer dashboard and transactions pages.
export const getFinanceSupabase = getSupabase;

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
  | "Income"
  | "Cost of Goods Sold"
  | "Other Income"
  | "Expenses"
  | "Other Expenses";

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

// Shape returned by the fin_account_balances view.
export type AccountBalance = {
  id: string;
  code: string;
  name: string;
  currency: Currency;
  account_type: string;
  current_balance: number;
};

export type Classification = {
  id: number;
  code: string;
  name: string;
  is_active: boolean | null;
};

export type CostCenter = {
  id: number;
  code: string;
  name: string;
  classification_id: number | null;
  is_active: boolean | null;
};

export type Category = {
  id: number;
  code: string;
  name: string;
  classification_id: number | null;
  cost_center_id: number | null;
  pl_section: PlSection | null;
  pl_account_code: string | null;
  ue_bucket: string | null;
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
  classification_id: number | null;
  cost_center_id: number | null;
  category_id: number | null;
  ue_bucket: string | null;
  description: string | null;
  vendor_payee: string | null;
  requisitioner: string | null;
  staff_id: string | null;
  notes: string | null;
  status: "pending" | "verified" | "flagged" | "reversed" | null;
  submitted_by: string | null;
  submitted_at: string | null;
  advance_status: "outstanding" | "settled" | "written_off" | null;
  bank_reference: string | null;
  fx_rate: number | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  revolving_fund_batch_id: string | null;
  pr_amount: number | null;
  settled_by_txn_id: string | null;
};

export type DailyBalancePoint = {
  date: string;
  runningBalance: number;
};

// -----------------------------------------------------------------------------
// IFRS P&L section order, this is the ONLY valid ordering.
// -----------------------------------------------------------------------------

export const PL_SECTION_ORDER: PlSection[] = [
  "Income",
  "Cost of Goods Sold",
  "Other Income",
  "Expenses",
  "Other Expenses",
];

export const PL_SECTION_LABELS: Record<PlSection, string> = {
  Income: "Income",
  "Cost of Goods Sold": "Cost of Goods Sold",
  "Other Income": "Other Income",
  Expenses: "Expenses",
  "Other Expenses": "Other Expenses",
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
// Label maps
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

export type EntryTypeOption = {
  value: EntryType;
  label: string;
  needsFromAccount: boolean;
  needsToAccount: boolean;
};

export const ENTRY_TYPE_OPTIONS: EntryTypeOption[] = (
  Object.keys(ENTRY_TYPE_META) as EntryType[]
).map((k) => ({
  value: k,
  label: ENTRY_TYPE_META[k].label,
  needsFromAccount: ENTRY_TYPE_META[k].needsFromAccount,
  needsToAccount: ENTRY_TYPE_META[k].needsToAccount,
}));

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
  const sym = currency === "USD" ? "$" : currency === "SGD" ? "S$" : "₱";
  return `${sym}${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function entryTypeLabel(
  type: EntryType | string | null | undefined
): string {
  if (!type) return "";
  return ENTRY_TYPE_LABELS[type as EntryType] ?? String(type);
}

export function bucketLabel(
  code: string | null | undefined,
  short = false
): string {
  if (!code) return "";
  const map = (short ? UE_BUCKET_LABELS_SHORT : UE_BUCKET_LABELS) as Record<
    string,
    string
  >;
  return map[code] ?? code;
}

// -----------------------------------------------------------------------------
// FX helper, returns monthly avg PHP per USD for a given period.
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
// Running balance helper for the dashboard balance chart.
// New signature: (account, txns) => DailyBalancePoint[]
// -----------------------------------------------------------------------------

export function computeRunningBalance(
  account: Pick<Account, "id" | "opening_balance">,
  txs: Array<
    Pick<Transaction, "transaction_date" | "amount" | "from_account_id" | "to_account_id">
  >
): DailyBalancePoint[] {
  let bal = Number(account.opening_balance) || 0;
  const out: DailyBalancePoint[] = [];
  const sorted = [...txs].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );
  for (const t of sorted) {
    if (t.to_account_id === account.id) bal += Number(t.amount) || 0;
    if (t.from_account_id === account.id) bal -= Number(t.amount) || 0;
    out.push({ date: t.transaction_date, runningBalance: bal });
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
// Data loaders
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
  classifications: Classification[];
  costCenters: CostCenter[];
  categories: Category[];
}> {
  const [cls, cc, cat] = await Promise.all([
    supabase
      .from("fin_classifications")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("fin_cost_centers")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("fin_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
  ]);
  return {
    classifications: ((cls.data as any) || []) as Classification[],
    costCenters: ((cc.data as any) || []) as CostCenter[],
    categories: ((cat.data as any) || []) as Category[],
  };
}

// -----------------------------------------------------------------------------
// Receipt upload. Returns { url, filename } so callers can persist both.
// -----------------------------------------------------------------------------

export async function uploadReceipt(
  file: File,
  folder: string
): Promise<{ url: string; filename: string } | null> {
  try {
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${ts}_${safeName}`;
    const { error } = await supabase.storage
      .from("finance_receipts")
      .upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage
      .from("finance_receipts")
      .getPublicUrl(path);
    const url = data?.publicUrl || "";
    if (!url) return null;
    return { url, filename: file.name };
  } catch {
    return null;
  }
}
