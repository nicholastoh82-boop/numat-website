'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SupplierOption = { id: string; name: string }
type Line = { description: string; qty: string; unit_price: string }

export function SupplierAdd() {
  const router = useRouter()
  const [f, setF] = useState({ name: '', contact_name: '', email: '', phone: '', address: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function set(k: string, v: string) {
    setF((p) => ({ ...p, [k]: v }))
  }

  async function submit() {
    if (!f.name.trim()) {
      setMsg('Name is required.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/buying/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not add.')
        return
      }
      setF({ name: '', contact_name: '', email: '', phone: '', address: '', notes: '' })
      setMsg('Added.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <h3 className="text-sm font-semibold text-gray-900">Add a supplier</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Supplier name" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Contact person" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Email" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Address" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
      <input value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes, for example what they supply" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={busy} className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Adding...' : 'Add supplier'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}

export function SupplierDelete({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!confirm('Remove this supplier?')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/buying/suppliers?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" onClick={remove} disabled={busy} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
      {busy ? '...' : 'Remove'}
    </button>
  )
}

export function OrderCreate({ suppliers }: { suppliers: SupplierOption[] }) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [currency, setCurrency] = useState('PHP')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ description: '', qty: '', unit_price: '' }])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function setLine(i: number, k: keyof Line, v: string) {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)))
  }
  function addLine() {
    setLines((p) => [...p, { description: '', qty: '', unit_price: '' }])
  }
  function removeLine(i: number) {
    setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))
  }

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0)

  async function submit() {
    const items = lines
      .map((l) => ({ description: l.description.trim(), qty: Number(l.qty) || 0, unit_price: Number(l.unit_price) || 0 }))
      .filter((it) => it.description || it.qty || it.unit_price)
    if (items.length === 0) {
      setMsg('Add at least one line item.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/buying/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: supplierId || null,
          reference,
          order_date: orderDate || null,
          expected_date: expectedDate || null,
          currency,
          notes,
          items,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not create.')
        return
      }
      setSupplierId('')
      setReference('')
      setOrderDate('')
      setExpectedDate('')
      setNotes('')
      setLines([{ description: '', qty: '', unit_price: '' }])
      setMsg('Created.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">New purchase order</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Choose a supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference, optional" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <label className="text-xs text-gray-500">
          Order date
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </label>
        <label className="text-xs text-gray-500">
          Expected date
          <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Line items</div>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} placeholder="Item" className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm" />
            <input value={l.qty} onChange={(e) => setLine(i, 'qty', e.target.value)} placeholder="Qty" inputMode="decimal" className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm" />
            <input value={l.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} placeholder="Price" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm" />
            <button type="button" onClick={() => removeLine(i)} className="shrink-0 px-2 text-sm text-gray-400 hover:text-red-600" aria-label="Remove line">
              x
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <button type="button" onClick={addLine} className="text-xs font-medium text-green-700">
            Add line
          </button>
          <div className="text-sm font-semibold text-gray-900">
            Total: {currency} {total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes, optional" className="rounded border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={busy} className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Creating...' : 'Create order'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}

export function OrderStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function change(next: string) {
    setBusy(true)
    try {
      await fetch('/api/portal/buying/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <select value={status} onChange={(e) => change(e.target.value)} disabled={busy} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-50">
      <option value="draft">Draft</option>
      <option value="ordered">Ordered</option>
      <option value="received">Received</option>
    </select>
  )
}

export function OrderDelete({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!confirm('Delete this purchase order?')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/buying/orders?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" onClick={remove} disabled={busy} className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
      {busy ? '...' : 'Delete'}
    </button>
  )
}
