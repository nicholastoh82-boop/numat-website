/*
  app/portal/(authed)/access/_components/AccessClient.tsx
  Table of people by function. Tick a box to give access, untick to remove it.
  Admins show as full access and cannot be changed here.
*/

'use client'

import { useEffect, useState } from 'react'

type Feature = { key: string; label: string }
type U = { id: string; name: string; email: string; isAdmin: boolean; features: string[] }

export default function AccessClient() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [users, setUsers] = useState<U[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/portal/access')
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Could not load access.')
        } else {
          setFeatures(data.features || [])
          setUsers(data.users || [])
        }
      } catch {
        setError('Could not load access.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function toggle(u: U, key: string) {
    if (u.isAdmin) return
    const had = u.features.includes(key)
    const allowed = !had
    const sk = `${u.id}:${key}`
    setSavingKey(sk)
    setUsers((prev) =>
      prev.map((x) =>
        x.id === u.id
          ? { ...x, features: allowed ? [...x.features, key] : x.features.filter((f) => f !== key) }
          : x,
      ),
    )
    try {
      const res = await fetch('/api/portal/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, feature: key, allowed }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      // revert on failure
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? { ...x, features: had ? [...x.features, key] : x.features.filter((f) => f !== key) }
            : x,
        ),
      )
      setError('Save failed. Please try again.')
    } finally {
      setSavingKey('')
    }
  }

  if (loading) return <div className="text-sm text-gray-500 py-10">Loading access...</div>

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Access</h1>
      <p className="text-sm text-gray-600 mt-1">
        Tick what each person can see. Admins have full access. Home and login are always on.
      </p>
      {error ? (
        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      ) : null}

      {users.length === 0 ? (
        <p className="text-sm text-gray-500 mt-6">No numat.ph people have signed in yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left font-medium text-gray-600 px-3 py-2 sticky left-0 bg-gray-50 z-10">
                  Person
                </th>
                {features.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-gray-600 font-medium whitespace-nowrap text-center">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="text-gray-900 whitespace-nowrap">
                      {u.name}
                      {u.isAdmin ? ' (admin)' : ''}
                    </div>
                    <div className="text-[11px] text-gray-500 whitespace-nowrap">{u.email}</div>
                  </td>
                  {features.map((f) => (
                    <td key={f.key} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={u.isAdmin || savingKey === `${u.id}:${f.key}`}
                        checked={u.isAdmin || u.features.includes(f.key)}
                        onChange={() => toggle(u, f.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
