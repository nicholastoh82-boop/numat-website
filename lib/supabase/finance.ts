// lib/finance.ts
// Shared types and helpers for /finance pages.
// Assumes env vars NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set (same as /crm).

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Classification = { id: number; code: string; name: string; display_order: number };
export type CostCenter = { id: number; classification_id: number; code: string; name: string; display_order: number };
export type Category = {
  id: number; cost_center_id: number; code: string; name: string;
  ue_bucket: 'PP'|'PR'|'RM_PP'|'RM_PR'|'MGT'|'OH'|'NOE'|'REVENUE'|null;
  is_income: boolean; display_order: number;
};
export type Account = {
  id: string; code: string; name: string; currency: 'PHP'|'USD'|'SGD';
  account_type: 'bank'|'revolving_fund'|'virtual'; display_order: number;
};
export type AccountBalance = Account & { current_balance: number };
export type Staff = { id: string; name: string; email: string|null; role: string; default_currency: string };

export type EntryType =
  | 'expense' | 'income' | 'transfer' | 'fx_conversion'
  | 'salary' | 'salary_advance' | 'revolving_fund_advance' | 'liquidation'
  | 'refund' | 'shareholder_advance' | 'bank_charge'
  | 'withholding_tax' | 'interest_income' | 'reversal' | 'other';

export const ENTRY_TYPE_OPTIONS: { value: EntryType; label: string; needsFromAccount: boolean; needsToAccount: boolean }[] = [
  { value: 'expense',                 label: 'Expense (money out)',            needsFromAccount: true,  needsToAccount: false },
  { value: 'income',                  label: 'Income (money in, sale)',        needsFromAccount: false, needsToAccount: true  },
  { value: 'transfer',                label: 'Bank Transfer (inter account)',  needsFromAccount: true,  needsToAccount: true  },
  { value: 'fx_conversion',           label: 'FX Conversion (USD to PHP etc)', needsFromAccount: true,  needsToAccount: true  },
  { value: 'salary',                  label: 'Salary Payment',                 needsFromAccount: true,  needsToAccount: false },
  { value: 'salary_advance',          label: 'Salary Advance (to staff)',      needsFromAccount: true,  needsToAccount: false },
  { value: 'revolving_fund_advance',  label: 'Revolving Fund Disbursement',    needsFromAccount: true,  needsToAccount: true  },
  { value: 'refund',                  label: 'Refund Received',                needsFromAccount: false, needsToAccount: true  },
  { value: 'shareholder_advance',     label: 'Shareholder Capital In',         needsFromAccount: false, needsToAccount: true  },
  { value: 'bank_charge',             label: 'Bank Charge',                    needsFromAccount: true,  needsToAccount: false },
  { value: 'withholding_tax',         label: 'Withholding Tax',                needsFromAccount: true,  needsToAccount: false },
  { value: 'interest_income',         label: 'Interest Income',                needsFromAccount: false, needsToAccount: true  },
  { value: 'other',                   label: 'Other',                          needsFromAccount: true,  needsToAccount: false },
];

export const UE_BUCKET_LABELS: Record<string,string> = {
  PP: 'Pre Processing', PR: 'Processing',
  RM_PP: 'R and M Pre', RM_PR: 'R and M Processing',
  MGT: 'Management and Admin', OH: 'OverHead',
  NOE: 'Non Op Excluded', REVENUE: 'Revenue',
};

export async function loadCoaTree() {
  const [classRes, ccRes, catRes] = await Promise.all([
    supabase.from('fin_classifications').select('*').eq('is_active', true).order('display_order'),
    supabase.from('fin_cost_centers').select('*').eq('is_active', true).order('display_order'),
    supabase.from('fin_categories').select('*').eq('is_active', true).order('display_order'),
  ]);
  return {
    classifications: (classRes.data || []) as Classification[],
    costCenters: (ccRes.data || []) as CostCenter[],
    categories: (catRes.data || []) as Category[],
  };
}

export async function loadAccounts(): Promise<Account[]> {
  const { data } = await supabase.from('fin_accounts').select('*').eq('is_active', true).order('display_order');
  return (data || []) as Account[];
}

export async function loadAccountBalances(): Promise<AccountBalance[]> {
  const { data } = await supabase.from('fin_account_balances').select('*').order('display_order');
  return (data || []) as AccountBalance[];
}

export async function loadStaff(): Promise<Staff[]> {
  const { data } = await supabase.from('fin_staff').select('*').eq('is_active', true).order('display_order');
  return (data || []) as Staff[];
}

export async function uploadReceipt(file: File, folder = 'txn'): Promise<{ url: string; path: string } | null> {
  const ts = Date.now();
  const safe = file.name.replace(/[^a-zA-Z0-9._]/g, '_');
  const path = `${folder}/${ts}_${safe}`;
  const { error } = await supabase.storage.from('finance_receipts').upload(path, file, { upsert: false });
  if (error) { console.error('upload error', error); return null; }
  const { data } = supabase.storage.from('finance_receipts').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export function formatMoney(n: number | null | undefined, currency = 'PHP') {
  if (n == null) return '';
  const sym = currency === 'PHP' ? '₱' : currency === 'USD' ? '$' : currency === 'SGD' ? 'S$' : '';
  return sym + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayISO() { return new Date().toISOString().slice(0,10); }