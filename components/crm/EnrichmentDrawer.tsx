// components/crm/EnrichmentDrawer.tsx
// Right side drawer that shows Gemini enrichment data for a single lead.
// Reads from props (lead row already fetched in dashboard), no API call.

'use client';

import { useEffect } from 'react';

type EnrichmentLead = {
  id: string;
  full_name: string | null;
  company: string | null;
  email: string;
  country: string | null;
  business_description: string | null;
  products_offered: any;
  employee_size_band: string | null;
  icp_fit_score: number | null;
  icp_fit_reason: string | null;
  pain_hooks: any;
  product_recommendations: any;
  buying_signal_strength: string | null;
  buying_signal_summary: string | null;
  buying_signal_evidence: any;
  buying_signal_detected_at: string | null;
  buying_signal_scanned_at: string | null;
  last_enriched_at: string | null;
};

type Props = {
  lead: EnrichmentLead | null;
  open: boolean;
  onClose: () => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) return 'never';
  const t = Date.parse(value);
  if (Number.isNaN(t)) return 'never';
  const d = new Date(t);
  return d.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toArray(v: any): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  return [];
}

function toEvidenceArray(v: any): Array<{
  type?: string;
  description?: string;
  source_url?: string;
  detected_date?: string;
}> {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === 'object');
  return [];
}

function fitColours(score: number | null): { bg: string; fg: string; label: string } {
  if (score === null || score === undefined) {
    return { bg: '#f3f4f6', fg: '#6b7280', label: 'Not scored' };
  }
  if (score >= 80) return { bg: '#dcfce7', fg: '#166534', label: 'Excellent' };
  if (score >= 60) return { bg: '#dbeafe', fg: '#1e40af', label: 'Good' };
  if (score >= 40) return { bg: '#fef3c7', fg: '#854d0e', label: 'Moderate' };
  if (score >= 20) return { bg: '#fed7aa', fg: '#9a3412', label: 'Weak' };
  return { bg: '#fee2e2', fg: '#991b1b', label: 'Poor' };
}

function signalColours(strength: string | null): { bg: string; fg: string; emoji: string } {
  if (strength === 'hot') return { bg: '#fee2e2', fg: '#991b1b', emoji: '🔥' };
  if (strength === 'warm') return { bg: '#fed7aa', fg: '#9a3412', emoji: '📈' };
  if (strength === 'cold') return { bg: '#dbeafe', fg: '#1e40af', emoji: '❄️' };
  if (strength === 'none') return { bg: '#f3f4f6', fg: '#6b7280', emoji: '·' };
  return { bg: '#f3f4f6', fg: '#6b7280', emoji: '?' };
}

const chipStyle = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 999,
  background: bg,
  color: fg,
  fontSize: 12,
  fontWeight: 500,
  marginRight: 6,
  marginBottom: 6,
});

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 8,
};

const sectionBox: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 14,
  marginBottom: 14,
};

export default function EnrichmentDrawer({ lead, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !lead) return null;

  const fit = fitColours(lead.icp_fit_score);
  const sig = signalColours(lead.buying_signal_strength);
  const products = toArray(lead.products_offered);
  const painHooks = toArray(lead.pain_hooks);
  const recs = toArray(lead.product_recommendations);
  const evidence = toEvidenceArray(lead.buying_signal_evidence);

  const notEnriched = !lead.last_enriched_at;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 520,
          maxWidth: '94vw',
          background: '#ffffff',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#ffffff',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Lead insights</div>
            <div
              style={{
                fontWeight: 600,
                color: '#111827',
                fontSize: 15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={lead.company || lead.full_name || lead.email}
            >
              {lead.company || lead.full_name || lead.email}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 10px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            background: '#ffffff',
          }}
        >
          {notEnriched && (
            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: 12,
                marginBottom: 14,
                color: '#92400e',
                fontSize: 13,
              }}
            >
              This lead has not been enriched yet. The lead enrichment cron runs every 30 minutes and processes high priority leads first.
            </div>
          )}

          {/* Headline scores */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div
              style={{
                flex: 1,
                padding: 12,
                background: fit.bg,
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: fit.fg, opacity: 0.8, marginBottom: 4 }}>
                ICP FIT
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: fit.fg }}>
                {lead.icp_fit_score ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: fit.fg, marginTop: 2 }}>{fit.label}</div>
            </div>
            <div
              style={{
                flex: 1,
                padding: 12,
                background: sig.bg,
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: sig.fg, opacity: 0.8, marginBottom: 4 }}>
                BUYING SIGNAL
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: sig.fg }}>
                {sig.emoji}
              </div>
              <div style={{ fontSize: 11, color: sig.fg, marginTop: 2, textTransform: 'capitalize' }}>
                {lead.buying_signal_strength || 'Not scanned'}
              </div>
            </div>
          </div>

          {/* Business */}
          {lead.business_description && (
            <div style={sectionBox}>
              <div style={sectionTitle}>Business</div>
              <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.5 }}>
                {lead.business_description}
              </div>
              {lead.employee_size_band && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                  Size band: <strong style={{ color: '#111827', textTransform: 'capitalize' }}>{lead.employee_size_band}</strong>
                </div>
              )}
            </div>
          )}

          {/* ICP fit reason */}
          {lead.icp_fit_reason && (
            <div style={sectionBox}>
              <div style={sectionTitle}>ICP fit reasoning</div>
              <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.5 }}>
                {lead.icp_fit_reason}
              </div>
            </div>
          )}

          {/* Products they offer */}
          {products.length > 0 && (
            <div style={sectionBox}>
              <div style={sectionTitle}>What they offer</div>
              <div>
                {products.map((p, i) => (
                  <span key={i} style={chipStyle('#eef2ff', '#3730a3')}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pain hooks */}
          {painHooks.length > 0 && (
            <div style={sectionBox}>
              <div style={sectionTitle}>Pain hooks (use in outreach)</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#111827', lineHeight: 1.6 }}>
                {painHooks.map((p, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* NUMAT product recommendations */}
          {recs.length > 0 && (
            <div style={sectionBox}>
              <div style={sectionTitle}>Recommended NUMAT products</div>
              <div>
                {recs.map((p, i) => (
                  <span key={i} style={chipStyle('#dcfce7', '#166534')}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Buying signals */}
          {lead.buying_signal_summary && (
            <div style={sectionBox}>
              <div style={sectionTitle}>Buying signal details</div>
              <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.5, marginBottom: 8 }}>
                {lead.buying_signal_summary}
              </div>
              {evidence.length > 0 && (
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                  {evidence.map((e, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <div style={{ marginBottom: 2 }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {e.type && <span style={{ marginRight: 8 }}>{e.type}</span>}
                        {e.detected_date && <span style={{ marginRight: 8 }}>{e.detected_date}</span>}
                        {e.source_url && (
                          <a
                            href={e.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1d4ed8', textDecoration: 'underline' }}
                          >
                            Source
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Metadata */}
          <div style={{ marginTop: 18, fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
            <div>Last enriched: {formatTimestamp(lead.last_enriched_at)}</div>
            <div>Last signal scan: {formatTimestamp(lead.buying_signal_scanned_at)}</div>
            {lead.buying_signal_detected_at && (
              <div>Signal detected: {formatTimestamp(lead.buying_signal_detected_at)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
