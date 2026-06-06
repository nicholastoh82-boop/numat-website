// components/crm/LeadTimelineDrawer.tsx
//
// Right side drawer for a single lead showing two views toggled by a selector:
//   1. Pipeline: a Gantt style timeline of stages with days spent in each
//   2. Samples: the sample lifecycle (requested, in production, sent, received)
//      with an entry form so everything is tracked in the portal.
//
// Fetches and writes via /api/crm/lead_timeline.

'use client';

import { useEffect, useState, useCallback } from 'react';

type StageRow = { id: string; stage: string; entered_at: string; source: string };
type SampleRow = {
  id: string;
  lead_id: string | null;
  request_no: string | null;
  requestor: string | null;
  customer_name: string | null;
  recipient_name: string | null;
  recipient_contact: string | null;
  delivery_address: string | null;
  product_type: string | null;
  requested_at: string | null;
  target_delivery_at: string | null;
  production_received_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  courier: string | null;
  waybill: string | null;
  status: string | null;
  special_instructions: string | null;
  notes: string | null;
};

type Props = {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal_sent: 'Proposal Sent', meeting_booked: 'Meeting Booked',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};
const STAGE_COLORS: Record<string, string> = {
  new: '#94a3b8', contacted: '#60a5fa', qualified: '#818cf8',
  proposal_sent: '#a78bfa', meeting_booked: '#22d3ee',
  negotiation: '#fbbf24', won: '#34d399', lost: '#f87171',
};

function fmtDate(v: string | null): string {
  if (!v) return '';
  const t = Date.parse(v);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a: string, b: string): number {
  const da = Date.parse(a), db = Date.parse(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return 0;
  return Math.max(0, Math.round((db - da) / 86400000));
}

export default function LeadTimelineDrawer({ leadId, leadName, open, onClose }: Props) {
  const [view, setView] = useState<'pipeline' | 'samples'>('pipeline');
  const [stages, setStages] = useState<StageRow[]>([]);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/crm/lead_timeline?lead_id=${encodeURIComponent(leadId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'failed to load');
      setStages(json.stages || []);
      setSamples(json.samples || []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  if (!open) return null;

  // Build Gantt rows: each stage spans from its entry to the next stage entry (or today).
  const now = new Date().toISOString();
  const ganttRows = stages.map((s, i) => {
    const end = i < stages.length - 1 ? stages[i + 1].entered_at : now;
    const isOpen = i === stages.length - 1 && !['won', 'lost'].includes(s.stage);
    return {
      stage: s.stage, start: s.entered_at, end,
      days: daysBetween(s.entered_at, end), source: s.source, isOpen,
    };
  });
  const totalDays = ganttRows.reduce((a, r) => a + r.days, 0) || 1;
  const totalCycle = stages.length > 0 ? daysBetween(stages[0].entered_at, ganttRows[ganttRows.length - 1].end) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(560px, 100%)',
        background: '#fff', boxShadow: '-8px 0 24px rgba(0,0,0,0.15)', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Lead timeline</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{leadName}</div>
          </div>
          <button onClick={onClose} style={{ fontSize: 22, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
          {(['pipeline', 'samples'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid ' + (view === v ? '#111827' : '#e5e7eb'),
              background: view === v ? '#111827' : '#fff', color: view === v ? '#fff' : '#374151',
            }}>
              {v === 'pipeline' ? 'Pipeline timeline' : 'Samples'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading && <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>}
          {err && <div style={{ color: '#b91c1c', fontSize: 14 }}>{err}</div>}

          {/* PIPELINE GANTT */}
          {!loading && view === 'pipeline' && (
            <>
              {stages.length === 0 && <div style={{ color: '#6b7280', fontSize: 14 }}>No stage history yet.</div>}
              {stages.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
                    Total cycle: <strong>{totalCycle} days</strong> across {stages.length} stage{stages.length > 1 ? 's' : ''}.
                    {stages.some(s => s.source === 'reconstructed') && (
                      <span style={{ color: '#9ca3af' }}> Some stages reconstructed from past activity dates.</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ganttRows.map((r, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, color: '#111827' }}>
                            {STAGE_LABELS[r.stage] || r.stage}
                            {r.source === 'reconstructed' && <span style={{ color: '#9ca3af', fontWeight: 400 }}> (est.)</span>}
                          </span>
                          <span style={{ color: '#6b7280' }}>
                            {fmtDate(r.start)}{r.isOpen ? ' to now' : ''} · {r.days}d{r.isOpen ? ' (open)' : ''}
                          </span>
                        </div>
                        <div style={{ background: '#f1f5f9', borderRadius: 6, height: 18, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.max(2, (r.days / totalDays) * 100)}%`,
                            height: '100%', background: STAGE_COLORS[r.stage] || '#94a3b8',
                            borderRadius: 6, opacity: r.isOpen ? 0.6 : 1,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* SAMPLES */}
          {!loading && view === 'samples' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#374151' }}>{samples.length} sample request{samples.length === 1 ? '' : 's'}</div>
                <button onClick={() => setShowForm(true)} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: '#111827', color: '#fff', border: 'none', cursor: 'pointer',
                }}>+ New sample</button>
              </div>

              {samples.length === 0 && !showForm && (
                <div style={{ color: '#6b7280', fontSize: 14 }}>No samples logged for this lead yet.</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {samples.map(s => <SampleCard key={s.id} sample={s} onSaved={load} />)}
              </div>

              {showForm && (
                <SampleForm leadId={leadId} defaultCustomer={leadName}
                  onCancel={() => setShowForm(false)}
                  onSaved={() => { setShowForm(false); load(); }} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sample lifecycle as a horizontal milestone strip + editable dates
function SampleCard({ sample, onSaved }: { sample: SampleRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const milestones: { label: string; date: string | null; key: string }[] = [
    { label: 'Requested', date: sample.requested_at, key: 'requested_at' },
    { label: 'In production', date: sample.production_received_at, key: 'production_received_at' },
    { label: 'Sent', date: sample.sent_at, key: 'sent_at' },
    { label: 'Received', date: sample.received_at, key: 'received_at' },
  ];
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{sample.request_no || 'Sample'}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{sample.product_type || 'No product detail'}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#374151' }}>
          {sample.status || 'requested'}
        </span>
      </div>

      {/* Milestone strip */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 6px' }}>
        {milestones.map((m, i) => (
          <div key={m.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: 14, height: 14, borderRadius: 999, margin: '0 auto',
              background: m.date ? '#34d399' : '#e5e7eb',
              border: '2px solid ' + (m.date ? '#059669' : '#cbd5e1'),
            }} />
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{m.label}</div>
            <div style={{ fontSize: 10, color: '#111827', fontWeight: 600 }}>{fmtDate(m.date) || '-'}</div>
            {i < milestones.length - 1 && (
              <div style={{ position: 'absolute', top: 6, left: '50%', width: '100%', height: 2, background: m.date ? '#a7f3d0' : '#eef2f7', zIndex: -1 }} />
            )}
          </div>
        ))}
      </div>

      {sample.courier && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Courier: {sample.courier}{sample.waybill ? ` · Waybill ${sample.waybill}` : ''}</div>}

      <button onClick={() => setEditing(!editing)} style={{
        marginTop: 10, fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>{editing ? 'Close' : 'Update dates / dispatch'}</button>

      {editing && <SampleForm existing={sample} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onSaved(); }} />}
    </div>
  );
}

function SampleForm({ leadId, defaultCustomer, existing, onCancel, onSaved }: {
  leadId?: string; defaultCustomer?: string; existing?: SampleRow; onCancel: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    request_no: existing?.request_no || '',
    customer_name: existing?.customer_name || defaultCustomer || '',
    product_type: existing?.product_type || '',
    requested_at: existing?.requested_at || '',
    target_delivery_at: existing?.target_delivery_at || '',
    production_received_at: existing?.production_received_at || '',
    sent_at: existing?.sent_at || '',
    received_at: existing?.received_at || '',
    courier: existing?.courier || '',
    waybill: existing?.waybill || '',
    status: existing?.status || 'requested',
    special_instructions: existing?.special_instructions || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true); setError(null);
    try {
      const method = existing ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = { ...f };
      if (existing) body.id = existing.id; else body.lead_id = leadId;
      const res = await fetch('/api/crm/lead_timeline', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'save failed');
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof f, type = 'text') => (
    <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 8 }}>
      {label}
      <input type={type} value={f[key]} onChange={e => set(key, e.target.value)} style={{
        width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #d1d5db',
        borderRadius: 6, fontSize: 13,
      }} />
    </label>
  );

  return (
    <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
      {!existing && field('Request number', 'request_no')}
      {!existing && field('Customer', 'customer_name')}
      {!existing && field('Product detail', 'product_type')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Requested', 'requested_at', 'date')}
        {field('Target delivery', 'target_delivery_at', 'date')}
        {field('In production', 'production_received_at', 'date')}
        {field('Sent', 'sent_at', 'date')}
        {field('Received', 'received_at', 'date')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Courier', 'courier')}
        {field('Waybill', 'waybill')}
      </div>
      <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 8 }}>
        Status
        <select value={f.status} onChange={e => set('status', e.target.value)} style={{
          width: '100%', marginTop: 3, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13,
        }}>
          <option value="requested">Requested</option>
          <option value="in_production">In production</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#111827', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#fff', color: '#374151', border: '1px solid #d1d5db', cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
}
