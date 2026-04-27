// lib/research.ts
//
// Typed Claude research client for the NUMAT cold outreach system.
//
// Calls the Anthropic Messages API (routed through the Cloudflare AI Gateway
// via lib/anthropic.ts) with the server side web_search tool, parses a
// strict JSON object describing the company, and returns a typed result.
//
// Note: this codebase does not depend on @anthropic-ai/sdk. We use the
// existing fetch helpers in lib/anthropic.ts which already inject the
// AI Gateway auth header. Behaviour is identical to the SDK for our needs.

import { z } from "zod";
import { anthropicMessagesUrl, anthropicHeaders } from "@/lib/anthropic";

// ---------- Types ----------

export type ResearchSegment =
  | "architects"
  | "construction"
  | "interior_designers"
  | "hotels_resorts"
  | "property_developers"
  | "furniture_makers"
  | "wood_distributors"
  | "modular_home_manufacturers"
  | "other";

export type ResearchQuality = "high" | "medium" | "low" | "failed";

export type CompanySizeBand = "enterprise" | "mid_market" | "smb" | "micro" | "unknown";

export type RecentSignalType =
  | "expansion"
  | "funding"
  | "launch"
  | "press"
  | "award"
  | "partnership"
  | "none";

export type ProductRecommendation =
  | "NuBam Boards"
  | "NuFloor"
  | "NuWall"
  | "NuDoor"
  | "NuSlat";

export interface RecentSignal {
  type: RecentSignalType;
  description: string;
  url: string | null;
  date: string | null;
}

export interface ResearchUsage {
  input_tokens: number;
  output_tokens: number;
  web_search_requests: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface ResearchResult {
  company_name: string;
  company_size_band: CompanySizeBand;
  primary_segment: ResearchSegment;
  segment_match: boolean;
  country: string | null;
  recent_signal: RecentSignal | null;
  pain_hooks: string[];
  product_recommendations: ProductRecommendation[];
  decision_maker_titles: string[];
  research_quality: ResearchQuality;
  failure_reason: string | null;
  source_urls: string[];
  usage: ResearchUsage;
}

export interface ResearchInput {
  domain: string;
  believedSegment: string;
  believedCompany: string | null;
  believedCountry: string | null;
  contactTitleSeen: string | null;
}

// ---------- Constants ----------

export const RESEARCH_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2000;
const WEB_SEARCH_MAX_USES = 5;
const PARSE_RETRY_LIMIT = 1;

// Pricing (USD). Source: https://www.anthropic.com/pricing as of 2026-04-27.
// Sonnet 4 list pricing: $3/MTok input, $15/MTok output.
// Anthropic web_search list pricing: $10 per 1000 requests.
// These constants are the source of truth for /api/admin/research/companies
// and for service_usage_log writes via the log_service_usage RPC.
export const SONNET_INPUT_PER_TOKEN = 0.000003;
export const SONNET_OUTPUT_PER_TOKEN = 0.000015;
export const WEB_SEARCH_PER_REQUEST = 0.01;

export const SONNET_PRICING_SOURCE = "sonnet4_2025_05";
export const WEB_SEARCH_PRICING_SOURCE = "anthropic_web_search_2025";

// ---------- Zod schema ----------

const SegmentEnum = z.enum([
  "architects",
  "construction",
  "interior_designers",
  "hotels_resorts",
  "property_developers",
  "furniture_makers",
  "wood_distributors",
  "modular_home_manufacturers",
  "other",
]);

const QualityEnum = z.enum(["high", "medium", "low", "failed"]);
const SizeBandEnum = z.enum(["enterprise", "mid_market", "smb", "micro", "unknown"]);
const SignalTypeEnum = z.enum([
  "expansion",
  "funding",
  "launch",
  "press",
  "award",
  "partnership",
  "none",
]);
const ProductEnum = z.enum(["NuBam Boards", "NuFloor", "NuWall", "NuDoor", "NuSlat"]);

const RecentSignalSchema = z
  .object({
    type: SignalTypeEnum,
    description: z.string(),
    url: z.string().nullable(),
    date: z.string().nullable(),
  })
  .nullable();

const ResearchResultSchema = z.object({
  company_name: z.string(),
  company_size_band: SizeBandEnum,
  primary_segment: SegmentEnum,
  segment_match: z.boolean(),
  country: z.string().nullable(),
  recent_signal: RecentSignalSchema,
  pain_hooks: z.array(z.string()),
  product_recommendations: z.array(ProductEnum),
  decision_maker_titles: z.array(z.string()),
  research_quality: QualityEnum,
  failure_reason: z.string().nullable(),
  source_urls: z.array(z.string()),
});

// ---------- Prompts ----------

const SYSTEM_PROMPT = `You research companies for NUMAT Sustainable Manufacturing Inc., a Philippine manufacturer of engineered bamboo boards (product lines: NuBam Boards, NuFloor, NuWall, NuDoor, NuSlat). NUMAT sells across Southeast Asia and exports globally to architects, builders, hotels, resorts, interior designers, furniture makers, modular home manufacturers, and property developers.

You are given one company domain. Use web_search to learn about the company, then return a single JSON object describing it. Return only the JSON. No prose, no markdown fences, no commentary.

Required JSON shape (every key required, use null where indicated):
{
  "company_name": string,
  "company_size_band": "enterprise" | "mid_market" | "smb" | "micro" | "unknown",
  "primary_segment": "architects" | "construction" | "interior_designers" | "hotels_resorts" | "property_developers" | "furniture_makers" | "wood_distributors" | "modular_home_manufacturers" | "other",
  "segment_match": boolean,
  "country": string | null,
  "recent_signal": {
    "type": "expansion" | "funding" | "launch" | "press" | "award" | "partnership" | "none",
    "description": string,
    "url": string | null,
    "date": string | null
  } | null,
  "pain_hooks": string[],
  "product_recommendations": string[],
  "decision_maker_titles": string[],
  "research_quality": "high" | "medium" | "low" | "failed",
  "failure_reason": string | null,
  "source_urls": string[]
}

Rules:
- If the domain is a directory, marketplace, magazine, news site, blog, dictionary, translation site, job board, hosting platform, government registry, defunct site, or any other non company entity, set research_quality to "failed", populate failure_reason with one short sentence, and the other fields can be best effort or empty defaults.
- pain_hooks: 1 to 3 short phrases (under 12 words each) tied to NUMAT's value proposition for this segment. Examples for hotels_resorts: "coastal humidity warping interior wood", "lobby refresh cycles every 5 years". Examples for architects: "sustainability documentation for green certifications", "regional supply scarcity for tropical hardwoods". Be specific to the company where possible.
- product_recommendations: pick 1 to 3 products from the allowed list (NuBam Boards, NuFloor, NuWall, NuDoor, NuSlat). Match to what the company actually builds or specifies.
- decision_maker_titles: actual titles you saw on the company website or in news. Examples: "Director of Procurement", "Senior Project Architect", "VP of Development". Do not invent generic titles.
- segment_match: true if your primary_segment matches the believed_segment passed in, false otherwise. If false, the lead may have been mis classified upstream.
- recent_signal: capture one piece of news or activity from the last 18 months. Set type to "none" with description "" and url null and date null if nothing relevant.
- source_urls: list every URL you actually consulted. Cap at 6.
- research_quality:
    "high" = company website found, business confirmed, recent activity verifiable
    "medium" = company found but limited info available
    "low" = company barely findable, mostly inference
    "failed" = the domain is not a real outreach target

Never fabricate sources. If you cannot find a piece of information, omit it or use null. Do not output anything other than the JSON.`;

const RETRY_GUIDANCE =
  "Your previous response could not be parsed as JSON. Return only valid JSON with no other text.";

// ---------- Anthropic response shapes (only what we touch) ----------

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicResponse {
  content?: Array<AnthropicTextBlock | { type: string; [k: string]: unknown }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    server_tool_use?: { web_search_requests?: number };
  };
  stop_reason?: string;
}

// ---------- Helpers ----------

function buildUserPrompt(input: ResearchInput): string {
  return [
    "Research this company and return the JSON.",
    "",
    `domain: ${input.domain}`,
    `believed_segment: ${input.believedSegment}`,
    `believed_company_name: ${input.believedCompany ?? "unknown"}`,
    `believed_country: ${input.believedCountry ?? "unknown"}`,
    `contact_title_seen: ${input.contactTitleSeen ?? "unknown"}`,
  ].join("\n");
}

function extractText(payload: AnthropicResponse): string {
  const blocks = payload.content ?? [];
  const parts: string[] = [];
  for (const b of blocks) {
    if (b && b.type === "text" && typeof (b as AnthropicTextBlock).text === "string") {
      parts.push((b as AnthropicTextBlock).text);
    }
  }
  return parts.join("\n").trim();
}

function stripFences(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  t = t.replace(/```\s*$/i, "");
  return t.trim();
}

function ensureEnv(): void {
  if (!process.env.ANTHROPIC_BASE_URL) {
    throw new Error("Missing required env var: ANTHROPIC_BASE_URL");
  }
  if (!process.env.CF_AIG_TOKEN) {
    throw new Error("Missing required env var: CF_AIG_TOKEN");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing required env var: ANTHROPIC_API_KEY");
  }
}

interface CallOpts {
  retryGuidance?: string;
}

async function callClaude(input: ResearchInput, opts: CallOpts = {}): Promise<AnthropicResponse> {
  const systemBlocks: Array<{ type: "text"; text: string }> = [{ type: "text", text: SYSTEM_PROMPT }];
  if (opts.retryGuidance) {
    systemBlocks.push({ type: "text", text: opts.retryGuidance });
  }

  const body = {
    model: RESEARCH_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: WEB_SEARCH_MAX_USES,
      },
    ],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: buildUserPrompt(input),
      },
    ],
  };

  const res = await fetch(anthropicMessagesUrl(), {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  return (await res.json()) as AnthropicResponse;
}

function pickUsage(payload: AnthropicResponse): ResearchUsage {
  return {
    input_tokens: payload.usage?.input_tokens ?? 0,
    output_tokens: payload.usage?.output_tokens ?? 0,
    web_search_requests: payload.usage?.server_tool_use?.web_search_requests ?? 0,
    cache_creation_input_tokens: payload.usage?.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: payload.usage?.cache_read_input_tokens ?? 0,
  };
}

// ---------- Public API ----------

export async function researchCompany(input: ResearchInput): Promise<ResearchResult> {
  ensureEnv();

  let payload = await callClaude(input);
  let rawText = extractText(payload);
  let cleaned = stripFences(rawText);
  let parsed = ResearchResultSchema.safeParse(safeJsonParse(cleaned));

  let attempts = 0;
  while (!parsed.success && attempts < PARSE_RETRY_LIMIT) {
    attempts += 1;
    payload = await callClaude(input, { retryGuidance: RETRY_GUIDANCE });
    rawText = extractText(payload);
    cleaned = stripFences(rawText);
    parsed = ResearchResultSchema.safeParse(safeJsonParse(cleaned));
  }

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    const preview = cleaned.slice(0, 300);
    throw new Error(
      `researchCompany: failed to parse Claude response after ${attempts + 1} attempts. ` +
        `Issues: ${issues}. Preview: ${preview}`,
    );
  }

  return {
    ...parsed.data,
    usage: pickUsage(payload),
  };
}

function safeJsonParse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

// ---------- Usage logging helpers ----------

export interface UsageLogRow {
  client_id: string;
  service: string;
  operation: string;
  unit: string;
  units_consumed: number;
  unit_cost_usd: number;
  pricing_source: string;
  reference_type: string;
  reference_id: string;
  metadata: Record<string, unknown>;
}

/**
 * Build the rows that should be inserted into service_usage_log via the
 * log_service_usage RPC for a single research call. Always emits the
 * Claude input and output token rows. Emits the web_search row only when
 * the call billed at least one web_search request.
 */
export function buildUsageLogRows(args: {
  clientId: string;
  domain: string;
  usage: ResearchUsage;
}): UsageLogRow[] {
  const { clientId, domain, usage } = args;
  const referenceId = domain.toLowerCase();
  const claudeMetadata: Record<string, unknown> = {
    model: RESEARCH_MODEL,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
  };

  const rows: UsageLogRow[] = [
    {
      client_id: clientId,
      service: "anthropic_claude",
      operation: "research_company",
      unit: "token_input",
      units_consumed: usage.input_tokens,
      unit_cost_usd: SONNET_INPUT_PER_TOKEN,
      pricing_source: SONNET_PRICING_SOURCE,
      reference_type: "company",
      reference_id: referenceId,
      metadata: claudeMetadata,
    },
    {
      client_id: clientId,
      service: "anthropic_claude",
      operation: "research_company",
      unit: "token_output",
      units_consumed: usage.output_tokens,
      unit_cost_usd: SONNET_OUTPUT_PER_TOKEN,
      pricing_source: SONNET_PRICING_SOURCE,
      reference_type: "company",
      reference_id: referenceId,
      metadata: claudeMetadata,
    },
  ];

  if (usage.web_search_requests > 0) {
    rows.push({
      client_id: clientId,
      service: "anthropic_web_search",
      operation: "research_company",
      unit: "request",
      units_consumed: usage.web_search_requests,
      unit_cost_usd: WEB_SEARCH_PER_REQUEST,
      pricing_source: WEB_SEARCH_PRICING_SOURCE,
      reference_type: "company",
      reference_id: referenceId,
      metadata: { model: RESEARCH_MODEL },
    });
  }

  return rows;
}

/**
 * Estimate the USD cost of a single research call from list pricing only.
 * The source of truth for billing remains service_usage_log via the
 * service_usage_summary view; this is for in flight reporting in the
 * runner response.
 */
export function estimateResearchCostUsd(usage: ResearchUsage): number {
  return (
    usage.input_tokens * SONNET_INPUT_PER_TOKEN +
    usage.output_tokens * SONNET_OUTPUT_PER_TOKEN +
    usage.web_search_requests * WEB_SEARCH_PER_REQUEST
  );
}
