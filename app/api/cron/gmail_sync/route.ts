// app/api/cron/gmail_sync/route.ts
//
// Vercel Cron: every 10 minutes.
// For each connected rep, pulls their recent SENT and INBOX messages from Gmail,
// matches the counterparty email against master_leads, and logs each into
// crm_emails (source: external). Duplicates are prevented by the unique
// constraint on crm_emails.gmail_message_id.
//
// Auth: Authorization: Bearer ${CRON_SECRET}, OR x-vercel-cron-signature header
// (Vercel injects this on production cron invocations).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getValidAccessToken } from '@/lib/gmail';

const MAX_PER_LABEL = 100;
const SINCE_BACKSTOP_MS = 10 * 60 * 1000;
const FALLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

const REP_NAME_MAP: Record<string, string> = {
  'nick@numat.ph': 'Nicholas Toh',
  'bryan@numat.ph': 'Bryan Suarin',
  'erica@numat.ph': 'Erica',
  'mohan@numat.ph': 'Mohan Louis',
};

type RepRow = {
  id: string;
  rep_email: string;
  is_active: boolean;
  last_sync_at: string | null;
};

type GmailHeader = { name: string; value: string };

type GmailMessageMetadata = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
};

type RepResult = {
  rep_email: string;
  sent_logged: number;
  received_logged: number;
  errors: string[];
};

function authorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron-signature')) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return '';
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

// Extracts the bare email address from a header like "Nick Toh <nick@numat.ph>"
// or just "nick@numat.ph". Returns lowercase. If the value contains multiple
// addresses separated by commas, returns the first one.
function extractEmail(rawHeaderValue: string): string {
  if (!rawHeaderValue) return '';
  const first = rawHeaderValue.split(',')[0].trim();
  const angle = first.match(/<([^>]+)>/);
  const candidate = angle ? angle[1] : first;
  return candidate.trim().toLowerCase();
}

function isInternalEmail(email: string): boolean {
  return email.endsWith('@numat.ph');
}

async function listMessageIds(
  accessToken: string,
  labelId: 'SENT' | 'INBOX',
  afterEpochSeconds: number
): Promise<string[]> {
  const q = `after:${afterEpochSeconds}`;
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
    `?q=${encodeURIComponent(q)}&labelIds=${labelId}&maxResults=${MAX_PER_LABEL}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(
      `gmail list ${labelId} failed: ${res.status} ${await res.text()}`
    );
  }
  const json = (await res.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  return (json.messages ?? []).map((m) => m.id);
}

async function fetchMessageMetadata(
  accessToken: string,
  messageId: string
): Promise<GmailMessageMetadata | null> {
  const headers = [
    'From',
    'To',
    'Cc',
    'Subject',
    'Message-Id',
    'In-Reply-To',
    'References',
    'Date',
  ];
  const qs = headers.map((h) => `metadataHeaders=${h}`).join('&');
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}` +
    `?format=metadata&${qs}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as GmailMessageMetadata;
}

async function findLeadIdByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  const { data, error } = await supabaseAdmin
    .from('master_leads')
    .select('id, updated_at')
    .ilike('email', email)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].id as string;
}

function parseDateHeader(value: string): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

async function processRep(rep: RepRow): Promise<RepResult> {
  const result: RepResult = {
    rep_email: rep.rep_email,
    sent_logged: 0,
    received_logged: 0,
    errors: [],
  };

  const accessToken = await getValidAccessToken(rep.rep_email);

  const now = Date.now();
  const sinceMs = rep.last_sync_at
    ? new Date(rep.last_sync_at).getTime() - SINCE_BACKSTOP_MS
    : now - FALLBACK_WINDOW_MS;
  const afterEpochSeconds = Math.floor(sinceMs / 1000);

  const [sentIds, inboxIds] = await Promise.all([
    listMessageIds(accessToken, 'SENT', afterEpochSeconds),
    listMessageIds(accessToken, 'INBOX', afterEpochSeconds),
  ]);

  const repFromName = REP_NAME_MAP[rep.rep_email.toLowerCase()] ?? null;

  // Process SENT
  const sentMessages = await Promise.all(
    sentIds.map((id) => fetchMessageMetadata(accessToken, id))
  );
  for (const msg of sentMessages) {
    if (!msg) continue;
    try {
      const headers = msg.payload?.headers;
      const toHeader = headerValue(headers, 'To');
      const ccHeader = headerValue(headers, 'Cc');
      const subject = headerValue(headers, 'Subject');
      const messageIdHeader = headerValue(headers, 'Message-Id');
      const inReplyTo = headerValue(headers, 'In-Reply-To');
      const references = headerValue(headers, 'References');
      const dateHeader = headerValue(headers, 'Date');

      const counterparty = extractEmail(toHeader);
      const leadId = await findLeadIdByEmail(counterparty);

      if (!leadId && isInternalEmail(counterparty)) continue;

      const sentAt =
        parseDateHeader(dateHeader) ??
        (msg.internalDate
          ? new Date(parseInt(msg.internalDate, 10)).toISOString()
          : new Date().toISOString());

      const { error: upsertError } = await supabaseAdmin
        .from('crm_emails')
        .upsert(
          {
            lead_id: leadId,
            rep_email: rep.rep_email,
            direction: 'sent',
            source: 'external',
            subject: subject || null,
            body_text: msg.snippet ?? null,
            gmail_message_id: msg.id,
            gmail_thread_id: msg.threadId,
            to_email: counterparty || null,
            from_email: rep.rep_email,
            cc: ccHeader || null,
            in_reply_to: inReplyTo || null,
            message_references: references || null,
            sent_at: sentAt,
            matched_via: leadId ? 'email_exact' : null,
            raw_headers: messageIdHeader
              ? { 'message-id': messageIdHeader }
              : null,
          },
          { onConflict: 'gmail_message_id', ignoreDuplicates: true }
        );

      if (upsertError) {
        result.errors.push(`sent ${msg.id}: ${upsertError.message}`);
        continue;
      }
      result.sent_logged += 1;

      if (leadId) {
        await supabaseAdmin
          .from('master_leads')
          .update({
            last_rep_touch_at: sentAt,
            last_rep_touch_by: rep.rep_email,
            last_rep_touch_subject: subject || null,
            last_activity_at: sentAt,
            last_activity_type: 'external_email_sent',
          })
          .eq('id', leadId);
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      result.errors.push(`sent ${msg.id}: ${m}`);
    }
  }

  // Process INBOX
  const inboxMessages = await Promise.all(
    inboxIds.map((id) => fetchMessageMetadata(accessToken, id))
  );
  for (const msg of inboxMessages) {
    if (!msg) continue;
    try {
      const headers = msg.payload?.headers;
      const fromHeader = headerValue(headers, 'From');
      const ccHeader = headerValue(headers, 'Cc');
      const subject = headerValue(headers, 'Subject');
      const messageIdHeader = headerValue(headers, 'Message-Id');
      const inReplyTo = headerValue(headers, 'In-Reply-To');
      const references = headerValue(headers, 'References');
      const dateHeader = headerValue(headers, 'Date');

      const counterparty = extractEmail(fromHeader);
      const leadId = await findLeadIdByEmail(counterparty);

      if (!leadId && isInternalEmail(counterparty)) continue;

      const receivedAt =
        parseDateHeader(dateHeader) ??
        (msg.internalDate
          ? new Date(parseInt(msg.internalDate, 10)).toISOString()
          : new Date().toISOString());

      const { error: upsertError } = await supabaseAdmin
        .from('crm_emails')
        .upsert(
          {
            lead_id: leadId,
            rep_email: rep.rep_email,
            direction: 'received',
            source: 'external',
            subject: subject || null,
            body_text: msg.snippet ?? null,
            gmail_message_id: msg.id,
            gmail_thread_id: msg.threadId,
            to_email: rep.rep_email,
            from_email: counterparty || null,
            cc: ccHeader || null,
            in_reply_to: inReplyTo || null,
            message_references: references || null,
            received_at: receivedAt,
            matched_via: leadId ? 'email_exact' : null,
            raw_headers: messageIdHeader
              ? { 'message-id': messageIdHeader }
              : null,
          },
          { onConflict: 'gmail_message_id', ignoreDuplicates: true }
        );

      if (upsertError) {
        result.errors.push(`received ${msg.id}: ${upsertError.message}`);
        continue;
      }
      result.received_logged += 1;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      result.errors.push(`received ${msg.id}: ${m}`);
    }
  }

  // repFromName is intentionally unused here but kept for future enrichment.
  void repFromName;

  return result;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: reps, error: repsError } = await supabaseAdmin
    .from('rep_gmail_tokens')
    .select('id, rep_email, is_active, last_sync_at')
    .eq('is_active', true);

  if (repsError) {
    return NextResponse.json(
      { error: `failed to load reps: ${repsError.message}` },
      { status: 500 }
    );
  }

  const repRows = (reps ?? []) as RepRow[];
  const results: RepResult[] = [];

  for (const rep of repRows) {
    try {
      const r = await processRep(rep);
      results.push(r);
      await supabaseAdmin
        .from('rep_gmail_tokens')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_error: r.errors.length ? r.errors.slice(0, 5).join(' | ') : null,
          sync_error_at: r.errors.length ? new Date().toISOString() : null,
        })
        .eq('id', rep.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        rep_email: rep.rep_email,
        sent_logged: 0,
        received_logged: 0,
        errors: [msg],
      });
      await supabaseAdmin
        .from('rep_gmail_tokens')
        .update({
          sync_error: msg.slice(0, 500),
          sync_error_at: new Date().toISOString(),
        })
        .eq('id', rep.id);
    }
  }

  return NextResponse.json({ ok: true, reps: results });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
