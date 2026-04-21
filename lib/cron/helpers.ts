// lib/cron/helpers.ts
//
// Shared utilities for all cron API routes:
//   - authorized(req): Bearer CRON_SECRET verification with constant-time compare
//   - required(name): env var reader that throws on missing
//   - supabaseGet / supabasePost / supabasePatch / supabaseRpc: typed REST helpers
//   - sendGmail: send plain-text email via Gmail API using a rep's OAuth refresh token

export type RepKey = "Nick" | "Mohan" | "Bryan";

const REP_REFRESH_TOKEN_ENV: Record<RepKey, string> = {
  Nick: "GOOGLE_REFRESH_TOKEN_NICK",
  Mohan: "GOOGLE_REFRESH_TOKEN_MOHAN",
  Bryan: "GOOGLE_REFRESH_TOKEN_BRYAN",
};

const REP_EMAIL: Record<RepKey, string> = {
  Nick: "nick@numat.ph",
  Mohan: "mohan@numat.ph",
  Bryan: "bryan@numat.ph",
};

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function authorized(req: Request): boolean {
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
// Gmail send
// ============================================================================

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = required("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = required("GOOGLE_OAUTH_CLIENT_SECRET");
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
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`OAuth refresh failed: ${json.error ?? res.status} ${json.error_description ?? ""}`);
  }
  return json.access_token;
}

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
};

export async function sendGmail(opts: SendGmailOpts): Promise<string> {
  const envName = REP_REFRESH_TOKEN_ENV[opts.from];
  if (!envName) throw new Error(`Unknown rep: ${opts.from}`);
  const refreshToken = required(envName);
  const fromEmail = REP_EMAIL[opts.from];
  const accessToken = await getAccessToken(refreshToken);

  const subjectEncoded = `=?utf-8?B?${Buffer.from(opts.subject, "utf-8").toString("base64")}?=`;
  const headers: string[] = [
    `From: ${fromEmail}`,
    `To: ${opts.to}`,
    opts.replyTo ? `Reply-To: ${opts.replyTo}` : null,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
  ].filter(Boolean) as string[];

  let body: string;
  if (opts.html) {
    headers.push(`Content-Type: text/html; charset="UTF-8"`);
    headers.push(`Content-Transfer-Encoding: 8bit`);
    body = opts.html;
  } else {
    headers.push(`Content-Type: text/plain; charset="UTF-8"`);
    headers.push(`Content-Transfer-Encoding: 8bit`);
    body = opts.text ?? "";
  }
  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;

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