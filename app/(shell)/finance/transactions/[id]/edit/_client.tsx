"use client";
// app/finance/transactions/[id]/edit/page.tsx
// Full edit form for a single transaction. Use this to correct mistakes.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getFinanceSupabase,
  ENTRY_TYPE_LABELS,
  TX_STATUS_LABELS,
  ADVANCE_STATUS_LABELS,
  formatDate,
  formatMoney,
  type Transaction,
  type Account,
  type Classification,
  type CostCenter,
  type Category,
  type Staff,
  type EntryType,
} from "@/lib/finance";
import CategoryPicker, {
  buildPickerOptions,
  type PickerOption,
} from "@/components/finance/CategoryPicker";

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const supabase = getFinanceSupabase();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tx, setTx] = useState<Transaction | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [pickerValue, setPickerValue] = useState<PickerOption | null>(null);

  // Form state
  const [form, setForm] = useState({
    transaction_date: "",
    entry_type: "expense" as EntryType,
    amount: "",
    currency: "PHP" as "PHP" | "USD" | "SGD",
    from_account_id: "",
    to_account_id: "",
    classification_id: "",
    cost_center_id: "",
    category_id: "",
    staff_id: "",
    vendor_payee: "",
    description: "",
    requisitioner: "",
    notes: "",
    advance_status: "" as "" | "outstanding" | "settled" | "written_off",
    status: "verified" as "pending" | "verified" | "flagged" | "reversed",
    bank_reference: "",
    fx_rate: "",
  });

  // Load data
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, a, cls, cc, cat, st] = await Promise.all([
        supabase.from("fin_transactions").select("*").eq("id", id).single(),
        supabase.from("fin_accounts").select("*").eq("is_active", true).order("display_order"),
        supabase.from("fin_classifications").select("*").eq("is_active", true).order("display_order"),
        supabase.from("fin_cost_centers").select("*").eq("is_active", true).order("display_order"),
        supabase.from("fin_categories").select("*").eq("is_active", true).order("display_order"),
        supabase.from("fin_staff").select("*").eq("is_active", true).order("display_order"),
      ]);

      if (t.error || !t.data) {
        setErrorMsg(`Could not load transaction, ${t.error?.message ?? "not found"}`);
        setLoading(false);
        return;
      }

      const txData = t.data as Transaction;
      setTx(txData);
      const loadedClassifications = (cls.data as Classification[]) ?? [];
      const loadedCostCenters = (cc.data as CostCenter[]) ?? [];
      const loadedCategories = (cat.data as Category[]) ?? [];

      setAccounts((a.data as Account[]) ?? []);
      setClassifications(loadedClassifications);
      setCostCenters(loadedCostCenters);
      setCategories(loadedCategories);
      setStaff((st.data as Staff[]) ?? []);

      if (txData.category_id != null) {
        const opts = buildPickerOptions(loadedClassifications, loadedCostCenters, loadedCategories);
        const match = opts.find((o) => o.category_id === txData.category_id) ?? null;
        setPickerValue(match);
      } else {
        setPickerValue(null);
      }

      setForm({
        transaction_date: txData.transaction_date,
        entry_type: txData.entry_type,
        amount: String(txData.amount),
        currency: txData.currency,
        from_account_id: txData.from_account_id ?? "",
        to_account_id: txData.to_account_id ?? "",
        classification_id: txData.classification_id ? String(txData.classification_id) : "",
        cost_center_id: txData.cost_center_id ? String(txData.cost_center_id) : "",
        category_id: txData.category_id ? String(txData.category_id) : "",
        staff_id: txData.staff_id ?? "",
        vendor_payee: txData.vendor_payee ?? "",
        description: txData.description ?? "",
        requisitioner: txData.requisitioner ?? "",
        notes: txData.notes ?? "",
        advance_status: (txData.advance_status ?? "") as "" | "outstanding" | "settled" | "written_off",
        status: (txData.status ?? "verified") as "pending" | "verified" | "flagged" | "reversed",
        bank_reference: txData.bank_reference ?? "",
        fx_rate: txData.fx_rate ? String(txData.fx_rate) : "",
      });
      setLoading(false);
    })();
  }, [id, supabase]);

  const pickerOptions = useMemo(
    () => buildPickerOptions(classifications, costCenters, categories),
    [classifications, costCenters, categories],
  );

  const needsCategory = !["transfer", "fx_conversion"].includes(form.entry_type);

  async function handleSave() {
    if (!tx) return;
    setSaving(true);
    setErrorMsg(null);

    const patch: Partial<Transaction> = {
      transaction_date: form.transaction_date,
      entry_type: form.entry_type,
      amount: Number(form.amount),
      currency: form.currency,
      from_account_id: form.from_account_id || null,
      to_account_id: form.to_account_id || null,
      classification_id: form.classification_id ? Number(form.classification_id) : null,
      cost_center_id: form.cost_center_id ? Number(form.cost_center_id) : null,
      category_id: form.category_id ? Number(form.category_id) : null,
      staff_id: form.staff_id || null,
      vendor_payee: form.vendor_payee || null,
      description: form.description || null,
      requisitioner: form.requisitioner || null,
      notes: form.notes || null,
      advance_status: (form.advance_status || null) as any,
      status: form.status,
      bank_reference: form.bank_reference || null,
      fx_rate: form.fx_rate ? Number(form.fx_rate) : null,
    };

    const { error } = await supabase.from("fin_transactions").update(patch).eq("id", tx.id);
    setSaving(false);
    if (error) {
      setErrorMsg(`Save failed, ${error.message}`);
      return;
    }
    router.push("/finance/transactions");
  }

  async function handleReverse() {
    if (!tx) return;
    if (!confirm("Mark this transaction as reversed? This will remove it from balance calculations, but keep it in the history.")) return;
    setSaving(true);
    const { error } = await supabase
      .from("fin_transactions")
      .update({ status: "reversed", notes: (tx.notes ?? "") + " , marked reversed via edit form" })
      .eq("id", tx.id);
    setSaving(false);
    if (error) {
      setErrorMsg(`Reversal failed, ${error.message}`);
      return;
    }
    router.push("/finance/transactions");
  }

  async function handleDelete() {
    if (!tx) return;
    const really = prompt(
      'This will PERMANENTLY delete this transaction. Type the word DELETE to confirm.'
    );
    if (really !== "DELETE") return;
    setSaving(true);
    const { error } = await supabase.from("fin_transactions").delete().eq("id", tx.id);
    setSaving(false);
    if (error) {
      setErrorMsg(`Delete failed, ${error.message}`);
      return;
    }
    router.push("/finance/transactions");
  }

  if (loading) return <div className="p-6 text-gray-600">Loading transaction, please wait...</div>;
  if (errorMsg && !tx) return <div className="p-6 text-red-700">{errorMsg}</div>;
  if (!tx) return null;

  return (
    <div className="p-6 bg-white max-w-4xl">
      <div className="mb-4">
        <Link href="/finance/transactions" className="text-sm text-blue-600 hover:underline">
          Back to all transactions
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Edit Transaction</h1>
      <p className="text-sm text-gray-500 mb-6">
        Original entry dated {formatDate(tx.transaction_date)}, amount {formatMoney(Number(tx.amount), tx.currency)}, submitted by {tx.submitted_by ?? "unknown"}.
      </p>

      {errorMsg ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMsg}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Transaction Date">
          <input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="input" />
        </Field>

        <Field label="Entry Type">
          <select value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value as EntryType })} className="input">
            {(Object.keys(ENTRY_TYPE_LABELS) as EntryType[]).map((k) => (
              <option key={k} value={k}>
                {ENTRY_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount">
          <input type="number" onWheel={(e) => e.currentTarget.blur()} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
        </Field>

        <Field label="Currency">
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "PHP" | "USD" | "SGD" })} className="input">
            <option value="PHP">Philippine Peso (PHP)</option>
            <option value="USD">US Dollar (USD)</option>
            <option value="SGD">Singapore Dollar (SGD)</option>
          </select>
        </Field>

        <Field label="From Account (money out)">
          <select value={form.from_account_id} onChange={(e) => setForm({ ...form, from_account_id: e.target.value })} className="input">
            <option value="">None (Income Entry)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </Field>

        <Field label="To Account (money in)">
          <select value={form.to_account_id} onChange={(e) => setForm({ ...form, to_account_id: e.target.value })} className="input">
            <option value="">None (Expense Entry)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </Field>

        {needsCategory && (
          <div className="md:col-span-2">
            <Field label="Category">
              <CategoryPicker
                options={pickerOptions}
                value={pickerValue}
                onChange={(opt) => {
                  setPickerValue(opt);
                  setForm((prev) => ({
                    ...prev,
                    classification_id: opt ? String(opt.classification_id) : "",
                    cost_center_id: opt ? String(opt.cost_center_id) : "",
                    category_id: opt ? String(opt.category_id) : "",
                  }));
                }}
              />
            </Field>
          </div>
        )}

        <Field label="Staff Member (if salary or advance)">
          <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} className="input">
            <option value="">None</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.role ? `, ${s.role}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vendor or Payee">
          <input type="text" value={form.vendor_payee} onChange={(e) => setForm({ ...form, vendor_payee: e.target.value })} className="input" />
        </Field>

        <Field label="Requisitioner (who requested it)">
          <input type="text" value={form.requisitioner} onChange={(e) => setForm({ ...form, requisitioner: e.target.value })} className="input" />
        </Field>

        <Field label="Advance Status (only for salary advances)">
          <select
            value={form.advance_status}
            onChange={(e) => setForm({ ...form, advance_status: e.target.value as "" | "outstanding" | "settled" | "written_off" })}
            className="input"
          >
            <option value="">Not Applicable</option>
            {(Object.keys(ADVANCE_STATUS_LABELS) as Array<keyof typeof ADVANCE_STATUS_LABELS>).map((k) => (
              <option key={k} value={k}>
                {ADVANCE_STATUS_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Transaction Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="input">
            {(Object.keys(TX_STATUS_LABELS) as Array<keyof typeof TX_STATUS_LABELS>).map((k) => (
              <option key={k} value={k}>
                {TX_STATUS_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Bank Reference Number">
          <input type="text" value={form.bank_reference} onChange={(e) => setForm({ ...form, bank_reference: e.target.value })} className="input" />
        </Field>

        <Field label="Foreign Exchange Rate (if applicable)">
          <input type="number" onWheel={(e) => e.currentTarget.blur()} step="0.0001" value={form.fx_rate} onChange={(e) => setForm({ ...form, fx_rate: e.target.value })} className="input" />
        </Field>

        <div className="md:col-span-2">
          <Field label="Description">
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Notes">
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link href="/finance/transactions" className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>

        <div className="flex gap-3">
          {tx.status !== "reversed" && (
            <button onClick={handleReverse} disabled={saving} className="rounded-md border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50">
              Mark as Reversed
            </button>
          )}
          <button onClick={handleDelete} disabled={saving} className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Delete Permanently
          </button>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(209, 213, 219);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(17, 24, 39);
        }
        .input:focus {
          outline: 2px solid rgb(59, 130, 246);
          outline-offset: -1px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}