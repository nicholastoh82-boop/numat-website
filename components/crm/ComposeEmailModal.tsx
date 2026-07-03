// components/crm/ComposeEmailModal.tsx
// Drop in modal for composing and sending email from the CRM.
// Wire it from any lead row: <ComposeEmailModal lead={...} repEmail={...} onClose={...} />

'use client';

import { useState } from 'react';

type Lead = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  company?: string | null;
};

type Props = {
  lead: Lead;
  repEmail: string; // pull from your CRM auth/session
  open: boolean;
  onClose: () => void;
  // Optional reply context if composing a reply
  replyTo?: {
    message_id: string; // RFC Message-Id header
    thread_id: string;
    references?: string;
    subject: string;
  };
  onSent?: () => void;
};

export default function ComposeEmailModal({
  lead,
  repEmail,
  open,
  onClose,
  replyTo,
  onSent,
}: Props) {
  const [to, setTo] = useState(lead.email ?? '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(
    replyTo ? (replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`) : ''
  );
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ filename: string; mimeType: string; contentBase64: string; size: number }[]>([]);

  if (!open) return null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    const readOne = (file: File) =>
      new Promise<{ filename: string; mimeType: string; contentBase64: string; size: number }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve({ filename: file.name, mimeType: file.type || 'application/octet-stream', contentBase64: base64, size: file.size });
        };
        reader.onerror = () => reject(new Error('Could not read ' + file.name));
        reader.readAsDataURL(file);
      });
    try {
      const read = await Promise.all(Array.from(files).map(readOne));
      setAttachments((prev) => {
        const next = [...prev, ...read];
        const total = next.reduce((sum, a) => sum + a.size, 0);
        if (total > 3 * 1024 * 1024) {
          setErrorMsg('Attachments are too big. Keep the total under 3 MB.');
          return prev;
        }
        return next;
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not read file');
    }
  }

  async function handleSend() {
    setSending(true);
    setErrorMsg(null);

    const bodyHtml = bodyText
      .split('\n')
      .map((line) => (line.trim() === '' ? '<p>&nbsp;</p>' : `<p>${escapeHtml(line)}</p>`))
      .join('');

    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rep_email: repEmail,
          lead_id: lead.id,
          to,
          cc: cc || undefined,
          subject,
          body_text: bodyText,
          body_html: bodyHtml,
          reply_to_message_id: replyTo?.message_id,
          thread_id_to_reply: replyTo?.thread_id,
          references_header: replyTo?.references,
          attachments: attachments.length > 0 ? attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType, contentBase64: a.contentBase64 })) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'Send failed');
        setSending(false);
        return;
      }
      setSending(false);
      if (onSent) onSent();
      onClose();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Network error');
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: 'min(640px, 92vw)',
          maxHeight: '90vh',
          borderRadius: 8,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>
            {replyTo ? 'Reply' : 'New Email'} as {repEmail}
          </strong>
          <button onClick={onClose} disabled={sending}>
            Close
          </button>
        </div>

        <label style={{ fontSize: 12, color: '#555' }}>To</label>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontSize: 12, color: '#555' }}>Cc</label>
        <input
          value={cc}
          onChange={(e) => setCc(e.target.value)}
          placeholder="optional"
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontSize: 12, color: '#555' }}>Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontSize: 12, color: '#555' }}>Message</label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={12}
          style={{
            padding: 8,
            border: '1px solid #ccc',
            borderRadius: 4,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />

        <label style={{ fontSize: 12, color: '#555' }}>Attachments</label>
        <div>
          <input
            type="file"
            multiple
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            disabled={sending}
            style={{ fontSize: 13 }}
          />
        </div>
        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {attachments.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, background: '#f3f4f6', borderRadius: 4, padding: '4px 8px' }}>
                <span>{a.filename} ({Math.ceil(a.size / 1024)} KB)</span>
                <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} disabled={sending} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#b00020' }}>remove</button>
              </div>
            ))}
          </div>
        )}

        {errorMsg && (
          <div style={{ color: '#b00020', fontSize: 13 }}>{errorMsg}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !to || !subject || !bodyText}
            style={{
              background: '#1a7f37',
              color: '#fff',
              padding: '8px 16px',
              border: 0,
              borderRadius: 4,
              cursor: sending ? 'wait' : 'pointer',
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
