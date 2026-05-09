// lib/finance/receiptToTransaction.ts
//
// Helpers for mirroring a CRM receipt into a fin_transactions row so the
// Finance dashboard reflects sales income automatically the moment a
// receipt is issued in the CRM.

import { createClient } from "@supabase/supabase-js";

// Hard-coded reference IDs from the production fin_classifications,
// fin_cost_centers, and fin_categories tables. These are stable seed data;
// if any of them change, update here.
export const REVENUE_CLASSIFICATION_ID = 10;       // 'Revenue'
export const PRODUCT_SALES_COST_CENTER_ID = 31;     // 'Product Sales'

const PRODUCT_CATEGORY_BY_PREFIX: Record<string, number> = {
  NUBAM: 121,
  NUWALL: 122,
  NUDOOR: 123,
  NUFLOOR: 124,
  NUSLAT: 125,
};
const SAMPLE_CATEGORY_ID = 126;
const OTHERS_CATEGORY_ID = 127;

const ACCOUNTS = {
  RCBC_PHP: "6e55e63d-7f49-400e-90b5-d7b910f302a4",
  RF_B22: "4f8b8faa-4c7e-43e7-85e1-60d88ddc0344",
  OCBC_USD: "4e77e4e0-9f63-4f42-a981-8899bbbbc42b",
  OCBC_SGD: "b5220485-3fc6-4fc7-b862-040ffa3b1121",
};

/**
 * Pick the right revenue category for a receipt by inspecting the
 * SKUs on the linked invoice. Uses the dominant product family by
 * line value (so a mostly-NuFloor invoice categorises as NuFloor).
 * Falls back to OTHERS if no SKUs match.
 */
export function pickCategoryFromInvoiceItems(
  items: Array<{ sku?: string | null; total_price?: number | string | null }>,
): number {
  if (!items || items.length === 0) return OTHERS_CATEGORY_ID;

  const totals: Record<number, number> = {};
  for (const item of items) {
    const sku = String(item.sku || "").toUpperCase();
    const value = Number(item.total_price || 0);
    if (!sku || !Number.isFinite(value) || value <= 0) continue;

    if (sku.startsWith("SAMPLE")) {
      totals[SAMPLE_CATEGORY_ID] = (totals[SAMPLE_CATEGORY_ID] || 0) + value;
      continue;
    }
    let matched = false;
    for (const [prefix, catId] of Object.entries(PRODUCT_CATEGORY_BY_PREFIX)) {
      if (sku.startsWith(prefix)) {
        totals[catId] = (totals[catId] || 0) + value;
        matched = true;
        break;
      }
    }
    if (!matched) {
      totals[OTHERS_CATEGORY_ID] = (totals[OTHERS_CATEGORY_ID] || 0) + value;
    }
  }

  let best = OTHERS_CATEGORY_ID;
  let bestVal = -1;
  for (const [catIdStr, val] of Object.entries(totals)) {
    if (val > bestVal) {
      best = Number(catIdStr);
      bestVal = val;
    }
  }
  return best;
}

/**
 * Pick the receiving bank account based on currency + payment method.
 * Cash payments go to the revolving fund. Everything else routes to the
 * primary bank account for the currency. If an explicit account id is
 * provided (from the user picking "Deposited to" on the receipt modal),
 * it takes precedence over the heuristic.
 */
export function pickToAccountId(currency: string, paymentMethod: string, explicitAccountId?: string | null): string {
  if (explicitAccountId) return explicitAccountId;
  const cur = (currency || "PHP").toUpperCase();
  const method = (paymentMethod || "").toLowerCase();

  if (cur === "USD") return ACCOUNTS.OCBC_USD;
  if (cur === "SGD") return ACCOUNTS.OCBC_SGD;

  // PHP receipts
  if (method === "cash") return ACCOUNTS.RF_B22;
  return ACCOUNTS.RCBC_PHP;
}

type FinTxnUpsert = {
  source_receipt_id: string;
  transaction_date: string;
  amount: number;
  currency: string;
  to_account_id: string;
  category_id: number;
  description: string;
  bank_reference: string | null;
  vendor_payee: string | null;
};

/**
 * Insert (or update if already linked) the fin_transactions row that
 * mirrors a receipt. Uses service-role client so it works even if the
 * caller is operating under RLS.
 */
export async function upsertFinTransactionForReceipt(
  payload: FinTxnUpsert,
  submittedBy: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const sc = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Look up any existing transaction linked to this receipt
  const { data: existing } = await sc
    .from("fin_transactions")
    .select("id")
    .eq("source_receipt_id", payload.source_receipt_id)
    .maybeSingle();

  const row = {
    transaction_date: payload.transaction_date,
    entry_type: "income" as const,
    classification_id: REVENUE_CLASSIFICATION_ID,
    cost_center_id: PRODUCT_SALES_COST_CENTER_ID,
    category_id: payload.category_id,
    amount: payload.amount,
    currency: payload.currency,
    to_account_id: payload.to_account_id,
    vendor_payee: payload.vendor_payee,
    description: payload.description,
    bank_reference: payload.bank_reference,
    source_receipt_id: payload.source_receipt_id,
    submitted_by: submittedBy,
    status: "verified" as const,
  };

  if (existing?.id) {
    const { data, error } = await sc
      .from("fin_transactions")
      .update(row)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data.id };
  }

  const { data, error } = await sc
    .from("fin_transactions")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}
