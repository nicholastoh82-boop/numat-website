'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Task = {
  id: string
  title: string
  description: string | null
  assigned_to_email: string
  assigned_to_name: string | null
  assigned_by_email: string
  assigned_by_name: string | null
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high'
  due_date: string | null
  created_at: string
  completed_at: string | null
}

type Rep = { email: string; name: string }

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

function statusClasses(s: string): string {
  switch (s) {
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'done':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-500'
    default:
      return 'bg-amber-100 text-amber-800'
  }
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function RepTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [repFilter, setRepFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')

  // New task form (managers only)
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetch('/api/portal/rep-tasks')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load')
      setTasks(data.tasks || [])
      setReps(data.reps || [])
      setIsManager(!!data.isManager)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createTask() {
    if (!title.trim() || !assignee) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/portal/rep-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          assigned_to_email: assignee,
          due_date: due || null,
          priority,
          description,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not create task')
      setTitle('')
      setAssignee('')
      setDue('')
      setPriority('normal')
      setDescription('')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create task')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/portal/rep-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || 'Update failed')
      }
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function reassign(id: string, assigned_to_email: string) {
    try {
      const res = await fetch('/api/portal/rep-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, assigned_to_email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || 'Reassign failed')
      }
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reassign failed')
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/portal/rep-tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error || 'Delete failed')
      }
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (repFilter !== 'all' && t.assigned_to_email !== repFilter) return false
      if (statusFilter === 'active' && (t.status === 'done' || t.status === 'cancelled')) return false
      if (statusFilter !== 'active' && statusFilter !== 'all' && t.status !== statusFilter) return false
      return true
    })
  }, [tasks, repFilter, statusFilter])

  const openCount = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {isManager ? 'Team tasks' : 'My tasks'}
        </h1>
        <span className="text-sm text-gray-500">{openCount} open</span>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {isManager
          ? 'Assign tasks to your reps and track them through to done. Erica, Nick, and Mark can see everything here.'
          : 'Tasks assigned to you. Move each one along as you work it.'}
      </p>

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      {isManager && (
        <div className="mt-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">New task</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing"
              className="border border-gray-300 rounded px-3 py-2 text-sm md:col-span-2"
            />
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Assign to...</option>
              {reps.map((r) => (
                <option key={r.email} value={r.email}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="low">Low priority</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
            </select>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details (optional)"
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={createTask}
            disabled={saving || !title.trim() || !assignee}
            className="mt-3 px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Assigning...' : 'Assign task'}
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {isManager && (
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All reps</option>
            {reps.map((r) => (
              <option key={r.email} value={r.email}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="active">Active</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="mt-3 rounded border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No tasks here.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {isManager && <th className="text-left font-medium px-3 py-2">Rep</th>}
                <th className="text-left font-medium px-3 py-2">Task</th>
                <th className="text-left font-medium px-3 py-2">Due</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-right font-medium px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const overdue =
                  t.due_date && t.status !== 'done' && t.status !== 'cancelled' && t.due_date < todayStr()
                return (
                  <tr key={t.id} className="border-t border-gray-100 align-top">
                    {isManager && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <select
                          value={t.assigned_to_email}
                          onChange={(e) => reassign(t.id, e.target.value)}
                          className="text-gray-700 text-xs border border-transparent hover:border-gray-200 rounded px-1 py-0.5 bg-transparent cursor-pointer"
                          title="Reassign this task"
                        >
                          {reps.some((r) => r.email === t.assigned_to_email) ? null : (
                            <option value={t.assigned_to_email}>{t.assigned_to_name}</option>
                          )}
                          {reps.map((r) => (
                            <option key={r.email} value={r.email}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {t.priority === 'high' && (
                          <span className="text-xs font-semibold text-red-600">High</span>
                        )}
                        <span className="text-gray-900">{t.title}</span>
                      </div>
                      {t.description && <div className="text-gray-500 mt-0.5">{t.description}</div>}
                      {isManager && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          by {t.assigned_by_name || t.assigned_by_email.split('@')[0]}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 py-2 whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {t.due_date || '\u2014'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusClasses(t.status)}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {t.status !== 'done' && t.status !== 'cancelled' && (
                        <>
                          {t.status === 'open' && (
                            <button
                              onClick={() => setStatus(t.id, 'in_progress')}
                              className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => setStatus(t.id, 'done')}
                            className="ml-1 text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800"
                          >
                            Done
                          </button>
                        </>
                      )}
                      {isManager && (
                        <>
                          {(t.status === 'done' || t.status === 'cancelled') && (
                            <button
                              onClick={() => setStatus(t.id, 'open')}
                              className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100"
                            >
                              Reopen
                            </button>
                          )}
                          <button
                            onClick={() => remove(t.id)}
                            className="ml-1 text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
