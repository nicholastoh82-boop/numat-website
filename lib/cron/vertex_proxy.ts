// lib/cron/vertex_proxy.ts
//
// Shared client for the Cloud Run gemini-proxy service.
// All Gemini calls in this codebase route through here so we can switch
// endpoints in one place. The proxy runs on Cloud Run with the
// gemini-cron-runner service account attached, which auths to Vertex AI via
// the metadata server. Calls bill to GCP credits.
//
// Required env vars:
//   VERTEX_PROXY_URL    e.g. https://gemini-proxy-xxxxx.a.run.app
//   VERTEX_PROXY_SECRET shared bearer token

const PROXY_PATH = '/generate';

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

/**
 * Calls the Vertex AI Gemini proxy and returns the response.
 * Throws on non-2xx status.
 */
export async function callGeminiProxy(req: GeminiRequest): Promise<GeminiResponse> {
  const url = required('VERTEX_PROXY_URL').replace(/\/$/, '') + PROXY_PATH;
  const secret = required('VERTEX_PROXY_SECRET');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
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
