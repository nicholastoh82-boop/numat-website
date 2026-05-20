// app/api/cron/parse_invoices/route.ts
//
// Vercel Cron route that:
//   1. Pulls Gmail messages from nick@numat.ph matching: is:starred has:attachment filename:pdf
//   2. For each new message (not already in supplier_documents), extracts each PDF attachment
//   3. Sends each PDF to Gemini 2.5 Pro for structured extraction
//   4. Writes parsed fields to public.supplier_documents in Supabase
//   5. Stores the PDF in Supabase Storage bucket supplier_documents
//   6. Sends a Telegram alert per parsed doc
//
// Workflow for user: star a supplier email (gesture on mobile, "s" on desktop).
// Dedup is via gmail_message_id, so each email is parsed exactly once.
//
// Schedule via vercel.json cron config (every 30 min).
//
// Auth: x-vercel-cron-signature (auto injected by Vercel) or Authorization: Bearer ${CRON_SECRET}
//
// Required env vars (most already set):
//   VERTEX_PROXY_URL                                NEW (Cloud Run gemini-proxy)
//   VERTEX_PROXY_SECRET                             NEW
//   CRON_SECRET                                     already set
//   TELEGRAM_BOT_TOKEN                              already set
//   TELEGRAM_CHAT_ID                                already set
//   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL        already set
//   SUPABASE_SERVICE_ROLE_KEY                       already set
//   GOOGLE_CLIENT_ID                                already set
//   GOOGLE_CLIENT_SECRET                            already set

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getValidAccessToken } from '@/lib/gmail';
import { callGeminiProxy, extractText } from '@/lib/cron/vertex_proxy';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const REP_EMAIL = 'nick@numat.ph';
const GMAIL_QUERY = 'is:starred has:attachment filename:pdf';
const MAX_MESSAGES = 20;

const { CRON_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } =
  process.env as Record<string, string>;

const GEMINI_PROMPT = `You are extracting structured data from a Philippine supplier document for NUMAT Sustainable Manufacturing.

Read the attached PDF and return ONLY a valid JSON object (no markdown code fences, no commentary) with these fields. Use null if a field is missing or not explicitly stated. All amounts in PHP. Dates in YYYY-MM-DD format. Return supplier_website as a plain URL only (no markdown link syntax).

CRITICAL RULES:
1. subtotal_php, vat_php, and total_php must ONLY be filled if the document explicitly prints those values. NEVER calculate or sum line items yourself. If the document does not state a subtotal, return null.
2. line_items must reflect exactly what the document lists. Do not invent quantities or amounts.
3. If the document is a quotation showing unit prices only with no ordered quantity, populate line_items with the units the supplier describes (for example one drum at 250 kg, one bag at 45 kg) and leave totals as printed.
4. Never infer or compute any value. If a field is not literally present in the document, return null.

{
  "document_type": "quotation | invoice | purchase_order | bir_form | bank_statement | other",
  "document_date": "",
  "validity_date": "",
  "supplier_name": "",
  "supplier_address": "",
  "supplier_email": "",
  "supplier_phone": "",
  "supplier_website": "",
  "supplier_tin": "",
  "recipient_name": "",
  "recipient_company": "",
  "recipient_address": "",
  "line_items": [
    {
      "description": "",
      "quantity": 0,
      "unit": "",
      "unit_price_php": 0,
      "total_php": 0,
      "vat_inclusive": true
    }
  ],
  "subtotal_php": 0,
  "vat_php": 0,
  "total_php": 0,
  "payment_terms": "",
  "bank_accounts": [
    {
      "bank_name": "",
      "account_name": "",
      "account_number": ""
    }
  ],
  "signatory_name": "",
  "signatory_title": "",
  "notes": ""
}`;

function authorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron-signature')) return true;
  const secret = CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < header.length; i++) {
    mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

async function listMessages(token: string): Promise<string[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(GMAIL_QUERY)}&maxResults=${MAX_MESSAGES}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail list failed: ${await res.text()}`);
  const data = await res.json();
  return (data.messages ?? []).map((m: any) => m.id);
}

async function getMessage(token: string, id: string) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.json();
}

async function getAttachment(token: string, messageId: string, attachmentId: string): Promise<string> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  return data.data as string;
}

function findPdfAttachments(message: any): { filename: string; attachmentId: string }[] {
  const out: { filename: string; attachmentId: string }[] = [];
  const walk = (parts: any[]) => {
    for (const part of parts || []) {
      if (part.mimeType === 'application/pdf' && part.filename && part.body?.attachmentId) {
        out.push({ filename: part.filename, attachmentId: part.body.attachmentId });
      }
      if (part.parts) walk(part.parts);
    }
  };
  if (message.payload?.parts) walk(message.payload.parts);
  return out;
}

async function callGemini(pdfBase64Url: string): Promise<any> {
  const pdfBase64 = pdfBase64Url.replace(/-/g, '+').replace(/_/g, '/');
  const data = await callGeminiProxy({
    model: 'gemini-2.5-pro',
    contents: [
      {
        parts: [
          { text: GEMINI_PROMPT },
          { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      max_output_tokens: 8192,
    },
  });
  const text = extractText(data);
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });
}

function safeDate(v: any): string | null {
  if (!v || typeof v !== 'string') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function safeNumeric(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = await getValidAccessToken(REP_EMAIL);
  const messageIds = await listMessages(token);

  const summary = {
    rep_email: REP_EMAIL,
    found: messageIds.length,
    parsed: 0,
    skipped_already_parsed: 0,
    no_pdf: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const messageId of messageIds) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('supplier_documents')
        .select('id')
        .eq('gmail_message_id', messageId)
        .maybeSingle();

      if (existing) {
        summary.skipped_already_parsed++;
        continue;
      }

      const message = await getMessage(token, messageId);
      const pdfs = findPdfAttachments(message);

      if (pdfs.length === 0) {
        summary.no_pdf++;
        continue;
      }

      for (const pdf of pdfs) {
        const pdfBase64Url = await getAttachment(token, messageId, pdf.attachmentId);
        let parsed: any;
        try {
          parsed = await callGemini(pdfBase64Url);
        } catch (err: any) {
          summary.errors.push({ messageId, filename: pdf.filename, error: err.message });
          summary.failed++;
          continue;
        }

        const pdfBuffer = Buffer.from(
          pdfBase64Url.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        );
        const storagePath = `${new Date().toISOString().slice(0, 7)}/${messageId}_${pdf.filename}`;
        await supabaseAdmin.storage
          .from('supplier_documents')
          .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        const { error: insertErr } = await supabaseAdmin.from('supplier_documents').insert({
          gmail_message_id: messageId,
          gmail_thread_id: message.threadId,
          attachment_filename: pdf.filename,
          document_type: parsed.document_type ?? null,
          document_date: safeDate(parsed.document_date),
          validity_date: safeDate(parsed.validity_date),
          supplier_name: parsed.supplier_name ?? null,
          supplier_address: parsed.supplier_address ?? null,
          supplier_email: parsed.supplier_email ?? null,
          supplier_phone: parsed.supplier_phone ?? null,
          supplier_website: parsed.supplier_website ?? null,
          supplier_tin: parsed.supplier_tin ?? null,
          recipient_name: parsed.recipient_name ?? null,
          recipient_company: parsed.recipient_company ?? null,
          recipient_address: parsed.recipient_address ?? null,
          line_items: parsed.line_items ?? [],
          subtotal_php: safeNumeric(parsed.subtotal_php),
          vat_php: safeNumeric(parsed.vat_php),
          total_php: safeNumeric(parsed.total_php),
          payment_terms: parsed.payment_terms ?? null,
          bank_accounts: parsed.bank_accounts ?? [],
          signatory_name: parsed.signatory_name ?? null,
          signatory_title: parsed.signatory_title ?? null,
          notes: parsed.notes ?? null,
          raw_json: parsed,
          pdf_storage_path: storagePath,
          status: 'parsed',
          parsed_at: new Date().toISOString(),
        });

        if (insertErr) {
          summary.errors.push({ messageId, filename: pdf.filename, error: insertErr.message });
          summary.failed++;
          continue;
        }

        summary.parsed++;

        const tg = [
          `📄 <b>New supplier doc parsed</b>`,
          `<b>Supplier:</b> ${parsed.supplier_name ?? 'Unknown'}`,
          `<b>Type:</b> ${parsed.document_type ?? '?'}`,
          `<b>Doc date:</b> ${parsed.document_date ?? '?'}`,
          `<b>Total PHP:</b> ${parsed.total_php ?? '(not stated)'}`,
          `<b>File:</b> ${pdf.filename}`,
        ].join('\n');
        await sendTelegram(tg);
      }
    } catch (err: any) {
      summary.errors.push({ messageId, error: err.message });
      summary.failed++;
    }
  }

  return NextResponse.json(summary);
}
