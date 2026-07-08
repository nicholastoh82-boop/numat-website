"use client";
// app/finance/transactions/page.tsx
// Master ledger view. Each row links to an edit page so mistakes can be fixed.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  getFinanceSupabase,
  formatDate,
  formatMoney,
  entryTypeLabel,
  bucketLabel,
  TX_STATUS_LABELS,
  type Transaction,
  type Account,
  type Category,
  type Staff,
} from "@/lib/finance";

type TxRow = Transaction & {
  from_account?: Account | null;
  to_account?: Account | null;
  category?: Category | null;
  staff?: Staff | null;
};

export default function TransactionsListPage() {
  const supabase = getFinanceSupabase();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entryFilter, setEntryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("fin_transactions")
        .select(`
          *,
          from_account:fin_accounts!fin_transactions_from_account_id_fkey(id, code, name, currency),
          to_account:fin_accounts!fin_transactions_to_account_id_fkey(id, code, name, currency),
          category:fin_categories(id, code, name, ue_bucket),
          staff:fin_staff(id, name)
        `)
        .order("transaction_date", { ascending: false })
        .order("submitted_at", { ascending: false })
        .limit(1000);
      if (error) {
        console.error("Failed to load transactions:", error);
      }
      setRows((data as TxRow[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (entryFilter !== "all" && r.entry_type !== entryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (dateFrom && r.transaction_date < dateFrom) return false;
      if (dateTo && r.transaction_date > dateTo) return false;
      if (search) {
        const hay = [
          r.description,
          r.vendor_payee,
          r.requisitioner,
          r.notes,
          r.staff?.name,
          r.category?.name,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, entryFilter, statusFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const byCurrency: Record<string, { income: number; expense: number }> = {};
    for (const r of filtered) {
      if (r.status === "reversed") continue;
      const k = r.currency;
      if (!byCurrency[k]) byCurrency[k] = { income: 0, expense: 0 };
      if (r.to_account_id && !r.from_account_id) byCurrency[k].income += Number(r.amount);
      else if (r.from_account_id && !r.to_account_id) byCurrency[k].expense += Number(r.amount);
    }
    return byCurrency;
  }, [filtered]);

  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">All Transactions</h1>
        <Link href="/finance/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add New Transaction
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Search description, vendor, staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        />
        <select value={entryFilter} onChange={(e) => setEntryFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
          <option value="all">All Entry Types</option>
          <option value="expense">Expense</option>
          <option value="income">Income (Sale or Receipt)</option>
          <option value="salary">Salary Payment</option>
          <option value="salary_advance">Salary Advance</option>
          <option value="transfer">Transfer</option>
          <option value="bank_charge">Bank Charge</option>
          <option value="withholding_tax">Withholding Tax</option>
          <option value="interest_income">Interest Income</option>
          <option value="revolving_fund_advance">Revolving Fund Advance</option>
          <option value="liquidation">Revolving Fund Liquidation</option>
          <option value="refund">Refund Received</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
          <option value="all">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="verified">Verified</option>
          <option value="flagged">Flagged for Review</option>
          <option value="reversed">Reversed</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white" />
      </div>

      {/* Totals strip */}
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-700">
        {Object.entries(totals).map(([cur, v]) => (
          <div key={cur} className="rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5">
            <span className="font-medium">{cur}: </span>
            Money In {formatMoney(v.income, cur)} ,  Money Out {formatMoney(v.expense, cur)} ,  Net {formatMoney(v.income - v.expense, cur)}
          </div>
        ))}
        <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5">
          <span className="font-medium">{filtered.length}</span> transactions shown
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading transactions, please wait...</div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Date</th>
                <th className="text-left px-3 py-2 font-medium">Entry Type</th>
                <th className="text-left px-3 py-2 font-medium">Description</th>
                <th className="text-left px-3 py-2 font-medium">Category</th>
                <th className="text-left px-3 py-2 font-medium">Staff</th>
                <th className="text-left px-3 py-2 font-medium">From</th>
                <th className="text-left px-3 py-2 font-medium">To</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{formatDate(r.transaction_date)}</td>
                  <td className="px-3 py-2 text-gray-900">{entryTypeLabel(r.entry_type)}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-xs">
                    <div className="truncate">{r.description ?? r.vendor_payee ?? "(no description)"}</div>
                    {r.notes ? <div className="text-xs text-gray-500 truncate">{r.notes}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {r.category?.name ?? ""}
                    {r.ue_bucket ? <div className="text-xs text-gray-500">{bucketLabel(r.ue_bucket, true)}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.staff?.name ?? ""}</td>
                  <td className="px-3 py-2 text-gray-700">{r.from_account?.name ?? ""}</td>
                  <td className="px-3 py-2 text-gray-700">{r.to_account?.name ?? ""}</td>
                  <td className={`px-3 py-2 text-right whitespace-nowrap ${r.status === "reversed" ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {formatMoney(Number(r.amount), r.currency)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/finance/transactions/${r.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-blue-700"
                      aria-label="Edit transaction"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const label = TX_STATUS_LABELS[status as keyof typeof TX_STATUS_LABELS] ?? status;
  const cls =
    status === "verified" ? "bg-green-100 text-green-800" :
    status === "pending"  ? "bg-yellow-100 text-yellow-800" :
    status === "flagged"  ? "bg-red-100 text-red-800" :
    status === "reversed" ? "bg-gray-100 text-gray-600" :
    "bg-gray-100 text-gray-700";
  return <span className={`inline-block rounded-full px-2 py-0.5 ${cls}`}>{label}</span>;
}