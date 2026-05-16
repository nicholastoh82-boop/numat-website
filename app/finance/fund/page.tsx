// app/finance/fund/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, loadAccounts, formatMoney, todayISO, Account } from '@/lib/finance';

type BatchSummary = {
  id: string; batch_number: string; disbursed_on: string; disbursed_amount: number;
  total_liquidated: number; remaining_balance: number; line_count: number;
  status: string; custodian: string; disbursed_by: string | null;
};

export default function FundListPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const [batchNumber, setBatchNumber] = useState('');
  const [disbursedOn, setDisbursedOn] = useState(todayISO());
  const [amount, setAmount] = useState('20000');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [fundAccountId, setFundAccountId] = useState('');
  const [custodian, setCustodian] = useState('Boyet');
  const [disbursedBy, setDisbursedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const [bRes, aRes] = await Promise.all([
      supabase.from('fin_rf_batch_summary').select('*').order('disbursed_on', { ascending: false }),
      loadAccounts(),
    ]);
    setBatches((bRes.data || []) as any);
    setAccounts(aRes);
    const rf = aRes.find(a => a.account_type === 'revolving_fund');
    const rcbc = aRes.find(a => a.code === 'RCBC_PHP');
    if (rf) setFundAccountId(prev => prev || rf.id);
    if (rcbc) setSourceAccountId(prev => prev || rcbc.id);
    setBatchNumber(prev => prev || autoBatchNumber(bRes.data as any));
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function autoBatchNumber(existing: BatchSummary[]): string {
    const year = new Date().getFullYear();
    const thisYear = (existing || []).filter(b => b.batch_number?.startsWith(`RF_${year}_`));
    const next = String(thisYear.length + 1).padStart(3, '0');
    return `RF_${year}_${next}`;
  }

  async function createBatch() {
    setErr(null);
    if (!batchNumber || !amount || !sourceAccountId || !fundAccountId) {
      setErr('Fill batch number, amount, source and fund accounts.'); return;
    }
    if (Number(amount) <= 0) { setErr('Amount must be greater than zero.'); return; }
    setSaving(true);
    try {
      const { data: batch, error: e1 } = await supabase.from('fin_revolving_fund_batches').insert({
        batch_number: batchNumber,
        disbursed_on: disbursedOn,
        disbursed_amount: Number(amount),
        disbursed_currency: 'PHP',
        source_account_id: sourceAccountId,
        fund_account_id: fundAccountId,
        custodian, disbursed_by: disbursedBy || null,
        notes: notes || null,
        status: 'open',
      }).select('id').single();
      if (e1) throw e1;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: e2 } = await supabase.from('fin_transactions').insert({
        transaction_date: disbursedOn,
        entry_type: 'revolving_fund_advance',
        amount: Number(amount),
        currency: 'PHP',
        from_account_id: sourceAccountId,
        to_account_id: fundAccountId,
        revolving_fund_batch_id: batch.id,
        description: `Revolving fund disbursement batch ${batchNumber}`,
        submitted_by: user?.email || null,
      });
      if (e2) throw e2;

      setShowCreate(false);
      setBatchNumber(''); setAmount('20000'); setNotes(''); setDisbursedBy('');
      await refresh();
    } catch (e: any) {
      setErr(e.message || 'Create failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Revolving Fund</h1>
        <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm">
          Disburse New Batch
        </button>
      </div>

      {loading ? <div className="text-gray-500">Loading.</div> : (
        <div className="border border-gray-200 rounded bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Batch</th>
                <th className="text-left px-3 py-2">Disbursed</th>
                <th className="text-left px-3 py-2">Custodian</th>
                <th className="text-right px-3 py-2">Disbursed</th>
                <th className="text-right px-3 py-2">Liquidated</th>
                <th className="text-right px-3 py-2">Remaining</th>
                <th className="text-right px-3 py-2">Lines</th>
                <th className="text-left px-3 py-2">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">No batches yet.</td></tr>
              )}
              {batches.map(b => (
                <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{b.batch_number}</td>
                  <td className="px-3 py-2">{b.disbursed_on}</td>
                  <td className="px-3 py-2">{b.custodian}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(b.disbursed_amount)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(b.total_liquidated)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(b.remaining_balance)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{b.line_count}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      b.status === 'open' ? 'bg-green-50 text-green-700' :
                      b.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                      'bg-amber-50 text-amber-700'
                    }`}>{b.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/finance/fund/${b.id}`} className="text-blue-600 hover:underline text-sm">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded p-6 max-w-lg w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Disburse New Revolving Fund Batch</h2>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Batch Number</div>
              <input className={inputCls} value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Disbursed On</div>
                <input type="date" className={inputCls} value={disbursedOn} onChange={e => setDisbursedOn(e.target.value)} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Amount (PHP)</div>
                <input type="number" onWheel={(e) => e.currentTarget.blur()} step="0.01" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Source Account (money out)</div>
              <select className={inputCls} value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)}>
                <option value="">Select.</option>
                {accounts.filter(a => a.account_type === 'bank').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Fund Account</div>
              <select className={inputCls} value={fundAccountId} onChange={e => setFundAccountId(e.target.value)}>
                <option value="">Select.</option>
                {accounts.filter(a => a.account_type === 'revolving_fund').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Custodian</div>
                <input className={inputCls} value={custodian} onChange={e => setCustodian(e.target.value)} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Disbursed By</div>
                <input className={inputCls} value={disbursedBy} onChange={e => setDisbursedBy(e.target.value)} placeholder="Nick" />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
              <textarea className={inputCls + ' min-h-[60px]'} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {err && <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">{err}</div>}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={createBatch} disabled={saving} className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm disabled:opacity-50">
                {saving ? 'Saving.' : 'Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-900';