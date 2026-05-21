// lib/cron/gcp_auth.ts
//
// Shared helper for getting Google Cloud access tokens from Vercel via
// Workload Identity Federation. Same auth flow as vertex_proxy.ts, but
// returns an access token (not an ID token) so it can be used against
// any Google Cloud REST API: Cloud Storage, Discovery Engine, etc.
//
// Caches the token in module scope for 50 min to avoid re-authing on
// every call within the same warm Vercel function instance.

import { getVercelOidcToken } from '@vercel/functions/oidc';

const STS_URL = 'https://sts.googleapis.com/v1/token';
const IAM_CRED_URL = 'https://iamcredentials.googleapis.com/v1';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var not set`);
  return v;
}

type CachedToken = { token: string; expiresAt: number; scope: string };
let cache: CachedToken | null = null;

async function exchangeOidcForFederated(oidcToken: string): Promise<string> {
  const audience = required('GCP_WIF_AUDIENCE');
  const res = await fetch(STS_URL, {
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
    throw new Error(`STS exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('STS response missing access_token');
  return data.access_token;
}

async function impersonateServiceAccountForAccessToken(
  federatedToken: string,
  scopes: string[]
): Promise<{ token: string; expiresAt: number }> {
  const sa = required('GCP_SERVICE_ACCOUNT');
  const url = `${IAM_CRED_URL}/projects/-/serviceAccounts/${sa}:generateAccessToken`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${federatedToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scope: scopes, lifetime: '3600s' }),
  });
  if (!res.ok) {
    throw new Error(`SA impersonation failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { accessToken?: string; expireTime?: string };
  if (!data.accessToken || !data.expireTime) {
    throw new Error('generateAccessToken response missing fields');
  }
  return { token: data.accessToken, expiresAt: new Date(data.expireTime).getTime() };
}

/**
 * Get a Google Cloud access token via Vercel OIDC + WIF + service account impersonation.
 * Default scope is cloud-platform which works for Cloud Storage, Discovery Engine,
 * Cloud Run, Vertex AI, and most other Google Cloud REST APIs.
 *
 * Tokens are cached in module scope for 50 minutes.
 */
export async function getGcpAccessToken(
  scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform']
): Promise<string> {
  const scopeKey = scopes.slice().sort().join(' ');
  const now = Date.now();
  if (cache && cache.scope === scopeKey && cache.expiresAt - now > 60_000) {
    return cache.token;
  }

  const oidc = await getVercelOidcToken();
  const federated = await exchangeOidcForFederated(oidc);
  const { token, expiresAt } = await impersonateServiceAccountForAccessToken(
    federated,
    scopes
  );
  cache = { token, expiresAt, scope: scopeKey };
  return token;
}
