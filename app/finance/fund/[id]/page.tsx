// app/finance/fund/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  supabase, loadCoaTree, uploadReceipt, todayISO, formatMoney,
  Classification, CostCenter, Category
} from '@/lib/finance';

type Batch = {
  id: string; batch_number: string; disbursed_on: string; disbursed_amount: number;
  status: string; custodian: string; disbursed_by: string | null;
  fund_account_id: string; source_account_id: string; notes: string | null;
};
type Line = {
  id: string; transaction_date: string; amount: number; description: string | null;
  vendor_payee: string | null; category_id: number | null; ue_bucket: string | null;
  receipt_url: string | null; receipt_filename: string | null; submitted_by: string | null; submitted_at: string;
};

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const batchId = params.id;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesById, setCategoriesById] = useState<Map<number, Category>>(new Map());
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // line entry form
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [classificationId, setClassificationId] = useState<number | ''>('');
  const [costCenterId, setCostCenterId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [vendor, setVendor] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const filteredCostCenters = useMemo(
    () => costCenters.filter(c => c.classification_id === classificationId),
    [costCenters, classificationId]
  );
  const filteredCategories = useMemo(
    () => categories.filter(c => c.cost_center_id === costCenterId),
    [categories, costCenterId]
  );

  async function refresh() {
    const [{ data: b }, { data: l }] = await Promise.all([
      supabase.from('fin_revolving_fund_batches').select('*').eq('id', batchId).single(),
      supabase.from('fin_transactions')
        .select('id, transaction_date, amount, description, vendor_payee, category_id, ue_bucket, receipt_url, receipt_filename, submitted_by, submitted_at')
        .eq('revolving_fund_batch_id', batchId)
        .eq('entry_type', 'liquidation')
        .neq('status', 'reversed')
        .order('transaction_date', { ascending: false })
        .order('submitted_at', { ascending: false }),
    ]);
    setBatch(b as any);
    setLines((l || []) as any);
  }

  useEffect(() => { (async () => {
    const tree = await loadCoaTree();
    setClassifications(tree.classifications);
    setCostCenters(tree.costCenters);
    setCategories(tree.categories);
    setCategoriesById(new Map(tree.categories.map(c => [c.id, c])));
    await refresh();
    // Load current user's roles. Ops users submit as pending, others as verified.
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: roleRows } = await supabase
        .from('user_roles').select('role').eq('user_id', authUser.id);
      setUserRoles(((roleRows ?? []) as { role: string }[]).map(r => r.role));
    }
    setLoading(false);
  })(); }, [batchId]);

  const totalLiquidated = lines.reduce((s, l) => s + Number(l.amount), 0);
  const remaining = batch ? Number(batch.disbursed_amount) - totalLiquidated : 0;

  async function addLine() {
    setErr(null); setOk(null);
    if (!amount || Number(amount) <= 0) { setErr('Amount must be greater than zero.'); return; }
    if (!categoryId) { setErr('Select a category.'); return; }
    if (!batch) return;
    setSaving(true);
    try {
      let receipt_url: string | null = null;
      let receipt_filename: string | null = null;
      if (receiptFile) {
        const up = await uploadReceipt(receiptFile, `rf_${batch.batch_number}`);
        if (!up) { setErr('Receipt upload failed.'); setSaving(false); return; }
        receipt_url = up.url; receipt_filename = receiptFile.name;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const isOps = userRoles.includes('ops') && !userRoles.includes('admin') && !userRoles.includes('finance');
      const { error } = await supabase.from('fin_transactions').insert({
        transaction_date: date,
        entry_type: 'liquidation',
        amount: Number(amount),
        currency: 'PHP',
        from_account_id: batch.fund_account_id,
        category_id: Number(categoryId),
        vendor_payee: vendor || null,
        description: description || null,
        receipt_url, receipt_filename,
        revolving_fund_batch_id: batch.id,
        submitted_by: user?.email || null,
        status: isOps ? 'pending' : 'verified',
      });
      if (error) throw error;

      // set batch status to liquidating if still open
      if (batch.status === 'open') {
        await supabase.from('fin_revolving_fund_batches').update({ status: 'liquidating' }).eq('id', batch.id);
      }

      setOk(`Line added (${formatMoney(Number(amount))}).`);
      setDescription(''); setAmount(''); setVendor(''); setReceiptFile(null);
      setClassificationId(''); setCostCenterId(''); setCategoryId('');
      const fileInput = document.getElementById('rf_receipt') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      await refresh();
    } catch (e: any) {
      setErr(e.message || 'Add line failed.');
    } finally {
      setSaving(false);
    }
  }

  async function closeBatch() {
    if (!batch) return;
    if (!confirm(`Close batch ${batch.batch_number}? No more lines can be added after closing.`)) return;
    setClosing(true);
    try {
      await supabase.from('fin_revolving_fund_batches')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', batch.id);
      await refresh();
    } finally {
      setClosing(false);
    }
  }

  if (loading || !batch) return <div className="text-gray-500">Loading.</div>;

  const locked = batch.status === 'closed';

  return (
    <div>
      <div className="mb-4">
        <Link href="/finance/fund" className="text-sm text-gray-500 hover:text-gray-900">&larr; Back to all batches</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{batch.batch_number}</h1>
          <div className="text-sm text-gray-600 mt-1">
            Disbursed {batch.disbursed_on}, custodian {batch.custodian}
            {batch.disbursed_by ? `, by ${batch.disbursed_by}` : ''}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-0.5 rounded ${
            batch.status === 'open' ? 'bg-green-50 text-green-700' :
            batch.status === 'closed' ? 'bg-gray-100 text-gray-600' :
            'bg-amber-50 text-amber-700'
          }`}>{batch.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card label="Disbursed" value={formatMoney(batch.disbursed_amount)} />
        <Card label="Liquidated" value={formatMoney(totalLiquidated)} sub={`${lines.length} lines`} />
        <Card label="Remaining" value={formatMoney(remaining)} tone={remaining < 0 ? 'red' : remaining < batch.disbursed_amount * 0.1 ? 'amber' : 'green'} />
      </div>

      {!locked && (
        <div className="bg-white border border-gray-200 rounded p-5 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add Liquidation Line</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
            </Field>
            <Field label="Amount (PHP)">
              <input type="number" step="0.01" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Fuel for truck, Meals OT, Saw blade" />
            </Field>

            <Field label="Classification">
              <select className={inputCls} value={classificationId}
                onChange={e => { setClassificationId(Number(e.target.value) || ''); setCostCenterId(''); setCategoryId(''); }}>
                <option value="">Select classification.</option>
                {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Cost Center">
              <select className={inputCls} value={costCenterId} disabled={!classificationId}
                onChange={e => { setCostCenterId(Number(e.target.value) || ''); setCategoryId(''); }}>
                <option value="">Select cost center.</option>
                {filteredCostCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Category" className="md:col-span-2">
              <select className={inputCls} value={categoryId} disabled={!costCenterId}
                onChange={e => setCategoryId(Number(e.target.value) || '')}>
                <option value="">Select category.</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.ue_bucket ? ` [${c.ue_bucket}]` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vendor (optional)">
              <input className={inputCls} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Store or supplier name" />
            </Field>
            <Field label="Receipt Photo">
              <input id="rf_receipt" type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
              {receiptFile && <div className="text-xs text-gray-500 mt-1">{receiptFile.name}</div>}
            </Field>
          </div>

          {err && <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">{err}</div>}
          {ok && <div className="mt-4 bg-green-50 text-green-700 border border-green-200 rounded px-3 py-2 text-sm">{ok}</div>}

          <div className="mt-5 flex gap-3">
            <button onClick={addLine} disabled={saving}
              className="bg-gray-900 text-white px-5 py-2 rounded hover:bg-gray-800 text-sm disabled:opacity-50">
              {saving ? 'Saving.' : 'Add Line'}
            </button>
            {remaining <= 0.01 && (
              <button onClick={closeBatch} disabled={closing}
                className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-800 text-sm disabled:opacity-50">
                {closing ? 'Closing.' : 'Close Batch'}
              </button>
            )}
            {remaining > 0.01 && batch.status !== 'open' && (
              <button onClick={closeBatch} disabled={closing}
                className="px-5 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm disabled:opacity-50">
                Close Batch (variance {formatMoney(remaining)})
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Liquidation Lines ({lines.length})</h2>
        <div className="border border-gray-200 rounded bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Vendor</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Receipt</th>
                <th className="text-left px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No lines yet.</td></tr>
              )}
              {lines.map(l => {
                const cat = l.category_id ? categoriesById.get(l.category_id) : null;
                return (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap">{l.transaction_date}</td>
                    <td className="px-3 py-2">{l.description || '—'}</td>
                    <td className="px-3 py-2">
                      {cat ? cat.name : '—'}
                      {l.ue_bucket && <span className="text-xs text-gray-500 ml-1">[{l.ue_bucket}]</span>}
                    </td>
                    <td className="px-3 py-2">{l.vendor_payee || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(l.amount)}</td>
                    <td className="px-3 py-2">
                      {l.receipt_url
                        ? <a href={l.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">view</a>
                        : <span className="text-gray-400">none</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{l.submitted_by || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            {lines.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={4} className="px-3 py-2 font-medium text-right">Total liquidated</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatMoney(totalLiquidated)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-900 disabled:bg-gray-50';

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className}`}><div className="text-sm font-medium text-gray-700 mb-1">{label}</div>{children}</label>;
}

function Card({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default'|'green'|'amber'|'red' }) {
  const toneCls = tone === 'green' ? 'text-green-700' : tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="border border-gray-200 rounded p-4 bg-white">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}