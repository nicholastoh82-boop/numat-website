// lib/cron/enrich_lead.ts
//
// Gemini Flash based lead enrichment. Used by app/api/cron/lead-enrichment.
// Fetches the lead's company website, extracts plain text, sends it to Gemini
// along with lead metadata, returns a structured enrichment object.

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type EmployeeSizeBand =
  | "small"
  | "medium"
  | "large"
  | "enterprise"
  | "unknown";

export type EnrichmentResult = {
  business_description: string;
  products_offered: string[];
  employee_size_band: EmployeeSizeBand;
  icp_fit_score: number;
  icp_fit_reason: string;
  pain_hooks: string[];
  product_recommendations: string[];
  source_urls: string[];
};

const VALID_SIZE_BANDS = new Set<EmployeeSizeBand>([
  "small",
  "medium",
  "large",
  "enterprise",
  "unknown",
]);

const VALID_NUMAT_PRODUCTS = new Set([
  "NuBam Boards",
  "NuWall",
  "NuDoor",
  "NuFloor",
  "NuSlat",
]);

const PROMPT_TEMPLATE = `You are scoring a potential customer for NUMAT Sustainable Manufacturing Inc., a Philippine engineered bamboo manufacturer. NUMAT makes 5 product lines aimed at construction, manufacturing, materials trading, and specialist supplier buyers globally:

NuBam Boards: engineered bamboo sheet goods (panels, sheet stock for furniture, joinery, cabinetry)
NuWall: bamboo wall panels and cladding for interior fitout
NuDoor: bamboo door panels and frames
NuFloor: bamboo flooring for residential and commercial
NuSlat: decorative bamboo slat panels for ceilings, walls, partitions

IMPORTANT: NUMAT has NO independent certifications. Do not assume fire ratings, acoustic ratings, LEED credits, ASTM compliance, or Class A ratings. Mid market pricing comparable to engineered hardwood.

Using ONLY the information provided below (do not fabricate facts), produce a structured assessment.

ICP FIT SCORING GUIDELINES:
90 to 100: Clear construction, joinery, furniture, or fitout user with active project pipeline
70 to 89: Construction adjacent (design firms, materials traders, hospitality with build pipeline)
50 to 69: General construction or interior design firm without obvious signal
30 to 49: Tangential fit (real estate, hospitality without build pipeline)
10 to 29: Weak fit (services firms with offices to fit out, but not their core business)
0 to 9: No fit (pure SaaS, agriculture without joinery, mining, etc.)

Return ONLY a valid JSON object. No markdown code fences. No commentary. All array fields must be arrays even if empty.

{
  "business_description": "one paragraph in plain English",
  "products_offered": ["their product 1", "their product 2"],
  "employee_size_band": "one of: small, medium, large, enterprise, unknown",
  "icp_fit_score": 0,
  "icp_fit_reason": "one paragraph explaining the score with specific signals",
  "pain_hooks": ["up to 3 specific pain points NUMAT could address"],
  "product_recommendations": ["NuBam Boards", "NuFloor"]
}

Constraints on output:
business_description: under 400 characters
icp_fit_reason: under 400 characters
products_offered: up to 8 items, each under 60 chars
pain_hooks: up to 3 items, each under 120 chars
product_recommendations: only use exact strings from NUMAT's 5 product names above

LEAD METADATA:
Company name: {{COMPANY_NAME}}
Domain: {{COMPANY_DOMAIN}}
Country: {{COUNTRY}}
Industry segment: {{SEGMENT}}
Contact title: {{TITLE}}
Existing notes: {{NOTES}}
Existing intended business: {{INTENDED_BUSINESS}}
Service keywords: {{SERVICE_KEYWORDS}}

WEBSITE EXCERPT (first 8000 chars of homepage text, may be empty if fetch failed):
{{WEBSITE_TEXT}}`;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWebsiteText(rawDomain: string | null): Promise<{ text: string; url: string | null }> {
  if (!rawDomain) return { text: "", url: null };
  let domain = rawDomain.trim();
  if (!domain) return { text: "", url: null };
  if (!/^https?:\/\//i.test(domain)) {
    domain = `https://${domain.replace(/^\/+/, "")}`;
  }
  try {
    const res = await fetch(domain, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NumatLeadBot/1.0; +https://numatbamboo.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return { text: "", url: domain };
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) {
      return { text: "", url: domain };
    }
    const html = await res.text();
    return { text: stripHtml(html).slice(0, 8000), url: domain };
  } catch {
    return { text: "", url: domain };
  }
}

function clamp(n: any, lo: number, hi: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function arrStr(v: any, maxLen: number, maxItems: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim().slice(0, maxLen))
    .slice(0, maxItems);
}

function sanitise(raw: any): Omit<EnrichmentResult, "source_urls"> {
  return {
    business_description:
      typeof raw?.business_description === "string"
        ? raw.business_description.slice(0, 1000)
        : "",
    products_offered: arrStr(raw?.products_offered, 60, 8),
    employee_size_band: VALID_SIZE_BANDS.has(raw?.employee_size_band)
      ? (raw.employee_size_band as EmployeeSizeBand)
      : ("unknown" as EmployeeSizeBand),
    icp_fit_score: clamp(raw?.icp_fit_score, 0, 100, 0),
    icp_fit_reason:
      typeof raw?.icp_fit_reason === "string"
        ? raw.icp_fit_reason.slice(0, 1000)
        : "",
    pain_hooks: arrStr(raw?.pain_hooks, 120, 3),
    product_recommendations: arrStr(raw?.product_recommendations, 40, 5).filter(
      (p) => VALID_NUMAT_PRODUCTS.has(p)
    ),
  };
}

export type LeadInput = {
  company_name: string | null;
  company_domain: string | null;
  country: string | null;
  segment: string | null;
  title: string | null;
  notes: string | null;
  intended_business: string | null;
  service_keywords: string | null;
};

export async function enrichLead(lead: LeadInput): Promise<EnrichmentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const { text: websiteText, url } = await fetchWebsiteText(lead.company_domain);

  const prompt = PROMPT_TEMPLATE
    .replace("{{COMPANY_NAME}}", lead.company_name || "Unknown")
    .replace("{{COMPANY_DOMAIN}}", lead.company_domain || "Unknown")
    .replace("{{COUNTRY}}", lead.country || "Unknown")
    .replace("{{SEGMENT}}", lead.segment || "Unknown")
    .replace("{{TITLE}}", lead.title || "Unknown")
    .replace("{{NOTES}}", (lead.notes || "").slice(0, 500))
    .replace("{{INTENDED_BUSINESS}}", lead.intended_business || "")
    .replace("{{SERVICE_KEYWORDS}}", lead.service_keywords || "")
    .replace("{{WEBSITE_TEXT}}", websiteText || "(no website content available)");

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
        max_output_tokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini enrich failed: ${res.status} ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text content");

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Gemini returned non JSON: ${text.slice(0, 200)} | parse error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const clean = sanitise(parsed);
  return {
    ...clean,
    source_urls: url ? [url] : [],
  };
}
