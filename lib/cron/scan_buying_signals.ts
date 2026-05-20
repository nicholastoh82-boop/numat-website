// lib/cron/scan_buying_signals.ts
//
// Gemini 2.5 Pro with Google Search grounding. Used by buying-signal-scan cron.
// Detects buying signals in the last 90 days: project announcements, hires,
// fundraises, RFP wins, expansion plans. Only runs on leads with
// icp_fit_score >= 60 (the enrichment cron sets this score).

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

export type BuyingSignalStrength = "hot" | "warm" | "cold" | "none";

export type BuyingSignalResult = {
  strength: BuyingSignalStrength;
  summary: string;
  evidence: Array<{
    type: string;
    description: string;
    source_url: string;
    detected_date: string;
  }>;
};

const VALID_STRENGTHS = new Set<BuyingSignalStrength>([
  "hot",
  "warm",
  "cold",
  "none",
]);

const PROMPT_TEMPLATE = `You are scanning for BUYING SIGNALS that suggest a company is about to need engineered bamboo building products. The company is being evaluated as a potential customer for NUMAT Sustainable Manufacturing (a Philippine bamboo board, wall panel, door, floor, and slat panel manufacturer).

Use Google Search to find news, announcements, press releases, LinkedIn updates, and job postings from the last 90 days about this specific company. Look for these signals:

PROJECT SIGNALS (highest weight):
- New construction project announcements (offices, hotels, hospitality, retail, residential)
- New facility opening or expansion
- Won contract or RFP for a build
- Groundbreaking ceremony or topping out event
- Architectural plans filed or approved
- Interior fitout work announced

DEMAND SIGNALS (medium weight):
- Hiring construction managers, procurement officers, interior designers, fitout teams
- Sustainability or green building commitment announcement
- Partnership with architects or builders
- Vendor or supplier search publicly mentioned

FINANCIAL SIGNALS (supporting):
- Recent fundraise or capital raise
- Earnings beat or growth announcement
- New business line in construction or hospitality

OUTPUT STRENGTH MAPPING:
hot: 2+ project signals OR 1 project signal in last 30 days
warm: 1 project signal OR 2+ demand signals
cold: only demand or financial signals, no concrete project plan
none: no buying-relevant news found in last 90 days

CRITICAL RULES:
1. Only report signals you can back with a real source URL. If you cannot find any sources, return strength "none" and an empty evidence array.
2. Do NOT fabricate news. If Google Search returns nothing specific to this company in the last 90 days, return "none".
3. Each evidence entry must include a real source_url found via search.
4. detected_date should be the article or announcement date in YYYY-MM-DD when known, else leave blank.

Return ONLY a valid JSON object. No markdown code fences. No commentary.

{
  "strength": "hot|warm|cold|none",
  "summary": "one paragraph, under 400 chars, plain English overview of the signals or absence",
  "evidence": [
    {
      "type": "project_announcement|new_facility|contract_win|hiring|fundraise|partnership|other",
      "description": "one sentence under 200 chars",
      "source_url": "real URL from Google Search",
      "detected_date": "YYYY-MM-DD or empty string"
    }
  ]
}

Target company:
Name: {{COMPANY_NAME}}
Domain: {{COMPANY_DOMAIN}}
Country: {{COUNTRY}}
Their business: {{BUSINESS_DESCRIPTION}}`;

function clean(args: { description?: string; type?: string; source_url?: string; detected_date?: string }) {
  const type = (args.type || "other").toString().slice(0, 40);
  const description = (args.description || "").toString().slice(0, 250);
  const source_url = (args.source_url || "").toString().slice(0, 500);
  const detected_date = (args.detected_date || "").toString().slice(0, 20);
  return { type, description, source_url, detected_date };
}

function sanitise(raw: any): BuyingSignalResult {
  const strength = VALID_STRENGTHS.has(raw?.strength)
    ? (raw.strength as BuyingSignalStrength)
    : "none";
  const summary =
    typeof raw?.summary === "string" ? raw.summary.slice(0, 600) : "";
  const evidenceRaw = Array.isArray(raw?.evidence) ? raw.evidence : [];
  const evidence = evidenceRaw
    .filter((e: any) => e && typeof e === "object" && e.source_url)
    .slice(0, 8)
    .map(clean);
  // If strength is hot or warm but no evidence with URLs, downgrade to cold.
  // This prevents the model from claiming hot signals without backing them.
  const finalStrength =
    (strength === "hot" || strength === "warm") && evidence.length === 0
      ? "cold"
      : strength;
  return { strength: finalStrength, summary, evidence };
}

export type ScanInput = {
  company_name: string | null;
  company_domain: string | null;
  country: string | null;
  business_description: string | null;
};

export async function scanBuyingSignals(input: ScanInput): Promise<BuyingSignalResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const prompt = PROMPT_TEMPLATE
    .replace("{{COMPANY_NAME}}", input.company_name || "Unknown")
    .replace("{{COMPANY_DOMAIN}}", input.company_domain || "Unknown")
    .replace("{{COUNTRY}}", input.country || "Unknown")
    .replace(
      "{{BUSINESS_DESCRIPTION}}",
      (input.business_description || "Unknown").slice(0, 400)
    );

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.1,
        max_output_tokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini grounded scan failed: ${res.status} ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned no text content");

  // Grounded responses may include extra prose around the JSON. Extract the
  // first {...} block.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : text;

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Gemini grounded returned non JSON: ${text.slice(0, 200)} | parse error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return sanitise(parsed);
}

export function isHotOrWarm(s: BuyingSignalStrength): boolean {
  return s === "hot" || s === "warm";
}
