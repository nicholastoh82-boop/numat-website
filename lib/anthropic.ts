/**
 * Shared Anthropic / Claude API client.
 *
 * All Claude API calls go through Cloudflare AI Gateway (kastelon-ai)
 * for cost tracking, caching, rate limiting, and observability.
 *
 * Env vars required (set in Vercel and .env.local):
 *   ANTHROPIC_API_KEY      Anthropic key (sk-ant-...)
 *   ANTHROPIC_BASE_URL     Cloudflare AI Gateway base URL for Anthropic
 *                          e.g. https://gateway.ai.cloudflare.com/v1/<acct>/kastelon-ai/anthropic
 *   CF_AIG_TOKEN           Cloudflare AI Gateway auth token (cf-aig-...)
 */

const DEFAULT_BASE = "https://api.anthropic.com";

function baseUrl(): string {
  return process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Build the headers for an Anthropic Messages API call.
 * Includes the AI Gateway auth header if CF_AIG_TOKEN is set.
 */
export function anthropicHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "x-api-key": required("ANTHROPIC_API_KEY"),
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
    ...extra,
  };

  const aigToken = process.env.CF_AIG_TOKEN;
  if (aigToken) {
    headers["cf-aig-authorization"] = `Bearer ${aigToken}`;
  }

  return headers;
}

/**
 * Full URL for the Anthropic Messages endpoint.
 * Routes through the gateway when ANTHROPIC_BASE_URL is set.
 */
export function anthropicMessagesUrl(): string {
  return `${baseUrl()}/v1/messages`;
}

/**
 * Convenience: call Claude with a request body, return the parsed Response.
 * Each route can still pass through their own request shape.
 */
export async function callAnthropicMessages(body: unknown, init: RequestInit = {}): Promise<Response> {
  return fetch(anthropicMessagesUrl(), {
    method: "POST",
    headers: anthropicHeaders(init.headers as Record<string, string> | undefined),
    body: JSON.stringify(body),
    ...init,
  });
}