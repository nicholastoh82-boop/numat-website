// app/finance/transactions/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase, formatMoney, Account, Category } from '@/lib/finance';

type Txn = {
  id: string; transaction_date: string; entry_type: string; amount: number; currency: string;
  from_account_id: string | null; to_account_id: string | null; category_id: number | null;
  ue_bucket: string | null; vendor_payee: string | null; description: string | null;
  requisitioner: string | null; receipt_url: string | null; receipt_filename: string | null;
  staff_id: string | null; revolving_fund_batch_id: string | null;
  advance_status: string | null; status: string; submitted_by: string | null;
};

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [categories, setCategories] = useState<Map<number, Category>>(new Map());
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0,10));
  const [entryType, setEntryType] = useState('');
  const [accountId, setAccountId] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    let q = supabase.from('fin_transactions').select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .order('submitted_at', { ascending: false })
      .limit(500);
    if (entryType) q = q.eq('entry_type', entryType);
    if (accountId) q = q.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
    const { data } = await q;
    setTxns((data || []) as any);
    setLoading(false);
  }

  useEffect(() => { (async () => {
    const [accRes, catRes] = await Promise.all([
      supabase.from('fin_accounts').select('*'),
      supabase.from('fin_categories').select('*'),
    ]);
    setAccounts(new Map((accRes.data || []).map((a: any) => [a.id, a])));
    setCategories(new Map((catRes.data || []).map((c: any) => [c.id, c])));
    await load();
  })(); }, []);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [startDate, endDate, entryType, accountId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return txns;
    const s = search.toLowerCase();
    return txns.filter(t =>
      (t.description || '').toLowerCase().includes(s) ||
      (t.vendor_payee || '').toLowerCase().includes(s) ||
      (t.requisitioner || '').toLowerCase().includes(s)
    );
  }, [txns, search]);

  const totalOut = filtered.reduce((s, t) => s + (t.from_account_id && t.currency === 'PHP' ? Number(t.amount) : 0), 0);
  const totalIn = filtered.reduce((s, t) => s + (t.to_account_id && t.currency === 'PHP' ? Number(t.amount) : 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All Transactions</h1>
        <Link href="/finance/new" className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm">New Transaction</Link>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">From</div>
          <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">To</div>
          <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Type</div>
          <select className={inputCls} value={entryType} onChange={e => setEntryType(e.target.value)}>
            <option value="">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="salary">Salary</option>
            <option value="salary_advance">Salary Advance</option>
            <option value="liquidation">RF Liquidation</option>
            <option value="revolving_fund_advance">RF Disbursement</option>
            <option value="transfer">Transfer</option>
            <option value="fx_conversion">FX Conversion</option>
            <option value="bank_charge">Bank Charge</option>
            <option value="withholding_tax">Withholding Tax</option>
            <option value="interest_income">Interest Income</option>
            <option value="refund">Refund</option>
            <option value="shareholder_advance">Shareholder Advance</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Account</div>
          <select className={inputCls} value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">All accounts</option>
            {Array.from(accounts.values()).map(a => <option key={a.id} value={a.id}>{a.code}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="text-xs text-gray-600 mb-1">Search</div>
          <input className={inputCls} value={search} onChange={e => setSearch(e.target.value)} placeholder="description, vendor." />
        </label>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        Showing {filtered.length} transactions. PHP out: {formatMoney(totalOut)}, PHP in: {formatMoney(totalIn)}, net: {formatMoney(totalIn - totalOut)}
      </div>

      <div className="border border-gray-200 rounded bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Account</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2">Vendor</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Loading.</td></tr>)}
              {!loading && filtered.length === 0 && (<tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No transactions.</td></tr>)}
              {filtered.map(t => {
                const from = t.from_account_id ? accounts.get(t.from_account_id) : null;
                const to = t.to_account_id ? accounts.get(t.to_account_id) : null;
                const cat = t.category_id ? categories.get(t.category_id) : null;
                const dir = from && !to ? 'out' : !from && to ? 'in' : 'both';
                return (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{t.transaction_date}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{t.entry_type}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {from && <span className="text-red-700">{from.code}</span>}
                      {from && to && <span className="mx-1 text-gray-400">&rarr;</span>}
                      {to && <span className="text-green-700">{to.code}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {cat ? cat.name : '—'}
                      {t.ue_bucket && <span className="text-xs text-gray-500 ml-1">[{t.ue_bucket}]</span>}
                    </td>
                    <td className="px-3 py-2">{t.description || '—'}</td>
                    <td className="px-3 py-2">{t.vendor_payee || '—'}</td>
                    <td className={`px-3 py-2 text-right font-medium ${dir==='out'?'text-red-700':dir==='in'?'text-green-700':''}`}>
                      {dir==='out'?'−':dir==='in'?'+':''}{formatMoney(t.amount, t.currency)}
                    </td>
                    <td className="px-3 py-2">
                      {t.receipt_url
                        ? <a href={t.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">view</a>
                        : <span className="text-gray-400 text-xs">none</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-900';