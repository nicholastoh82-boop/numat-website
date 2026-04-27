// app/api/webhooks/finance-receipt/route.ts
//
// Finance Receipt Processor webhook. Replaces the n8n webhook at the same
// path (now served by Vercel). Accepts JSON POST from the staff upload form
// containing metadata + base64-encoded receipt image, calls Claude Vision to
// extract structured fields, merges user-provided values (priority) with AI
// values (fallback), inserts a row into financial_transactions, and emails
// Nick when Claude returns low confidence.
//
// Security: if RECEIPT_WEBHOOK_SECRET env var is set, requests must include
// header `x-receipt-secret: <secret>`. If the env var is unset, the endpoint
// is open (matches the current n8n behaviour). Set the env var to lock down.
//
// Expected JSON body:
//   staff_name, type (expense|income), transaction_date, vendor_client,
//   amount, currency, category, description, submitted_at,
//   has_receipt (bool), receipt_url, file_base64, file_media_type,
//   safe_filename.
//
// All fields are optional. User-supplied non-empty values always override AI
// extraction. If has_receipt is true and file_base64 is present, Claude Vision
// is called. Otherwise the row is inserted from the user-supplied fields alone
// with ai_confidence='n/a' and extracted_by_ai=false.

import { required, sendGmail, supabasePost } from "@/lib/cron/helpers";
import { anthropicMessagesUrl, anthropicHeaders } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Claude Vision model used for receipt OCR. Haiku 4.5 is fast, cheap,
// and plenty capable for structured extraction from receipt images.
// The n8n workflow used "claude-opus-4-5" which is a non-standard ID and
// likely did not resolve correctly. Haiku is the right tier for this.
const CLAUDE_VISION_MODEL = "claude-haiku-4-5-20251001";

const VISION_PROMPT = `You are a financial data extractor. Analyze this receipt or invoice, it may be printed or handwritten. Return ONLY a valid JSON object with these exact fields: { "date": "YYYY-MM-DD or null", "vendor": "string or null", "amount": number or null, "currency": "PHP or USD or null", "category": "one of: Raw Materials, Factory Labor, Utilities, Transport and Logistics, Equipment and Maintenance, Office Supplies, Marketing and Ads, Travel, Professional Fees, Rent, Product Sales, Miscellaneous", "description": "brief description of purchase", "confidence": "high or medium or low" }. Set confidence to low if handwriting is unclear, amount is ambiguous, or critical fields cannot be read. Return ONLY the JSON object, no other text, no markdown.`;

type VisionResult = {
  date?: string | null;
  vendor?: string | null;
  amount?: number | null;
  currency?: string | null;
  category?: string;
  description?: string;
  confidence?: "high" | "medium" | "low";
};

type ClaudeMessagesResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

type ReceiptPayload = {
  staff_name?: string;
  type?: string;
  transaction_date?: string;
  vendor_client?: string;
  amount?: number | string;
  currency?: string;
  category?: string;
  description?: string;
  submitted_at?: string;
  has_receipt?: boolean;
  receipt_url?: string;
  file_base64?: string;
  file_media_type?: string;
  safe_filename?: string;
};

function authorized(req: Request): boolean {
  const required = process.env.RECEIPT_WEBHOOK_SECRET;
  if (!required) return true; // Open endpoint if no secret configured
  const provided = req.headers.get("x-receipt-secret") ?? "";
  if (provided.length !== required.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) mismatch |= provided.charCodeAt(i) ^ required.charCodeAt(i);
  return mismatch === 0;
}

async function extractFields(body: ReceiptPayload) {
  return {
    staff_name: body.staff_name ?? "",
    type: body.type ?? "expense",
    transaction_date: body.transaction_date ?? new Date().toISOString().split("T")[0],
    vendor_client: body.vendor_client ?? "",
    amount: typeof body.amount === "string" ? parseFloat(body.amount) || 0 : Number(body.amount ?? 0),
    currency: body.currency ?? "PHP",
    category: body.category ?? "",
    description: body.description ?? "",
    submitted_at: body.submitted_at ?? new Date().toISOString(),
    has_receipt: Boolean(body.has_receipt),
    receipt_url: body.receipt_url ?? "",
    file_base64: body.file_base64 ?? "",
    file_media_type: body.file_media_type ?? "",
    safe_filename: body.safe_filename ?? "",
  };
}

async function callClaudeVision(base64: string, mediaType: string): Promise<VisionResult | null> {
  const res = await fetch(anthropicMessagesUrl(), {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model: CLAUDE_VISION_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Claude Vision failed: ${res.status} ${errText}`);
    return null;
  }
  const json = (await res.json()) as ClaudeMessagesResponse;
  const textBlock = json.content?.find((c) => c.type === "text");
  if (!textBlock?.text) return null;
  try {
    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as VisionResult;
  } catch (err) {
    console.error("Failed to parse Claude Vision response:", err, "raw:", textBlock.text.slice(0, 500));
    return null;
  }
}

async function processReceipt(body: ReceiptPayload) {
  const data = await extractFields(body);

  // Call Claude Vision if we have image data
  let ai: VisionResult | null = null;
  let aiConfidence: "high" | "medium" | "low" | "n/a" = "n/a";
  if (data.has_receipt && data.file_base64 && data.file_media_type) {
    ai = await callClaudeVision(data.file_base64, data.file_media_type);
    aiConfidence = ai?.confidence ?? "low";
  }

  // Merge: user-provided values win when non-empty, else fall back to AI values
  const finalDate =
    data.transaction_date && data.transaction_date !== ""
      ? data.transaction_date
      : ai?.date ?? new Date().toISOString().split("T")[0];
  const finalVendor = data.vendor_client && data.vendor_client !== "" ? data.vendor_client : ai?.vendor ?? "";
  const finalAmount = data.amount > 0 ? data.amount : Number(ai?.amount ?? 0);
  const finalCategory = data.category && data.category !== "" ? data.category : ai?.category ?? "Miscellaneous";
  const finalDesc = data.description && data.description !== "" ? data.description : ai?.description ?? "";

  const row = {
    transaction_date: finalDate,
    type: data.type || "expense",
    vendor_client: finalVendor,
    amount: finalAmount,
    currency: data.currency || "PHP",
    category: finalCategory,
    description: finalDesc,
    staff_name: data.staff_name,
    receipt_url: data.receipt_url,
    receipt_filename: data.safe_filename,
    extracted_by_ai: data.has_receipt,
    ai_confidence: aiConfidence,
    status: aiConfidence === "low" ? "flagged" : "pending",
    notes: `Submitted: ${data.submitted_at}`,
  };

  await supabasePost("financial_transactions", row);

  if (aiConfidence === "low") {
    const msg =
      `A receipt submission requires manual verification:\n\n` +
      `Staff: ${row.staff_name}\n` +
      `Date: ${row.transaction_date}\n` +
      `Vendor: ${row.vendor_client}\n` +
      `Amount: ${row.currency} ${row.amount}\n\n` +
      `Receipt: ${row.receipt_url}\n\n` +
      `Please review and update the transaction in Supabase.\n`;
    try {
      await sendGmail({
        from: "Nick",
        to: "nick@numat.ph",
        subject: `⚠️ Receipt needs review: ${row.vendor_client} ${row.currency} ${row.amount}`,
        text: msg,
      });
    } catch (err) {
      // Do not fail the whole request if the alert email fails; the row is
      // already in the DB with status='flagged' so Nick will see it in his
      // dashboard anyway.
      console.error("Low-confidence alert email failed:", err);
    }
  }

  return {
    inserted: true,
    ai_confidence: aiConfidence,
    status: row.status,
    vendor: row.vendor_client,
    amount: row.amount,
    currency: row.currency,
    category: row.category,
  };
}

// ============================================================================
// Entry point
// ============================================================================

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  let body: ReceiptPayload;
  try {
    body = (await req.json()) as ReceiptPayload;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await processReceipt(body);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("finance-receipt error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight — needed because the staff form is on a
// different origin (numatbamboo.com/receipt) from the API if ever split.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-receipt-secret",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET() {
  return new Response(
    "This endpoint accepts POST only. It is the finance receipt processor webhook.",
    { status: 405, headers: { Allow: "POST, OPTIONS" } }
  );
}