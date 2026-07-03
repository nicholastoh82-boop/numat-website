// lib/gmail.ts
// Shared Gmail helpers: token refresh, raw RFC 822 builder, Gmail API send.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Supabase env vars missing: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL =
  'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export type RepTokenRow = {
  id: string;
  rep_email: string;
  rep_name: string | null;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
  is_active: boolean;
};

export async function getRepToken(repEmail: string): Promise<RepTokenRow> {
  const { data, error } = await supabaseAdmin
    .from('rep_gmail_tokens')
    .select('*')
    .eq('rep_email', repEmail)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`No active Gmail token for ${repEmail}`);
  }
  return data as RepTokenRow;
}

export async function getValidAccessToken(repEmail: string): Promise<string> {
  const row = await getRepToken(repEmail);

  const now = Date.now();
  const expiresAt = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;

  // If we still have at least 60 seconds of validity, reuse the cached one.
  if (row.access_token && expiresAt - now > 60_000) {
    return row.access_token;
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: row.refresh_token,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token refresh failed for ${repEmail}: ${txt}`);
  }

  const json: { access_token: string; expires_in: number } = await res.json();

  const newExpiresAt = new Date(now + json.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from('rep_gmail_tokens')
    .update({
      access_token: json.access_token,
      token_expires_at: newExpiresAt,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', row.id);

  return json.access_token;
}

export type SendArgs = {
  fromEmail: string;
  fromName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  inReplyToMessageId?: string; // Gmail Message-Id header value of the parent
  threadIdToReply?: string; // Gmail thread id (preferred for threading)
  referencesHeader?: string; // existing References chain
  attachments?: { filename: string; mimeType: string; contentBase64: string }[];
};

function encodeBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildRfc822(args: SendArgs): string {
  const fromHeader = args.fromName
    ? `${args.fromName} <${args.fromEmail}>`
    : args.fromEmail;

  const headers: string[] = [`From: ${fromHeader}`, `To: ${args.to}`];
  if (args.cc) headers.push(`Cc: ${args.cc}`);
  if (args.bcc) headers.push(`Bcc: ${args.bcc}`);
  headers.push(`Subject: ${args.subject}`);
  headers.push('MIME-Version: 1.0');

  if (args.inReplyToMessageId) {
    headers.push(`In-Reply-To: ${args.inReplyToMessageId}`);
    const refs = args.referencesHeader
      ? `${args.referencesHeader} ${args.inReplyToMessageId}`
      : args.inReplyToMessageId;
    headers.push(`References: ${refs}`);
  }

  // Body section (alternative / html / text) without top level headers.
  function bodyBlock(): { ctype: string; body: string } {
    if (args.bodyHtml && args.bodyText) {
      const alt = 'alt_' + Math.random().toString(36).slice(2);
      const body = [
        `--${alt}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        args.bodyText,
        '',
        `--${alt}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        args.bodyHtml,
        '',
        `--${alt}--`,
      ].join('\r\n');
      return { ctype: `multipart/alternative; boundary="${alt}"`, body };
    }
    if (args.bodyHtml) {
      return { ctype: 'text/html; charset="UTF-8"', body: args.bodyHtml };
    }
    return { ctype: 'text/plain; charset="UTF-8"', body: args.bodyText ?? '' };
  }

  const atts = args.attachments ?? [];
  const bb = bodyBlock();

  if (atts.length === 0) {
    return (
      headers.join('\r\n') +
      '\r\n' +
      `Content-Type: ${bb.ctype}` +
      '\r\n\r\n' +
      bb.body
    );
  }

  const mixed = 'mixed_' + Math.random().toString(36).slice(2);
  const parts: string[] = [];
  parts.push(`--${mixed}`);
  parts.push(`Content-Type: ${bb.ctype}`);
  parts.push('');
  parts.push(bb.body);
  for (const a of atts) {
    const safeName = String(a.filename || 'attachment').replace(/["\\\r\n]/g, '_');
    const b64 = String(a.contentBase64 || '').replace(/\s+/g, '');
    parts.push(`--${mixed}`);
    parts.push(
      `Content-Type: ${a.mimeType || 'application/octet-stream'}; name="${safeName}"`
    );
    parts.push('Content-Transfer-Encoding: base64');
    parts.push(`Content-Disposition: attachment; filename="${safeName}"`);
    parts.push('');
    parts.push(b64.replace(/(.{76})/g, '$1\r\n'));
  }
  parts.push(`--${mixed}--`);

  return (
    headers.join('\r\n') +
    '\r\n' +
    `Content-Type: multipart/mixed; boundary="${mixed}"` +
    '\r\n\r\n' +
    parts.join('\r\n')
  );
}

export async function sendGmail(args: SendArgs): Promise<{
  messageId: string;
  threadId: string;
  rawHeaders: Record<string, string>;
}> {
  const accessToken = await getValidAccessToken(args.fromEmail);
  const raw = buildRfc822(args);
  const encoded = encodeBase64Url(raw);

  const body: Record<string, unknown> = { raw: encoded };
  if (args.threadIdToReply) body.threadId = args.threadIdToReply;

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gmail send failed: ${txt}`);
  }

  const data: { id: string; threadId: string } = await res.json();

  // Fetch the sent message to extract its Message-Id header for threading
  let messageIdHeader = '';
  try {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${data.id}?format=metadata&metadataHeaders=Message-Id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (detail.ok) {
      const dj = await detail.json();
      const h = (dj.payload?.headers ?? []).find(
        (x: { name: string; value: string }) =>
          x.name.toLowerCase() === 'message-id'
      );
      if (h) messageIdHeader = h.value;
    }
  } catch {
    // non fatal
  }

  return {
    messageId: data.id,
    threadId: data.threadId,
    rawHeaders: { 'message-id': messageIdHeader },
  };
}
