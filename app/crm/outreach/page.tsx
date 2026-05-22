'use client';

// app/crm/outreach/page.tsx
//
// Admin-only review UI for the outbound email drafts pipeline.
// Lists drafts grouped by status with one click approve, reject, edit,
// and mark as sent actions.
//
// API: /api/crm/email-drafts (GET, PATCH). Both gated on admin role.

import { useState, useEffect, useCallback, useMemo } from 'react';

type Draft = {
  id: string;
  lead_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  company: string | null;
  rep_email: string;
  rep_name: string | null;
  subject: string;
  body: string;
  status: string;
  buying_signal_strength: string | null;
  generated_by: string;
  generated_at: string;
  reviewed_at: string | null;
  sent_at: string | null;
  rejection_reason: string | null;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  sent_detected_at: string | null;
  reply_detected_at: string | null;
  reply_snippet: string | null;
  reply_from_email: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pending Review',
  digest_sent: 'Sent to Rep',
  approved: 'Approved',
  rejected: 'Rejected',
  sent: 'Sent to Prospect',
  sent_by_rep: 'Sent by Rep',
  replied: 'Replied',
  skipped: 'Skipped',
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  digest_sent: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  sent: 'bg-slate-100 text-slate-700',
  sent_by_rep: 'bg-indigo-100 text-indigo-800',
  replied: 'bg-green-100 text-green-900 font-semibold',
  skipped: 'bg-slate-100 text-slate-500',
};

export default function CrmOutreachPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/email-drafts', { credentials: 'include' });
      if (res.status === 403) throw new Error('You do not have access. Sign in with your NUMAT rep or admin account.');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setDrafts(data.drafts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const updateDraft = async (
    id: string,
    patch: Partial<Pick<Draft, 'status' | 'subject' | 'body' | 'rejection_reason'>>
  ) => {
    const res = await fetch('/api/crm/email-drafts', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      // Log full response so devtools shows the real cause even if alert is generic.
      console.error('updateDraft failed', { status: res.status, body: data });
      const raw = (data as { error?: unknown }).error;
      const message =
        typeof raw === 'string'
          ? raw
          : raw
            ? JSON.stringify(raw)
            : `HTTP ${res.status}`;
      alert(`Update failed: ${message}`);
      return;
    }
    await loadDrafts();
  };

  const sendNow = async (id: string) => {
    if (
      !confirm(
        'Send this email now via Gmail API? Your saved signature from /crm/profile will be appended.'
      )
    ) {
      return;
    }
    const res = await fetch('/api/crm/email-drafts/send', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      console.error('sendNow failed', { status: res.status, body: data });
      const raw = (data as { error?: unknown }).error;
      const message =
        typeof raw === 'string'
          ? raw
          : raw
            ? JSON.stringify(raw)
            : `HTTP ${res.status}`;
      alert(`Send failed: ${message}`);
      return;
    }
    if (!(data as { signature_attached?: boolean }).signature_attached) {
      alert(
        'Sent, but no signature was attached. Set yours up at /crm/profile so future sends include it.'
      );
    }
    await loadDrafts();
  };

  const startEdit = (d: Draft) => {
    setEditing(d.id);
    setEditSubject(d.subject);
    setEditBody(d.body);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await updateDraft(editing, { subject: editSubject, body: editBody });
    setEditing(null);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return drafts;
    return drafts.filter((d) => d.status === filter);
  }, [drafts, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: drafts.length };
    for (const d of drafts) c[d.status] = (c[d.status] || 0) + 1;
    return c;
  }, [drafts]);

  const composeUrl = (d: Draft) => {
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: d.recipient_email,
      su: d.subject,
      body: d.body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-white px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Outreach Drafts</h1>
          <p className="text-sm text-slate-500">
            Review and approve cold outreach drafts generated daily for Mohan and Eugene.
          </p>
        </div>
        <a
          href="/crm/profile"
          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-sm font-medium hover:bg-slate-200 whitespace-nowrap"
        >
          My signature →
        </a>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending_review', 'digest_sent', 'approved', 'sent', 'rejected', 'skipped'].map(
          (k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === k
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {k === 'all' ? 'All' : STATUS_LABELS[k]} ({counts[k] || 0})
            </button>
          )
        )}
        <button
          onClick={loadDrafts}
          className="ml-auto px-3 py-1.5 rounded text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-slate-500">Loading drafts...</div>}

      <div className="space-y-4">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      STATUS_COLORS[d.status] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    From: {d.rep_name} ({d.rep_email})
                  </span>
                </div>
                <div className="font-semibold text-slate-900">
                  {d.company || 'Unknown'} &middot; {d.recipient_name || ''}
                </div>
                <div className="text-sm text-slate-600">{d.recipient_email}</div>
              </div>
            </div>

            {editing === d.id ? (
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-semibold"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Subject</span>
                  <div className="font-medium text-slate-900">{d.subject}</div>
                </div>
                <pre className="bg-slate-50 p-3 rounded text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed mb-3">
                  {d.body}
                </pre>
                {d.reply_detected_at && (
                  <div className="mb-3 border-l-4 border-green-500 bg-green-50 p-3 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs uppercase tracking-wide text-green-800 font-semibold">
                        Reply received
                      </div>
                      <div className="text-xs text-green-700">
                        {new Date(d.reply_detected_at).toLocaleString()}
                      </div>
                    </div>
                    {d.reply_from_email && (
                      <div className="text-xs text-slate-600 mb-1">From {d.reply_from_email}</div>
                    )}
                    <pre className="bg-white p-2 rounded text-xs text-slate-800 whitespace-pre-wrap font-sans">
                      {d.reply_snippet || '(no preview)'}
                    </pre>
                    {d.gmail_thread_id && (
                      <a
                        href={`https://mail.google.com/mail/u/0/#inbox/${d.gmail_thread_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-2 text-xs text-blue-700 hover:underline"
                      >
                        Open thread in Gmail →
                      </a>
                    )}
                  </div>
                )}
                {!d.reply_detected_at && d.sent_detected_at && (
                  <div className="mb-3 text-xs text-indigo-700">
                    Sent by rep on {new Date(d.sent_detected_at).toLocaleString()}, no reply yet
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => sendNow(d.id)}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                    title="Sends through Gmail API with your saved signature appended"
                  >
                    Send Now
                  </button>
                  <a
                    href={composeUrl(d)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700"
                  >
                    Compose in Gmail
                  </a>
                  <button
                    onClick={() => updateDraft(d.id, { status: 'sent' })}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800"
                  >
                    Mark Sent
                  </button>
                  <button
                    onClick={() => updateDraft(d.id, { status: 'approved' })}
                    className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => startEdit(d)}
                    className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded text-sm font-medium hover:bg-amber-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason (optional)?');
                      if (reason === null) return;
                      updateDraft(d.id, { status: 'rejected', rejection_reason: reason });
                    }}
                    className="px-3 py-1.5 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No drafts match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
