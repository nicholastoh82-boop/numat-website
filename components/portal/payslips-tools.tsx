'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function GenerateForm() {
  const router = useRouter()
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/payslips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not generate.')
        return
      }
      setMsg(j.count > 0 ? `Generated ${j.count} payslips for ${j.period_label}.` : `No salary payouts found for ${j.period_label}.`)
      router.refresh()
    } catch {
      setMsg('Could not generate.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">Generate payslips</h2>
      <p className="text-xs text-gray-500">
        Builds payslips for a month from the verified salary payouts in your financials. Running it
        again updates that month, including any extras you added below.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Generating...' : 'Generate'}
        </button>
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  )
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white"
    >
      Download or print
    </button>
  )
}

export function DeletePayslip({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function remove() {
    if (!confirm('Delete this payslip?')) return
    setBusy(true)
    try {
      await fetch(`/api/portal/payslips/generate?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? '...' : 'Delete'}
    </button>
  )
}

type StaffOption = { id: string; name: string; currency: string }
type Addition = {
  id: string
  staff_id: string
  kind: string
  description: string | null
  amount: number
  currency: string
}

export function AdditionsManager({ staffOptions }: { staffOptions: StaffOption[] }) {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [staffId, setStaffId] = useState(staffOptions[0]?.id || '')
  const [kind, setKind] = useState('Reimbursement')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<Addition[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const selected = staffOptions.find((s) => s.id === staffId)
  const currency = selected?.currency || ''
  const nameById = new Map(staffOptions.map((s) => [s.id, s.name]))

  async function load(forMonth: string) {
    try {
      const res = await fetch(`/api/portal/payslips/additions?period=${forMonth}`)
      const j = await res.json().catch(() => ({}))
      setItems(res.ok ? (j.items || []) : [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    load(month)
  }, [month])

  async function add() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/payslips/additions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, period: month, kind, amount: Number(amount), currency, description }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Could not add.')
        return
      }
      setAmount('')
      setDescription('')
      await load(month)
    } catch {
      setMsg('Could not add.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/portal/payslips/additions?id=${id}`, { method: 'DELETE' })
    await load(month)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900">Bonuses and reimbursements</h2>
        <p className="text-xs text-gray-500">
          For management only. Add a line, then Generate that month so it shows on the payslip.
          Factory staff stay on their weekly payout.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Person
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          >
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          >
            <option>Reimbursement</option>
            <option>Bonus</option>
            <option>Allowance</option>
            <option>Other</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Amount ({currency || 'no salary set'})
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Note
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="optional"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          />
        </label>
        <button
          type="button"
          onClick={add}
          disabled={busy || !staffId}
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Adding...' : 'Add'}
        </button>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
      </div>

      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2 text-sm"
            >
              <span className="text-gray-700">
                {nameById.get(it.staff_id) || 'Staff'} | {it.kind}{it.description ? ` (${it.description})` : ''}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-gray-500">
                  {it.currency} {Number(it.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
