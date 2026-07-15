"use client";
// app/finance/page.tsx
// Dashboard: current balances (full account names), running balance chart, outstanding advances, recent transactions.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getFinanceSupabase,
  computeRunningBalance,
  formatMoney,
  formatDate,
  entryTypeLabel,
  bucketLabel,
  type Account,
  type AccountBalance,
  type Transaction,
  type DailyBalancePoint,
} from "@/lib/finance";

type OutstandingAdvance = {
  id: string;
  transaction_date: string;
  staff_name: string | null;
  amount: number;
  currency: string;
  days_outstanding: number;
  outstanding_amount: number;
};

export default function FinanceDashboardPage() {
  const supabase = getFinanceSupabase();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [advances, setAdvances] = useState<OutstandingAdvance[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [accs, bals, t, adv] = await Promise.all([
        supabase.from("fin_accounts").select("*").eq("is_active", true).order("display_order"),
        supabase.from("fin_account_balances").select("*"),
        supabase.from("fin_transactions").select("*").neq("status", "reversed").order("transaction_date", { ascending: true }).limit(2000),
        supabase.from("fin_outstanding_advances").select("*"),
      ]);
      setAccounts((accs.data as Account[]) ?? []);
      setBalances((bals.data as AccountBalance[]) ?? []);
      setTxns((t.data as Transaction[]) ?? []);
      setAdvances((adv.data as OutstandingAdvance[]) ?? []);
      setSelectedAccountId(((accs.data as Account[]) ?? [])[0]?.id ?? "");
      setLoading(false);
    })();
  }, [supabase]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const runningBalance: DailyBalancePoint[] = useMemo(() => {
    if (!selectedAccount) return [];
    return computeRunningBalance(selectedAccount, txns);
  }, [selectedAccount, txns]);

  const recentTxns = useMemo(() => {
    return [...txns].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)).slice(0, 10);
  }, [txns]);

  if (loading) {
    return <div className="p-6 text-gray-600">Loading financial overview, please wait...</div>;
  }

  return (
    <div className="p-6 space-y-8 bg-white">
      <h1 className="text-2xl font-semibold text-gray-900">Financial Dashboard</h1>

      {/* Current Balances */}
      <section>
        <h2 className="text-lg font-medium text-gray-800 mb-3">Current Bank and Fund Balances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wide">{b.account_type === "bank" ? "Bank Account" : b.account_type === "revolving_fund" ? "Revolving Fund" : "Virtual Account"}</div>
              <div className="mt-1 text-sm font-medium text-gray-900">{b.name}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {formatMoney(Number(b.current_balance), b.currency)}
              </div>
              <div className="mt-1 text-xs text-gray-500">{b.currency} Currency</div>
            </div>
          ))}
        </div>
      </section>

      {/* Running Balance Chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-800">Running Balance Over Time</h2>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white text-gray-900"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
        <RunningBalanceChart points={runningBalance} currency={selectedAccount?.currency ?? "PHP"} />
      </section>

      {/* Outstanding Advances */}
      {advances.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-gray-800 mb-3">
            Outstanding Salary Advances ({advances.length})
          </h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date of Advance</th>
                  <th className="text-left px-4 py-2 font-medium">Staff Member</th>
                  <th className="text-right px-4 py-2 font-medium">Amount Outstanding</th>
                  <th className="text-right px-4 py-2 font-medium">Days Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advances.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-gray-900">{formatDate(a.transaction_date)}</td>
                    <td className="px-4 py-2 text-gray-900">{a.staff_name ?? "Unassigned"}</td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {formatMoney(Number(a.outstanding_amount), a.currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">{a.days_outstanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-800">Recent Transactions (Last 10)</h2>
          <Link href="/finance/transactions" className="text-sm text-blue-600 hover:underline">
            View All Transactions
          </Link>
        </div>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Entry Type</th>
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-right px-4 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTxns.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{formatDate(t.transaction_date)}</td>
                  <td className="px-4 py-2 text-gray-900">{entryTypeLabel(t.entry_type)}</td>
                  <td className="px-4 py-2 text-gray-700">
                    <Link href={`/finance/transactions/${t.id}/edit`} className="text-blue-600 hover:underline">
                      {t.description ?? t.vendor_payee ?? "(no description)"}
                    </Link>
                    {t.ue_bucket ? <span className="ml-2 text-xs text-gray-500">, {bucketLabel(t.ue_bucket, true)}</span> : null}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900">{formatMoney(Number(t.amount), t.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------- Simple SVG line chart (no external deps) ----------

function RunningBalanceChart({ points, currency }: { points: DailyBalancePoint[]; currency: string }) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Not enough data yet to plot a running balance chart. Add more transactions to see the trend.
      </div>
    );
  }
  const width = 900;
  const height = 280;
  const padL = 70, padR = 20, padT = 20, padB = 40;

  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.runningBalance);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const yPad = (yMax - yMin) * 0.1 || Math.abs(yMax) * 0.1 || 1;
  const y0 = yMin - yPad, y1 = yMax + yPad;

  const px = (t: number) => padL + ((t - xMin) / (xMax - xMin || 1)) * (width - padL - padR);
  const py = (v: number) => padT + ((y1 - v) / (y1 - y0 || 1)) * (height - padT - padB);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${px(new Date(p.date).getTime()).toFixed(2)} ${py(p.runningBalance).toFixed(2)}`)
    .join(" ");

  const yTicks = 5;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => y0 + ((y1 - y0) * i) / yTicks);

  const firstDate = new Date(points[0].date);
  const lastDate = new Date(points[points.length - 1].date);
  const midDate = new Date((firstDate.getTime() + lastDate.getTime()) / 2);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Y grid + labels */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={py(v)} y2={py(v)} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padL - 8} y={py(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              {formatMoney(v, currency)}
            </text>
          </g>
        ))}
        {/* X-axis labels */}
        <text x={padL} y={height - 10} fontSize="11" fill="#6b7280">{formatDate(firstDate.toISOString())}</text>
        <text x={(padL + width - padR) / 2} y={height - 10} fontSize="11" fill="#6b7280" textAnchor="middle">{formatDate(midDate.toISOString())}</text>
        <text x={width - padR} y={height - 10} fontSize="11" fill="#6b7280" textAnchor="end">{formatDate(lastDate.toISOString())}</text>
        {/* Line */}
        <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" />
        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={px(new Date(p.date).getTime())}
            cy={py(p.runningBalance)}
            r="2.5"
            fill="#2563eb"
          >
            <title>{formatDate(p.date)}: {formatMoney(p.runningBalance, currency)}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}