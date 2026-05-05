'use client'

import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  leadId: string | null
  leadName: string
  isAdmin: boolean
  onClose: () => void
  onDeleted: () => void
}

interface LeadData {
  id: string
  full_name: string | null
  company: string | null
  email: string | null
  phone: string | null
  title: string | null
  country: string | null
  segment: string | null
  sub_segment: string | null
  source: string | null
  rep_assigned: string | null
  created_at: string | null
  source_payload: any
}

export default function QualificationFormDrawer({ open, leadId, leadName, isAdmin, onClose, onDeleted }: Props) {
  const [lead, setLead] = useState<LeadData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!open || !leadId) return
    setLoading(true)
    setError(null)
    setLead(null)
    setConfirmText('')
    setShowConfirm(false)

    fetch(`/api/crm/lead_form/${leadId}`)
      .then(r => r.json().then(j => ({ ok: r.ok, json: j })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || 'Failed to load lead')
        setLead(json)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, leadId])

  const handleDelete = async () => {
    if (!leadId || confirmText !== 'DELETE') return
    setDeleting(true)
    try {
      const resp = await fetch(`/api/crm/lead_form/${leadId}`, { method: 'DELETE' })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || 'Delete failed')
      onDeleted()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setDeleting(false)
    }
  }

  if (!open) return null

  const sp = lead?.source_payload || {}
  const arr = (v: any) => Array.isArray(v) ? v.join(', ') : (v || '—')
  const txt = (v: any) => v && String(v).trim() ? String(v) : '—'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 50, transition: 'opacity 0.2s'
        }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
          background: '#fff', zIndex: 51, overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#047857' }}>FORM SUBMISSION</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginTop: 4 }}>{leadName}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 24, color: '#666',
              cursor: 'pointer', padding: 4, lineHeight: 1
            }}
          >×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {loading && <div style={{ color: '#666', fontSize: 14 }}>Loading...</div>}
          {error && (
            <div style={{
              padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 16
            }}>{error}</div>
          )}

          {lead && (
            <>
              <Section title="Contact">
                <Row label="Name" value={txt(lead.full_name)} />
                <Row label="Title" value={txt(lead.title)} />
                <Row label="Company" value={txt(lead.company)} />
                <Row label="Email" value={txt(lead.email)} />
                <Row label="Phone" value={txt(lead.phone)} />
                <Row label="Preferred contact" value={txt(sp.preferred_contact_method)} />
                <Row label="Country" value={txt(lead.country)} />
              </Section>

              <Section title="Project">
                <Row label="Project name" value={txt(sp.project_name)} />
                <Row label="Project types" value={arr(sp.project_types)} />
                <Row label="Project stages" value={arr(sp.project_stages)} />
                <Row label="Support needed" value={arr(sp.support_types)} />
                <Row label="Description" value={txt(sp.project_description)} multiline />
              </Section>

              <Section title="Qualification">
                <Row label="Timeline" value={txt(sp.timeline)} />
                <Row label="Budget range" value={txt(sp.budget_range)} />
                <Row label="Sustainability priority" value={txt(sp.sustainability_importance)} />
                <Row label="Site constraints" value={txt(sp.site_constraints)} multiline />
                <Row label="Decision makers" value={txt(sp.decision_makers)} multiline />
                <Row label="Wants consultation" value={txt(sp.follow_up_consultation)} />
              </Section>

              <Section title="System">
                <Row label="Lead ID" value={lead.id} mono />
                <Row label="Source" value={txt(lead.source)} />
                <Row label="Assigned rep" value={txt(lead.rep_assigned)} />
                <Row label="Submitted" value={lead.created_at ? new Date(lead.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Manila' }) : '—'} />
                <Row label="Form version" value={txt(sp.form_version)} />
              </Section>

              {isAdmin && (
                <div style={{
                  marginTop: 24, padding: 16, background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: 8
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>
                    Delete this lead
                  </div>
                  <div style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 12, lineHeight: 1.5 }}>
                    This permanently removes the lead from master_leads and any matching task. Cannot be undone.
                  </div>
                  {!showConfirm ? (
                    <button
                      onClick={() => setShowConfirm(true)}
                      style={{
                        padding: '8px 16px', background: '#fff', border: '1px solid #dc2626',
                        color: '#dc2626', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >Delete lead</button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 8 }}>
                        Type <strong>DELETE</strong> to confirm:
                      </div>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%', padding: '8px 10px', fontSize: 14,
                          border: '1px solid #dc2626', borderRadius: 6, marginBottom: 10
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setShowConfirm(false); setConfirmText('') }}
                          disabled={deleting}
                          style={{
                            padding: '8px 14px', background: '#fff', border: '1px solid #d1d5db',
                            color: '#374151', borderRadius: 6, fontSize: 13, cursor: 'pointer'
                          }}
                        >Cancel</button>
                        <button
                          onClick={handleDelete}
                          disabled={confirmText !== 'DELETE' || deleting}
                          style={{
                            padding: '8px 14px',
                            background: confirmText === 'DELETE' && !deleting ? '#dc2626' : '#fca5a5',
                            border: 'none', color: '#fff', borderRadius: 6, fontSize: 13,
                            cursor: confirmText === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                            fontWeight: 500
                          }}
                        >{deleting ? 'Deleting...' : 'Confirm delete'}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#6b7280',
        textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6,
        borderBottom: '1px solid #f3f4f6'
      }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, multiline, mono }: { label: string; value: string; multiline?: boolean; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 10, display: multiline ? 'block' : 'flex', gap: 12 }}>
      <div style={{
        fontSize: 12, color: '#6b7280', fontWeight: 500,
        minWidth: multiline ? 'auto' : 140, marginBottom: multiline ? 4 : 0
      }}>{label}</div>
      <div style={{
        fontSize: 13, color: '#111', flex: 1,
        whiteSpace: multiline ? 'pre-wrap' : 'normal',
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
        wordBreak: 'break-word'
      }}>{value}</div>
    </div>
  )
}
