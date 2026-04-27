// lib/zerobounce.ts
//
// Typed client for the ZeroBounce v2 synchronous batch endpoint and credit
// lookup. Used by the admin runner under /api/admin/zerobounce/* to score
// email addresses on master_leads before any outbound send. Hard fails
// (invalid, spamtrap, abuse, do_not_mail) drive the suppression rows that
// public.zerobounce_apply_batch writes downstream.

const VALIDATE_BATCH_URL = "https://bulkapi.zerobounce.net/v2/validatebatch";
const GET_CREDITS_URL = "https://api.zerobounce.net/v2/getcredits";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BATCH_SIZE = 100;

const ZB_STATUS_VALUES = [
  "valid",
  "invalid",
  "catch-all",
  "unknown",
  "spamtrap",
  "abuse",
  "do_not_mail",
] as const;

export type ZBStatus = (typeof ZB_STATUS_VALUES)[number];

export interface ZBVerdict {
  email: string;
  status: ZBStatus;
  sub_status: string;
  free_email: boolean;
  did_you_mean: string | null;
}

export interface ZBValidateBatchResult {
  verdicts: ZBVerdict[];
  errors: Array<{ email: string; message: string }>;
}

function getApiKey(): string {
  const key = process.env.ZEROBOUNCE_API_KEY;
  if (!key) throw new Error("Missing required env var: ZEROBOUNCE_API_KEY");
  return key;
}

function isZBStatus(value: unknown): value is ZBStatus {
  return typeof value === "string" && (ZB_STATUS_VALUES as readonly string[]).includes(value);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function validateBatch(emails: string[]): Promise<ZBValidateBatchResult> {
  if (emails.length > MAX_BATCH_SIZE) {
    throw new Error(`validateBatch: too many emails (${emails.length}); max is ${MAX_BATCH_SIZE}`);
  }
  const apiKey = getApiKey();

  const normalized = emails.map((e) => e.trim().toLowerCase());
  const body = {
    api_key: apiKey,
    email_batch: normalized.map((email_address) => ({ email_address, ip_address: "" })),
  };

  const res = await fetchWithTimeout(VALIDATE_BATCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ZeroBounce validateBatch failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    email_batch?: Array<{
      address?: string;
      status?: string;
      sub_status?: string | null;
      free_email?: boolean;
      did_you_mean?: string | null;
    }>;
    errors?: Array<{ email_address?: string; error?: string }>;
  };

  const rawVerdicts = Array.isArray(json.email_batch) ? json.email_batch : [];
  const verdicts: ZBVerdict[] = [];
  for (const row of rawVerdicts) {
    const email = (row.address ?? "").toLowerCase();
    if (!email) continue;
    const status = row.status ?? "unknown";
    if (!isZBStatus(status)) {
      console.warn(`[zerobounce] unexpected status "${status}" for ${email}; passing through`);
    }
    verdicts.push({
      email,
      status: status as ZBStatus,
      sub_status: row.sub_status ?? "",
      free_email: row.free_email === true,
      did_you_mean: row.did_you_mean ?? null,
    });
  }

  const errors = Array.isArray(json.errors)
    ? json.errors.map((e) => ({
        email: (e.email_address ?? "").toLowerCase(),
        message: e.error ?? "unknown error",
      }))
    : [];

  return { verdicts, errors };
}

export async function getCredits(): Promise<number> {
  const apiKey = getApiKey();
  const url = `${GET_CREDITS_URL}?api_key=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithTimeout(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ZeroBounce getCredits failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { Credits?: string | number };
  const raw = json.Credits;
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}
