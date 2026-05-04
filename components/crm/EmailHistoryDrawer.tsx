// components/crm/EmailHistoryDrawer.tsx
// Right side drawer that shows the email history for a single lead.
// Fetches /api/crm/lead_emails?lead_id={leadId} when opened.

'use client';

import { useEffect, useState } from 'react';

type EmailRow = {
  id: string;
  direction: string | null;
  source: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  to_email: string | null;
  from_email: string | null;
  cc: string | null;
  rep_email: string | null;
  gmail_thread_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string | null;
};

type Props = {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) return '';
  const t = Date.parse(value);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function pickTimestamp(row: EmailRow): string | null {
  return row.sent_at ?? row.received_at ?? row.created_at ?? null;
}

function directionStyle(direction: string | null): {
  label: string;
  bg: string;
  fg: string;
} {
  if (direction === 'sent') {
    return { label: 'Sent', bg: '#dcfce7', fg: '#166534' };
  }
  if (direction === 'received') {
    return { label: 'Received', bg: '#dbeafe', fg: '#1e40af' };
  }
  return {
    label: direction ? direction : 'Unknown',
    bg: '#f3f4f6',
    fg: '#374151',
  };
}

function sourceLabel(source: string | null): string {
  if (!source) return '';
  if (source === 'crm') return 'CRM';
  if (source === 'external') return 'External';
  if (source === 'sequence') return 'Sequence';
  if (source === 'reply_handler') return 'Reply Handler';
  return source;
}

export default function EmailHistoryDrawer({
  leadId,
  leadName,
  open,
  onClose,
}: Props) {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !leadId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setEmails([]);

    fetch(
      `/api/crm/lead_emails?lead_id=${encodeURIComponent(leadId)}`,
      { cache: 'no-store' }
    )
      .then(async (res) => {
        const json = (await res.json()) as {
          ok: boolean;
          emails?: EmailRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.error ?? `Status ${res.status}`);
          return;
        }
        setEmails(json.emails ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Network error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  if (!open) return null;

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
          width: 480,
          maxWidth: '92vw',
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
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Email history</div>
            <div
              style={{
                fontWeight: 600,
                color: '#111827',
                fontSize: 15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={leadName}
            >
              {leadName || 'Lead'}
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
          {loading && (
            <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>
          )}

          {error && !loading && (
            <div style={{ color: '#b91c1c', fontSize: 14 }}>
              Could not load history: {error}
            </div>
          )}

          {!loading && !error && emails.length === 0 && (
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              No email history for this lead yet.
            </div>
          )}

          {!loading &&
            !error &&
            emails.map((row) => {
              const dirStyle = directionStyle(row.direction);
              const ts = formatTimestamp(pickTimestamp(row));
              const counterparty =
                row.direction === 'sent' ? row.to_email : row.from_email;
              const preview = row.snippet || row.body_text || '';
              return (
                <div
                  key={row.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                    background: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: dirStyle.bg,
                        color: dirStyle.fg,
                      }}
                    >
                      {dirStyle.label}
                    </span>
                    {row.source && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {sourceLabel(row.source)}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6b7280',
                        marginLeft: 'auto',
                      }}
                    >
                      {ts}
                    </span>
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: '#111827',
                      marginBottom: 4,
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.subject || '(no subject)'}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: '#4b5563',
                      marginBottom: 6,
                    }}
                  >
                    {row.direction === 'sent' ? 'To ' : 'From '}
                    <span style={{ color: '#111827' }}>
                      {counterparty || 'unknown'}
                    </span>
                    {row.rep_email && (
                      <>
                        {' '}
                        &middot; rep{' '}
                        <span style={{ color: '#111827' }}>
                          {row.rep_email}
                        </span>
                      </>
                    )}
                  </div>

                  {preview && (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#374151',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {preview.slice(0, 200)}
                      {preview.length > 200 ? '...' : ''}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
