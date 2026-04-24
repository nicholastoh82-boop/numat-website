// app/finance/new/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  supabase, loadCoaTree, loadAccounts, loadStaff, uploadReceipt, todayISO,
  ENTRY_TYPE_OPTIONS, EntryType, Account, Staff, Classification, CostCenter, Category, formatMoney
} from '@/lib/finance';
import CategoryPicker, { buildPickerOptions, type PickerOption } from '@/components/finance/CategoryPicker';

type OutstandingAdvance = { id: string; transaction_date: string; amount: number; description: string | null };

export default function NewTransactionPage() {
  const router = useRouter();

  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [date, setDate] = useState(todayISO());
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [fxRate, setFxRate] = useState('');
  const [pickerValue, setPickerValue] = useState<PickerOption | null>(null);
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [requisitioner, setRequisitioner] = useState('');
  const [staffId, setStaffId] = useState('');
  const [prAmount, setPrAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [outstandingAdvances, setOutstandingAdvances] = useState<OutstandingAdvance[]>([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => { (async () => {
    const [tree, accs, staffList] = await Promise.all([loadCoaTree(), loadAccounts(), loadStaff()]);
    setClassifications(tree.classifications);
    setCostCenters(tree.costCenters);
    setCategories(tree.categories);
    setAccounts(accs);
    setStaff(staffList);
  })(); }, []);

  const typeCfg = useMemo(() => ENTRY_TYPE_OPTIONS.find(o => o.value === entryType)!, [entryType]);
  const pickerOptions = useMemo(
    () => buildPickerOptions(classifications, costCenters, categories),
    [classifications, costCenters, categories],
  );
  const needsCategory = !['transfer','fx_conversion'].includes(entryType);
  const needsStaff = ['salary','salary_advance'].includes(entryType);
  const isFxBetweenCurrencies = useMemo(() => {
    if (entryType !== 'fx_conversion') return false;
    const from = accounts.find(a => a.id === fromAccountId);
    const to = accounts.find(a => a.id === toAccountId);
    return !!(from && to && from.currency !== to.currency);
  }, [entryType, fromAccountId, toAccountId, accounts]);

  useEffect(() => {
    const acc = accounts.find(a => a.id === fromAccountId);
    if (acc && typeCfg.needsFromAccount) setCurrency(acc.currency);
  }, [fromAccountId, accounts, typeCfg.needsFromAccount]);

  useEffect(() => {
    if (entryType === 'salary' && staffId) {
      (async () => {
        const { data } = await supabase.from('fin_transactions')
          .select('id, transaction_date, amount, description')
          .eq('staff_id', staffId)
          .eq('entry_type', 'salary_advance')
          .eq('advance_status', 'outstanding')
          .neq('status', 'reversed')
          .order('transaction_date');
        setOutstandingAdvances((data || []) as any);
      })();
    } else {
      setOutstandingAdvances([]);
      setSelectedAdvanceIds([]);
    }
  }, [entryType, staffId]);

  const selectedAdvanceTotal = outstandingAdvances
    .filter(a => selectedAdvanceIds.includes(a.id))
    .reduce((s, a) => s + Number(a.amount), 0);

  async function submit() {
    setErr(null); setOk(null);
    if (!amount || Number(amount) <= 0) { setErr('Amount must be greater than zero.'); return; }
    if (typeCfg.needsFromAccount && !fromAccountId) { setErr('Select a From Account.'); return; }
    if (typeCfg.needsToAccount && !toAccountId) { setErr('Select a To Account.'); return; }
    if (needsCategory && !pickerValue) { setErr('Select a category.'); return; }
    if (needsStaff && !staffId) { setErr('Select staff.'); return; }

    setSubmitting(true);
    try {
      let receipt_url: string | null = null;
      let receipt_filename: string | null = null;
      if (receiptFile) {
        const up = await uploadReceipt(receiptFile, 'txn');
        if (!up) { setErr('Receipt upload failed.'); setSubmitting(false); return; }
        receipt_url = up.url;
        receipt_filename = receiptFile.name;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const payload: any = {
        transaction_date: date,
        entry_type: entryType,
        amount: Number(amount),
        currency,
        from_account_id: typeCfg.needsFromAccount ? fromAccountId : null,
        to_account_id: typeCfg.needsToAccount ? toAccountId : null,
        fx_rate: isFxBetweenCurrencies && fxRate ? Number(fxRate) : null,
        category_id: needsCategory && pickerValue ? pickerValue.category_id : null,
        cost_center_id: needsCategory && pickerValue ? pickerValue.cost_center_id : null,
        classification_id: needsCategory && pickerValue ? pickerValue.classification_id : null,
        vendor_payee: vendor || null,
        description: description || null,
        requisitioner: requisitioner || null,
        staff_id: needsStaff && staffId ? staffId : null,
        pr_amount: prAmount ? Number(prAmount) : null,
        bank_reference: bankRef || null,
        notes: notes || null,
        receipt_url, receipt_filename,
        submitted_by: user?.email || null,
        advance_status: entryType === 'salary_advance' ? 'outstanding' : null,
      };

      const { data: inserted, error } = await supabase
        .from('fin_transactions').insert(payload).select('id').single();
      if (error) throw error;

      if (entryType === 'salary' && selectedAdvanceIds.length > 0) {
        const { error: e2 } = await supabase.from('fin_transactions')
          .update({ advance_status: 'settled', settled_by_txn_id: inserted.id })
          .in('id', selectedAdvanceIds);
        if (e2) throw e2;
      }

      setOk('Transaction saved.');
      setTimeout(() => router.push('/finance'), 600);
    } catch (e: any) {
      setErr(e.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">New Transaction</h1>

      <div className="space-y-5 bg-white border border-gray-200 rounded p-6">

        <Row label="Entry Type">
          <select className={inputCls} value={entryType} onChange={e => {
            setEntryType(e.target.value as EntryType);
            setPickerValue(null);
            setFromAccountId(''); setToAccountId('');
          }}>
            {ENTRY_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Row>

        <Row label="Date">
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </Row>

        {typeCfg.needsFromAccount && (
          <Row label="From Account">
            <select className={inputCls} value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}>
              <option value="">Select account.</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </Row>
        )}

        {typeCfg.needsToAccount && (
          <Row label="To Account">
            <select className={inputCls} value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
              <option value="">Select account.</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </Row>
        )}

        <Row label="Amount">
          <div className="flex gap-2">
            <input type="number" step="0.01" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            <select className={inputCls + ' w-28'} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option>PHP</option><option>USD</option><option>SGD</option>
            </select>
          </div>
        </Row>

        {isFxBetweenCurrencies && (
          <Row label="FX Rate">
            <input type="number" step="0.000001" className={inputCls} value={fxRate} onChange={e => setFxRate(e.target.value)}
              placeholder="e.g. 56.75 PHP per USD" />
          </Row>
        )}

        {needsCategory && (
          <Row label="Category">
            <CategoryPicker
              options={pickerOptions}
              value={pickerValue}
              onChange={setPickerValue}
            />
          </Row>
        )}

        {needsStaff && (
          <Row label="Staff">
            <select className={inputCls} value={staffId} onChange={e => setStaffId(e.target.value)}>
              <option value="">Select staff.</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
            </select>
          </Row>
        )}

        {entryType === 'salary' && outstandingAdvances.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded p-4">
            <div className="font-medium mb-2 text-amber-900">Outstanding advances for this staff</div>
            <div className="text-xs text-amber-800 mb-3">
              Tick the advances to settle against this salary. Selected total will be deducted.
            </div>
            <div className="space-y-1">
              {outstandingAdvances.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selectedAdvanceIds.includes(a.id)}
                    onChange={e => setSelectedAdvanceIds(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id))} />
                  <span>{a.transaction_date}, {formatMoney(a.amount)}, {a.description || 'no description'}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 text-sm text-amber-900 font-medium">
              Selected advance total: {formatMoney(selectedAdvanceTotal)}
              <span className="text-amber-700 font-normal"> (this salary payment amount should equal gross salary minus this, or record gross salary here)</span>
            </div>
          </div>
        )}

        <Row label="Vendor or Payee">
          <input className={inputCls} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Ohana Lodging" />
        </Row>

        <Row label="Description">
          <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" />
        </Row>

        <Row label="Requisitioner">
          <input className={inputCls} value={requisitioner} onChange={e => setRequisitioner(e.target.value)} placeholder="Who asked for this (Nick, Bryan, Boyet, etc.)" />
        </Row>

        <Row label="PR Amount (optional)">
          <input type="number" step="0.01" className={inputCls} value={prAmount} onChange={e => setPrAmount(e.target.value)}
            placeholder="Original purchase requisition amount for variance tracking" />
        </Row>

        <Row label="Bank Reference (optional)">
          <input className={inputCls} value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder="OR number, transfer ref, etc." />
        </Row>

        <Row label="Receipt Upload">
          <input type="file" accept="image/*,.pdf" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
          {receiptFile && <div className="text-xs text-gray-500 mt-1">{receiptFile.name}</div>}
        </Row>

        <Row label="Notes">
          <textarea className={inputCls + ' min-h-[80px]'} value={notes} onChange={e => setNotes(e.target.value)} />
        </Row>

        {err && <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">{err}</div>}
        {ok && <div className="bg-green-50 text-green-700 border border-green-200 rounded px-3 py-2 text-sm">{ok}</div>}

        <div className="flex gap-3">
          <button onClick={submit} disabled={submitting}
            className="bg-gray-900 text-white px-5 py-2 rounded hover:bg-gray-800 disabled:opacity-50">
            {submitting ? 'Saving.' : 'Save Transaction'}
          </button>
          <button onClick={() => router.push('/finance')} className="px-5 py-2 rounded border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-900';
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-sm font-medium text-gray-700 mb-1">{label}</div>{children}</label>;
}