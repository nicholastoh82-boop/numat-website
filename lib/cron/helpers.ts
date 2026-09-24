// lib/cron/helpers.ts
//
// Shared utilities for all cron API routes:
//   - authorized(req): Bearer CRON_SECRET verification with constant-time compare
//   - required(name): env var reader that throws on missing
//   - supabaseGet / supabasePost / supabasePatch / supabaseRpc: typed REST helpers
//   - sendGmail: send email via Gmail API as a rep (portal token from rep_gmail_tokens,
//     falling back to the legacy per rep env var; see repAccessToken)

export type RepKey = "Nick" | "Mohan" | "Bryan" | "Eugene" | "Erica";

const REP_REFRESH_TOKEN_ENV: Record<RepKey, string> = {
  Nick: "GOOGLE_REFRESH_TOKEN_NICK",
  Mohan: "GOOGLE_REFRESH_TOKEN_MOHAN",
  Bryan: "GOOGLE_REFRESH_TOKEN_BRYAN",
  Eugene: "GOOGLE_REFRESH_TOKEN_EUGENE",
  Erica: "GOOGLE_REFRESH_TOKEN_ERICA",
};

const REP_EMAIL: Record<RepKey, string> = {
  Nick: "nick@numat.ph",
  Mohan: "mohan@numat.ph",
  Bryan: "bryan@numat.ph",
  Eugene: "eugene@numat.ph",
  Erica: "erica@numat.ph",
};

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
  
}

export function authorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

// ============================================================================
// Supabase REST
// ============================================================================

function supabaseHeaders(): Record<string, string> {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function supabaseGet<T = unknown>(tableOrView: string, query: Record<string, string>): Promise<T> {
  const url = required("SUPABASE_URL");
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${url}/rest/v1/${tableOrView}?${qs}`, {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`GET ${tableOrView} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function supabaseGetRaw<T = unknown>(rawPath: string): Promise<T> {
  // For cases where we need complex URL-encoded or-filters that don't fit URLSearchParams cleanly.
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}/rest/v1/${rawPath}`, {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`GET ${rawPath} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export async function supabasePost(tableOrView: string, body: unknown, prefer = "return=minimal"): Promise<void> {
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}/rest/v1/${tableOrView}`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: prefer },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${tableOrView} failed: ${res.status} ${await res.text()}`);
}

export async function supabasePatch(rawPath: string, body: unknown): Promise<void> {
  // rawPath is the portion after /rest/v1/ including any filters, e.g. "master_leads?id=in.(a,b,c)"
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}/rest/v1/${rawPath}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${rawPath} failed: ${res.status} ${await res.text()}`);
}

export async function supabaseRpc<T = unknown>(fn: string, params: Record<string, unknown>): Promise<T> {
  const url = required("SUPABASE_URL");
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`RPC ${fn} failed: ${res.status} ${text}`);
  return text ? (JSON.parse(text) as T) : (null as T);
}

// ============================================================================
// Gmail auth
// ============================================================================
//
// Token source, in order:
//   1. rep_gmail_tokens (the portal "connect Gmail" flow at /api/gmail/auth),
//      the same active row lib/gmail.ts getValidAccessToken reads. These tokens
//      were issued to GOOGLE_CLIENT_ID, so they are refreshed with that client.
//   2. The legacy per rep env var (GOOGLE_REFRESH_TOKEN_<REP>), refreshed with
//      GOOGLE_OAUTH_CLIENT_ID. Used only when the rep has no active portal row,
//      or when the portal row lacks a scope the operation needs.

// What a Gmail call needs the token to allow.
type GmailNeed = "read" | "modify" | "send" | "compose";

const SCOPE_FULL = "https://mail.google.com/";
const SCOPE_MODIFY = "https://www.googleapis.com/auth/gmail.modify";
const SCOPE_READONLY = "https://www.googleapis.com/auth/gmail.readonly";
const SCOPE_SEND = "https://www.googleapis.com/auth/gmail.send";
const SCOPE_COMPOSE = "https://www.googleapis.com/auth/gmail.compose";

// Any one of these scopes satisfies the need.
const SCOPES_FOR_NEED: Record<GmailNeed, string[]> = {
  read: [SCOPE_READONLY, SCOPE_MODIFY, SCOPE_FULL],
  modify: [SCOPE_MODIFY, SCOPE_FULL],
  send: [SCOPE_SEND, SCOPE_COMPOSE, SCOPE_MODIFY, SCOPE_FULL],
  compose: [SCOPE_COMPOSE, SCOPE_MODIFY, SCOPE_FULL],
};

export function gmailReconnectUrl(rep: RepKey): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://numatbamboo.com";
  return `${base}/api/gmail/auth?rep_email=${encodeURIComponent(REP_EMAIL[rep])}`;
}

// Thrown when a rep's Gmail credentials are unusable (revoked or expired
// refresh token, or a missing scope). The message is a single line naming the
// rep and the reconnect URL, so callers can log err.message as is.
export class GmailAuthError extends Error {
  readonly rep: RepKey;
  readonly reason: "invalid_grant" | "missing_scope" | "no_token";
  readonly reconnectUrl: string;
  constructor(rep: RepKey, reason: GmailAuthError["reason"], detail: string) {
    const url = gmailReconnectUrl(rep);
    super(`[Gmail auth] ${rep} (${REP_EMAIL[rep]}): ${detail}. ${rep} must reconnect Gmail at ${url}`);
    this.name = "GmailAuthError";
    this.rep = rep;
    this.reason = reason;
    this.reconnectUrl = url;
  }
}

export function isGmailAuthError(err: unknown): err is GmailAuthError {
  return err instanceof GmailAuthError;
}

// Log a GmailAuthError once per rep and reason every few minutes, so a cron
// that touches many messages does not repeat the same line for each one.
const recentAuthLogs = new Map<string, number>();
const AUTH_LOG_TTL_MS = 4 * 60_000;

export function logGmailAuthError(err: GmailAuthError): void {
  const key = `${err.rep}:${err.reason}`;
  const last = recentAuthLogs.get(key) ?? 0;
  if (Date.now() - last < AUTH_LOG_TTL_MS) return;
  recentAuthLogs.set(key, Date.now());
  console.error(err.message);
}

type TokenRefreshResult = { accessToken: string; expiresInSec: number };

async function refreshAccessToken(
  rep: RepKey,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  sourceLabel: string,
): Promise<TokenRefreshResult> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    if (json.error === "invalid_grant") {
      throw new GmailAuthError(
        rep,
        "invalid_grant",
        `Google rejected the refresh token from ${sourceLabel} (invalid_grant: revoked or expired)`,
      );
    }
    throw new Error(
      `OAuth refresh failed for ${rep} (${sourceLabel}): ${json.error ?? res.status} ${json.error_description ?? ""}`.trim(),
    );
  }
  return { accessToken: json.access_token, expiresInSec: json.expires_in ?? 3600 };
}

type PortalTokenRow = {
  id: string;
  refresh_token: string;
  access_token: string | null;
  token_expires_at: string | null;
  scope: string | null;
};

async function getPortalTokenRow(rep: RepKey): Promise<PortalTokenRow | null> {
  const rows = await supabaseGet<PortalTokenRow[]>("rep_gmail_tokens", {
    select: "id,refresh_token,access_token,token_expires_at,scope",
    rep_email: `eq.${REP_EMAIL[rep]}`,
    is_active: "eq.true",
    limit: "1",
  });
  return rows[0] ?? null;
}

function hasScopeFor(scope: string | null, need: GmailNeed): boolean {
  const granted = new Set((scope ?? "").split(/\s+/).filter(Boolean));
  return SCOPES_FOR_NEED[need].some((s) => granted.has(s));
}

// In memory access token cache, so one cron run does not refresh (or hit
// Supabase) for every message it touches.
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

function cachedToken(key: string): string | null {
  const hit = accessTokenCache.get(key);
  return hit && hit.expiresAt - Date.now() > 60_000 ? hit.token : null;
}

async function portalAccessToken(rep: RepKey, row: PortalTokenRow): Promise<string> {
  const cacheKey = `portal:${rep}:${row.id}`;
  const cached = cachedToken(cacheKey);
  if (cached) return cached;

  // Reuse the access token lib/gmail.ts stored if it still has a minute left.
  const storedExpiry = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (row.access_token && storedExpiry - Date.now() > 60_000) {
    accessTokenCache.set(cacheKey, { token: row.access_token, expiresAt: storedExpiry });
    return row.access_token;
  }

  const { accessToken, expiresInSec } = await refreshAccessToken(
    rep,
    row.refresh_token,
    required("GOOGLE_CLIENT_ID"),
    required("GOOGLE_CLIENT_SECRET"),
    "rep_gmail_tokens",
  );
  const expiresAt = Date.now() + expiresInSec * 1000;
  accessTokenCache.set(cacheKey, { token: accessToken, expiresAt });

  const nowIso = new Date().toISOString();
  try {
    await supabasePatch(`rep_gmail_tokens?id=eq.${row.id}`, {
      access_token: accessToken,
      token_expires_at: new Date(expiresAt).toISOString(),
      last_used_at: nowIso,
    });
  } catch (err) {
    console.error(`[Gmail auth] ${rep}: could not store refreshed access token:`, err instanceof Error ? err.message : err);
  }
  return accessToken;
}

async function envAccessToken(rep: RepKey, envName: string, refreshToken: string): Promise<string> {
  const cacheKey = `env:${rep}`;
  const cached = cachedToken(cacheKey);
  if (cached) return cached;
  const { accessToken, expiresInSec } = await refreshAccessToken(
    rep,
    refreshToken,
    required("GOOGLE_OAUTH_CLIENT_ID"),
    required("GOOGLE_OAUTH_CLIENT_SECRET"),
    `env var ${envName}`,
  );
  accessTokenCache.set(cacheKey, { token: accessToken, expiresAt: Date.now() + expiresInSec * 1000 });
  return accessToken;
}

// Get a Gmail access token for the rep that allows `need`. Prefers the portal
// token in rep_gmail_tokens and falls back to the legacy env var only when no
// active row exists (or, with a logged warning, when the row lacks the scope).
async function repAccessToken(rep: RepKey, need: GmailNeed): Promise<string> {
  const envName = REP_REFRESH_TOKEN_ENV[rep];
  if (!envName) throw new Error(`Unknown rep: ${rep}`);
  const envToken = process.env[envName];

  let row: PortalTokenRow | null = null;
  try {
    row = await getPortalTokenRow(rep);
  } catch (err) {
    console.error(
      `[Gmail auth] ${rep}: could not read rep_gmail_tokens, trying ${envName}:`,
      err instanceof Error ? err.message : err,
    );
  }

  if (row) {
    if (hasScopeFor(row.scope, need)) return portalAccessToken(rep, row);

    const missing = new GmailAuthError(
      rep,
      "missing_scope",
      `connected Gmail token lacks the "${need}" permission (needs one of ${SCOPES_FOR_NEED[need].join(", ")})`,
    );
    if (!envToken) throw missing;
    // Keep working on the legacy token while the rep has not reconnected yet.
    logGmailAuthError(missing);
  }

  if (!envToken) {
    throw new GmailAuthError(rep, "no_token", `no connected Gmail token and ${envName} is not set`);
  }
  return envAccessToken(rep, envName, envToken);
}

// ============================================================================
// Gmail send
// ============================================================================

function toBase64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type SendGmailOpts = {
  from: RepKey;                // which rep's inbox to send from
  to: string;                  // recipient email
  subject: string;
  html?: string;               // if present, sent as text/html
  text?: string;               // if present (and no html), sent as text/plain
  replyTo?: string;            // optional Reply-To header
  attachments?: Array<{        // optional file attachments
    filename: string;
    mimeType: string;          // e.g. "application/pdf"
    data: string;              // base64-encoded contents
  }>;
};

export async function sendGmail(opts: SendGmailOpts): Promise<string> {
  const fromEmail = REP_EMAIL[opts.from];
  const accessToken = await repAccessToken(opts.from, "send");

  const subjectEncoded = `=?utf-8?B?${Buffer.from(opts.subject, "utf-8").toString("base64")}?=`;
  const topHeaders: string[] = [
    `From: ${fromEmail}`,
    `To: ${opts.to}`,
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : null,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
  ].filter(Boolean) as string[];

  let raw: string;
  const hasAttachments = opts.attachments && opts.attachments.length > 0;

  if (hasAttachments) {
    // multipart/mixed with body + attachments
    const boundary = `----=_Part_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    topHeaders.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

    const bodyContentType = opts.html ? 'text/html; charset="UTF-8"' : 'text/plain; charset="UTF-8"';
    const bodyContent = opts.html ?? opts.text ?? "";

    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${bodyContentType}`);
    parts.push(`Content-Transfer-Encoding: 8bit`);
    parts.push("");
    parts.push(bodyContent);

    for (const att of opts.attachments!) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`);
      parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push("");
      // Gmail expects 76-char lines for base64
      const wrapped = att.data.replace(/(.{76})/g, "$1\r\n");
      parts.push(wrapped);
    }
    parts.push(`--${boundary}--`);
    raw = `${topHeaders.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  } else if (opts.html) {
    topHeaders.push(`Content-Type: text/html; charset="UTF-8"`);
    topHeaders.push(`Content-Transfer-Encoding: 8bit`);
    raw = `${topHeaders.join("\r\n")}\r\n\r\n${opts.html}`;
  } else {
    topHeaders.push(`Content-Type: text/plain; charset="UTF-8"`);
    topHeaders.push(`Content-Transfer-Encoding: 8bit`);
    raw = `${topHeaders.join("\r\n")}\r\n\r\n${opts.text ?? ""}`;
  }

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: toBase64Url(raw) }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(`Gmail send failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

// Create a DRAFT reply in the rep's Gmail Drafts, threaded to the original
// message. The rep reviews and sends manually. Used by the reply handler to
// pre-draft responses to inbound prospect replies.
//
// signatureHtml, if provided, is appended. The draft is HTML.
export async function gmailCreateReplyDraft(opts: {
  rep: RepKey;
  to: string;
  subject: string;
  html: string;
  threadId: string;
  inReplyToMessageIdHeader?: string; // the RFC822 Message-ID of the message being replied to
}): Promise<string> {
  const fromEmail = REP_EMAIL[opts.rep];
  const accessToken = await repAccessToken(opts.rep, "compose");

  const subjectEncoded = `=?utf-8?B?${Buffer.from(opts.subject, "utf-8").toString("base64")}?=`;
  const headers: string[] = [
    `From: ${fromEmail}`,
    `To: ${opts.to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
  ];
  // Threading headers so Gmail nests the draft into the original conversation.
  if (opts.inReplyToMessageIdHeader) {
    headers.push(`In-Reply-To: ${opts.inReplyToMessageIdHeader}`);
    headers.push(`References: ${opts.inReplyToMessageIdHeader}`);
  }
  headers.push(`Content-Type: text/html; charset="UTF-8"`);
  headers.push(`Content-Transfer-Encoding: 8bit`);
  const raw = `${headers.join("\r\n")}\r\n\r\n${opts.html}`;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        raw: toBase64Url(raw),
        threadId: opts.threadId,
      },
    }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(`Gmail create draft failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

// ============================================================================
// Gmail read / modify (for Reply Handler + Bounce Catcher)
// ============================================================================

// Listing needs gmail.readonly (or gmail.modify); marking read and labelling
// need gmail.modify. See repAccessToken above.

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;          // plain text body (best-effort decoded)
  date: string;          // RFC 2822 header value
  labelIds: string[];
  messageIdHeader?: string; // the RFC822 Message-ID header, for threading replies
};

function decodeBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

type GmailPayloadPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPayloadPart[];
  headers?: Array<{ name: string; value: string }>;
};

function extractPlainTextBody(payload: GmailPayloadPart | undefined): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    // Prefer text/plain; fall back to any first data we find
    for (const p of payload.parts) {
      if (p.mimeType === "text/plain" && p.body?.data) return decodeBase64Url(p.body.data);
    }
    for (const p of payload.parts) {
      const inner = extractPlainTextBody(p);
      if (inner) return inner;
    }
  }
  return "";
}

function headerValue(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return "";
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/**
 * List inbox messages received in the last `minutes` minutes.
 * Returns message summaries with full body extracted.
 */
export async function gmailListInboxSince(rep: RepKey, minutes: number, maxResults = 50): Promise<GmailMessageSummary[]> {
  return gmailListByFolderSince(rep, "inbox", minutes, maxResults);
}

/**
 * List sent messages from the last `minutes` minutes. Used by the outreach
 * scanner to detect when a rep actually sent a cold outreach email from their
 * own Gmail (outside of our cron pipeline) so we can correlate against the
 * email_drafts table.
 */
export async function gmailListSentSince(rep: RepKey, minutes: number, maxResults = 50): Promise<GmailMessageSummary[]> {
  return gmailListByFolderSince(rep, "sent", minutes, maxResults);
}

async function gmailListByFolderSince(
  rep: RepKey,
  folder: "inbox" | "sent",
  minutes: number,
  maxResults: number,
): Promise<GmailMessageSummary[]> {
  const accessToken = await repAccessToken(rep, "read");
  const cutoffEpoch = Math.floor((Date.now() - Math.max(60, minutes * 60) * 1000) / 1000);
  const q = `in:${folder} after:${cutoffEpoch}`;
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`;
  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) throw new Error(`Gmail list ${folder} (${rep}) failed: ${listRes.status} ${await listRes.text()}`);
  const listJson = (await listRes.json()) as { messages?: Array<{ id: string; threadId: string }> };
  const ids = listJson.messages ?? [];
  if (ids.length === 0) return [];
  const summaries = await Promise.all(ids.map((m) => gmailGetMessage(rep, accessToken, m.id)));
  return summaries.filter((x): x is GmailMessageSummary => x !== null);
}

async function gmailGetMessage(
  rep: RepKey,
  accessToken: string,
  messageId: string,
): Promise<GmailMessageSummary | null> {
  const getRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!getRes.ok) {
    console.error(`gmailGetMessage (${rep}, ${messageId}) failed: ${getRes.status}`);
    return null;
  }
  const msg = (await getRes.json()) as {
    id: string;
    threadId: string;
    snippet?: string;
    labelIds?: string[];
    payload?: GmailPayloadPart;
    internalDate?: string;
  };
  const headers = msg.payload?.headers;
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headerValue(headers, "From"),
    to: headerValue(headers, "To"),
    subject: headerValue(headers, "Subject"),
    snippet: msg.snippet ?? "",
    body: extractPlainTextBody(msg.payload),
    date: headerValue(headers, "Date"),
    labelIds: msg.labelIds ?? [],
    messageIdHeader: headerValue(headers, "Message-ID") || headerValue(headers, "Message-Id"),
  } as GmailMessageSummary;
}

/**
 * Fetch all messages in a Gmail thread. Used by the outreach scanner to find
 * incoming replies on threads where we know the rep already sent a cold
 * outreach.
 */
export async function gmailGetThreadMessages(rep: RepKey, threadId: string): Promise<GmailMessageSummary[]> {
  const accessToken = await repAccessToken(rep, "read");
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Gmail get thread (${rep}, ${threadId}) failed: ${res.status} ${await res.text()}`);
  }
  const thread = (await res.json()) as {
    messages?: Array<{
      id: string;
      threadId: string;
      snippet?: string;
      labelIds?: string[];
      payload?: GmailPayloadPart;
    }>;
  };
  const msgs = thread.messages ?? [];
  return msgs.map((msg) => {
    const headers = msg.payload?.headers;
    return {
      id: msg.id,
      threadId: msg.threadId,
      from: headerValue(headers, "From"),
      to: headerValue(headers, "To"),
      subject: headerValue(headers, "Subject"),
      snippet: msg.snippet ?? "",
      body: extractPlainTextBody(msg.payload),
      date: headerValue(headers, "Date"),
      labelIds: msg.labelIds ?? [],
    } as GmailMessageSummary;
  });
}

/**
 * Extract a bare email address from a Gmail "From" / "To" header value.
 * Returns lowercased. Handles forms like
 *   "Jane Doe <jane@example.com>"
 *   "jane@example.com"
 *   "<jane@example.com>"
 */
export function parseEmailAddress(headerValue: string | undefined): string {
  if (!headerValue) return "";
  const m = headerValue.match(/<([^>]+)>/);
  if (m) return m[1].trim().toLowerCase();
  return headerValue.trim().toLowerCase();
}

/**
 * Mark a Gmail message as read (removes UNREAD label). Best-effort; swallows errors.
 */
export async function gmailMarkRead(rep: RepKey, messageId: string): Promise<void> {
  try {
    const accessToken = await repAccessToken(rep, "modify");
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    });
  } catch (err) {
    if (isGmailAuthError(err)) logGmailAuthError(err);
    else console.error(`gmailMarkRead (${rep}, ${messageId}) failed:`, err);
  }
}

/**
 * Add a Gmail label to a message by label ID. Best-effort.
 */
export async function gmailAddLabel(rep: RepKey, messageId: string, labelId: string): Promise<void> {
  try {
    const accessToken = await repAccessToken(rep, "modify");
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addLabelIds: [labelId] }),
    });
  } catch (err) {
    if (isGmailAuthError(err)) logGmailAuthError(err);
    else console.error(`gmailAddLabel (${rep}, ${messageId}, ${labelId}) failed:`, err);
  }
}

export const ALL_REPS: RepKey[] = ["Nick", "Bryan", "Erica"];

export function repEmailFor(rep: RepKey): string {
  return REP_EMAIL[rep];
}
