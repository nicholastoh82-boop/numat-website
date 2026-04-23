// app/finance/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, formatMoney, AccountBalance } from '@/lib/finance';

type Advance = { staff_id: string; staff_name: string; outstanding_amount: number; advance_count: number; oldest_advance_date: string };
type RfBatch = { id: string; batch_number: string; disbursed_on: string; disbursed_amount: number; total_liquidated: number; remaining_balance: number; status: string; custodian: string; line_count: number };

export default function FinanceDashboard() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [openBatches, setOpenBatches] = useState<RfBatch[]>([]);
  const [monthSpend, setMonthSpend] = useState<{ ue_bucket: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const month = new Date().toISOString().slice(0,7);
    const monthStart = `${month}-01`;
    const [bal, adv, rf, txn] = await Promise.all([
      supabase.from('fin_account_balances').select('*').order('display_order'),
      supabase.from('fin_outstanding_advances').select('*').order('oldest_advance_date'),
      supabase.from('fin_rf_batch_summary').select('*').neq('status', 'closed').order('disbursed_on', { ascending: false }),
      supabase.from('fin_transactions').select('ue_bucket, amount')
        .gte('transaction_date', monthStart)
        .in('entry_type', ['expense','salary','liquidation','bank_charge','withholding_tax'])
        .neq('status','reversed'),
    ]);
    setBalances((bal.data || []) as any);
    setAdvances((adv.data || []) as any);
    setOpenBatches((rf.data || []) as any);
    const grouped = new Map<string, number>();
    (txn.data || []).forEach((t: any) => {
      const key = t.ue_bucket || 'Unclassified';
      grouped.set(key, (grouped.get(key) || 0) + Number(t.amount));
    });
    setMonthSpend(Array.from(grouped.entries()).map(([ue_bucket, total]) => ({ ue_bucket, total })));
    setLoading(false);
  })(); }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard.</div>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-3">Bank and Fund Balances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map(a => (
            <div key={a.id} className="border border-gray-200 rounded p-4 bg-white">
              <div className="text-xs uppercase tracking-wide text-gray-500">{a.code}</div>
              <div className="text-sm font-medium text-gray-800 mt-0.5">{a.name}</div>
              <div className="text-2xl font-semibold mt-2">{formatMoney(a.current_balance, a.currency)}</div>
              <div className="text-xs text-gray-400 mt-1">{a.account_type}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Outstanding Salary Advances</h2>
            <Link href="/finance/new" className="text-sm text-blue-600 hover:underline">Record salary payment</Link>
          </div>
          {advances.length === 0 ? (
            <div className="text-sm text-gray-500 border border-gray-200 rounded p-4 bg-white">No outstanding advances.</div>
          ) : (
            <div className="border border-gray-200 rounded bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="text-left px-3 py-2">Staff</th><th className="text-right px-3 py-2">Outstanding</th><th className="text-right px-3 py-2">Advances</th><th className="text-left px-3 py-2">Oldest</th></tr>
                </thead>
                <tbody>
                  {advances.map(a => (
                    <tr key={a.staff_id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{a.staff_name}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatMoney(a.outstanding_amount)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{a.advance_count}</td>
                      <td className="px-3 py-2 text-gray-600">{a.oldest_advance_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Open Revolving Fund Batches</h2>
            <Link href="/finance/fund" className="text-sm text-blue-600 hover:underline">Manage</Link>
          </div>
          {openBatches.length === 0 ? (
            <div className="text-sm text-gray-500 border border-gray-200 rounded p-4 bg-white">No open batches.</div>
          ) : (
            <div className="space-y-2">
              {openBatches.map(b => (
                <Link key={b.id} href={`/finance/fund/${b.id}`}
                  className="block border border-gray-200 rounded p-3 bg-white hover:border-gray-400">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{b.batch_number}</div>
                      <div className="text-xs text-gray-500">{b.disbursed_on}, custodian {b.custodian}, {b.line_count} lines</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Remaining</div>
                      <div className="font-semibold">{formatMoney(b.remaining_balance)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">This Month by Unit Econ Bucket</h2>
        <div className="border border-gray-200 rounded bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr><th className="text-left px-3 py-2">Bucket</th><th className="text-right px-3 py-2">Actual Spend (PHP equiv)</th></tr>
            </thead>
            <tbody>
              {monthSpend.sort((a,b) => b.total - a.total).map(m => (
                <tr key={m.ue_bucket} className="border-t border-gray-100">
                  <td className="px-3 py-2">{m.ue_bucket}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">Note, multi currency not yet FX converted, shows nominal amounts. Variance to model comes in the Reports page.</p>
      </section>
    </div>
  );
}