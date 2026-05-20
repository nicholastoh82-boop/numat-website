// lib/cron/vertex_proxy.ts
//
// Shared client for the Cloud Run gemini-proxy service.
// All Gemini calls in this codebase route through here so we can switch
// endpoints in one place. The proxy runs on Cloud Run with the
// gemini-cron-runner service account attached, which auths to Vertex AI via
// the metadata server. Calls bill to GCP credits.
//
// Auth flow (Vercel to Cloud Run):
//   1. Get OIDC token via @vercel/functions/oidc (Vercel runtime helper, more
//      reliable than reading process.env.VERCEL_OIDC_TOKEN directly because the
//      helper handles refresh and edge runtime differences)
//   2. Exchange the OIDC token for a GCP federated access token via the STS
//      endpoint, scoped via the vercel-pool Workload Identity Pool
//   3. Use the federated token to impersonate the gemini-cron-runner service
//      account and mint a Google ID token whose audience is the Cloud Run URL
//   4. Call Cloud Run with the ID token. Cloud Run IAM validates the token and
//      confirms gemini-cron-runner has roles/run.invoker on the proxy service.
//
// The ID token is cached in module scope for ~50 min. Vercel functions share
// module scope per warm instance so this avoids redoing the dance on every call
// within a cron run.
//
// Required env vars:
//   VERTEX_PROXY_URL          e.g. https://gemini-proxy-xxxxx.a.run.app
//   GCP_WIF_AUDIENCE          //iam.googleapis.com/projects/.../providers/vercel
//   GCP_SERVICE_ACCOUNT       gemini-cron-runner@numat-automation.iam.gserviceaccount.com
//
// Project must have OIDC Federation enabled (Project Settings > Security).

import { getVercelOidcToken } from '@vercel/functions/oidc';

const PROXY_PATH = '/generate';
const STS_ENDPOINT = 'https://sts.googleapis.com/v1/token';
const IAMCREDS_ENDPOINT = 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts';

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export type GeminiContent = {
  role?: 'user' | 'model';
  parts: GeminiPart[];
};

export type GeminiTool = { google_search: Record<string, never> };

export type GeminiRequest = {
  model: string;
  contents: GeminiContent[];
  generationConfig?: {
    response_mime_type?: string;
    temperature?: number;
    max_output_tokens?: number;
  };
  tools?: GeminiTool[];
};

export type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: unknown;
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var not set`);
  return v;
}

let cachedIdToken: { token: string; expiresAt: number } | null = null;

async function exchangeOidcForFederatedToken(): Promise<string> {
  let oidcToken: string;
  try {
    oidcToken = await getVercelOidcToken();
  } catch (err) {
    throw new Error(
      `Failed to read Vercel OIDC token: ${err instanceof Error ? err.message : String(err)}. Ensure OIDC Federation is enabled on the Vercel project (Project Settings > Security > Secure Backend Access with OIDC Federation).`
    );
  }
  if (!oidcToken) {
    throw new Error(
      'Vercel OIDC token is empty. Ensure OIDC Federation is enabled and the project has been redeployed since enabling.'
    );
  }
  const audience = required('GCP_WIF_AUDIENCE');

  const res = await fetch(STS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audience,
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
      subjectToken: oidcToken,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`STS token exchange failed: ${res.status} ${txt.slice(0, 400)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('STS response missing access_token');
  return data.access_token;
}

async function mintCloudRunIdToken(): Promise<string> {
  if (cachedIdToken && cachedIdToken.expiresAt > Date.now() + 60_000) {
    return cachedIdToken.token;
  }

  const sa = required('GCP_SERVICE_ACCOUNT');
  const audience = required('VERTEX_PROXY_URL').replace(/\/$/, '');
  const federated = await exchangeOidcForFederatedToken();

  const url = `${IAMCREDS_ENDPOINT}/${encodeURIComponent(sa)}:generateIdToken`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${federated}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audience, includeEmail: true }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`generateIdToken failed: ${res.status} ${txt.slice(0, 400)}`);
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error('generateIdToken response missing token');

  cachedIdToken = { token: data.token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return data.token;
}

/**
 * Calls the Vertex AI Gemini proxy and returns the response.
 * Throws on non-2xx status.
 */
export async function callGeminiProxy(req: GeminiRequest): Promise<GeminiResponse> {
  const url = required('VERTEX_PROXY_URL').replace(/\/$/, '') + PROXY_PATH;
  const idToken = await mintCloudRunIdToken();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini proxy failed: ${res.status} ${txt.slice(0, 400)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  return data;
}

/**
 * Convenience: extract first text candidate from a Gemini response.
 * Returns empty string if no text content present.
 */
export function extractText(resp: GeminiResponse): string {
  const parts = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('');
}
