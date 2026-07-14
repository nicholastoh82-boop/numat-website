'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Sub = { email: string; first_name: string | null; last_name: string | null; categories: string[]; status: string }

export default function SubscribersPage() {
  const [cats, setCats] = useState<string[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string>('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/newsletter/subscribers')
    const d = await res.json()
    if (res.ok) {
      setCats(d.categories || [])
      setSubs(d.subscribers || [])
      setCounts(d.counts || {})
      setTotal(d.total || 0)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    return subs.filter((s) =>
      !t || s.email.toLowerCase().includes(t) || (s.first_name || '').toLowerCase().includes(t)
    )
  }, [subs, q])

  const toggle = async (email: string, cat: string, current: string[]) => {
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat]
    setSaving(email)
    setSubs((prev) => prev.map((s) => (s.email === email ? { ...s, categories: next } : s)))
    await fetch('/api/admin/newsletter/subscribers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, categories: next }),
    })
    setSaving('')
    load()
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Subscribers</h1>
        <Link href="/admin/newsletter" className="text-sm text-green-700 hover:underline">Back to composer</Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {loading ? 'Loading…' : `${total} active subscriber${total === 1 ? '' : 's'}. Tap a category to add or remove it for a contact.`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <span key={c} className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800">
            {c}: {counts[c] || 0}
          </span>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email"
        className="mt-4 w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 font-medium">Categories</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.email} className="border-b border-gray-100 align-top">
                <td className="py-3 pr-4 whitespace-nowrap">{s.first_name || '—'}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-gray-700">
                  {s.email}
                  {s.status !== 'subscribed' && <span className="ml-2 text-xs text-red-500">(unsubscribed)</span>}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {cats.map((c) => {
                      const on = (s.categories || []).includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={saving === s.email || s.status !== 'subscribed'}
                          onClick={() => toggle(s.email, c, s.categories || [])}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            on ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          } disabled:opacity-50`}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-gray-400">No subscribers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
