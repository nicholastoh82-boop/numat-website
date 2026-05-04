// app/api/cron/sequence-sender/route.ts
//
// Replacement for n8n workflow `numat_sequence_sender`.
// Triggered by Supabase pg_cron every minute via pg_net POST.
//
// Flow:
//   1. Verify Authorization: Bearer <CRON_SECRET>
//   2. Call Supabase RPC claim_due_messages (atomically flips queued -> sending)
//   3. For each message: send via Gmail API using the correct rep's refresh token
//   4. On success: RPC mark_message_sent (flips sending -> sent, updates master_leads, logs sequence_events)
//   5. On failure: RPC mark_message_failed (flips sending -> failed)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ClaimedMessage = {
  id: string;
  lead_id: string;
  step_num: number;
  rep_assigned: string;
  rep_email: string | null;
  rep_reply_to: string | null;
  email_to: string;
  email_subject: string;
  email_body: string;
};

type RepKey = "Nick" | "Mohan" | "Bryan";

const REP_REFRESH_TOKEN_ENV: Record<RepKey, string> = {
  Nick: "GOOGLE_REFRESH_TOKEN_NICK",
  Mohan: "GOOGLE_REFRESH_TOKEN_MOHAN",
  Bryan: "GOOGLE_REFRESH_TOKEN_BRYAN",
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

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
    throw new Error(`OAuth token refresh failed: ${json.error ?? res.status} ${json.error_description ?? ""}`);
  }
  return json.access_token;
}

function buildRfc2822(msg: ClaimedMessage, fromEmail: string): string {
  // Plain text email, UTF-8. Subject line RFC2047 encoded for non-ASCII safety.
  const subjectEncoded = `=?utf-8?B?${Buffer.from(msg.email_subject, "utf-8").toString("base64")}?=`;
  const headers = [
    `From: ${fromEmail}`,
    `To: ${msg.email_to}`,
    msg.rep_reply_to ? `Reply-To: ${msg.rep_reply_to}` : null,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
  ].filter(Boolean);
  return `${headers.join("\r\n")}\r\n\r\n${msg.email_body}`;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendGmail(accessToken: string, raw: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(raw) }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(`Gmail send failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.id;
}

async function supabaseRpc<T = unknown>(fn: string, body: Record<string, unknown>): Promise<T> {
  const url = required("SUPABASE_URL");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase RPC ${fn} failed: ${res.status} ${text}`);
  return text ? (JSON.parse(text) as T) : (null as T);
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const claimed = await supabaseRpc<ClaimedMessage[]>("claim_due_messages", { p_rep: null, p_limit: 10 });

  if (!Array.isArray(claimed) || claimed.length === 0) {
    return Response.json({ ok: true, claimed: 0, sent: 0, failed: 0, ms: Date.now() - started });
  }

  let sent = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const msg of claimed) {
    try {
      const rep = msg.rep_assigned as RepKey;
      const envName = REP_REFRESH_TOKEN_ENV[rep];
      if (!envName) throw new Error(`Unknown rep_assigned: ${msg.rep_assigned}`);
      const refreshToken = required(envName);

      const fromEmail = msg.rep_email ?? msg.rep_reply_to ?? "";
      if (!fromEmail) throw new Error(`Message ${msg.id} has no rep_email or rep_reply_to`);

      const accessToken = await getAccessToken(refreshToken);
      const raw = buildRfc2822(msg, fromEmail);
      const gmailId = await sendGmail(accessToken, raw);

      await supabaseRpc("mark_message_sent", {
        p_message_id: msg.id,
        p_gmail_message_id: gmailId,
      });
      sent++;
    } catch (err: unknown) {
      failed++;
      const errText = err instanceof Error ? err.message : String(err);
      errors.push({ id: msg.id, error: errText });
      try {
        await supabaseRpc("mark_message_failed", {
          p_message_id: msg.id,
          p_error: errText.slice(0, 1000),
        });
      } catch {
        // swallow: failure to record failure should not crash the batch
      }
    }
  }

  return Response.json({
    ok: true,
    claimed: claimed.length,
    sent,
    failed,
    errors: errors.length ? errors : undefined,
    ms: Date.now() - started,
  });
}

function authorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // constant-time compare
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return await handle();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Manual GET for diagnostics: also protected by CRON_SECRET
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  try {
    return await handle();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}