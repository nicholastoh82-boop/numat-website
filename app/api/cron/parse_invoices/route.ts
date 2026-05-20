// app/api/cron/parse_invoices/route.ts
//
// Vercel Cron route that:
//   1. Pulls Gmail messages labelled "Invoices/ToParse"
//   2. Extracts PDF attachments
//   3. Sends each PDF to Gemini 2.5 Pro for structured extraction
//   4. Writes parsed fields to public.supplier_documents
//   5. Stores the PDF in Supabase Storage bucket supplier_documents
//   6. Relabels the email to "Invoices/Parsed" (or "Invoices/Failed")
//   7. Sends a Telegram alert per parsed doc
//
// Schedule via vercel.json cron config (every 30 min).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  CRON_SECRET,
} = process.env as Record<string, string>;

const TO_PARSE_LABEL = 'Invoices/ToParse';
const PARSED_LABEL = 'Invoices/Parsed';
const FAILED_LABEL = 'Invoices/Failed';

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

async function getGmailAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

async function ensureLabel(token: string, name: string): Promise<string> {
  const list = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const existing = list.labels?.find((l: any) => l.name === name);
  if (existing) return existing.id;
  const create = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  });
  if (!create.ok) throw new Error(`Create label failed: ${await create.text()}`);
  const data = await create.json();
  return data.id as string;
}

async function listMessages(token: string, labelId: string): Promise<string[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
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
      if (
        part.mimeType === 'application/pdf' &&
        part.filename &&
        part.body?.attachmentId
      ) {
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
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini call failed: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

async function relabel(token: string, messageId: string, addId: string, removeId: string) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addLabelIds: [addId], removeLabelIds: [removeId] }),
    },
  );
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

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = await getGmailAccessToken();
  const toParseId = await ensureLabel(token, TO_PARSE_LABEL);
  const parsedId = await ensureLabel(token, PARSED_LABEL);
  const failedId = await ensureLabel(token, FAILED_LABEL);

  const messageIds = await listMessages(token, toParseId);
  const summary = {
    found: messageIds.length,
    parsed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as any[],
  };

  for (const messageId of messageIds) {
    try {
      const { data: existing } = await supabase
        .from('supplier_documents')
        .select('id')
        .eq('gmail_message_id', messageId)
        .maybeSingle();
      if (existing) {
        await relabel(token, messageId, parsedId, toParseId);
        summary.skipped++;
        continue;
      }

      const message = await getMessage(token, messageId);
      const pdfs = findPdfAttachments(message);
      if (pdfs.length === 0) {
        summary.errors.push({ messageId, error: 'no PDF attachment' });
        await relabel(token, messageId, failedId, toParseId);
        summary.failed++;
        continue;
      }

      let anyOk = false;
      for (const pdf of pdfs) {
        const pdfBase64Url = await getAttachment(token, messageId, pdf.attachmentId);
        let parsed: any;
        try {
          parsed = await callGemini(pdfBase64Url);
        } catch (err: any) {
          summary.errors.push({ messageId, filename: pdf.filename, error: err.message });
          continue;
        }

        const pdfBuffer = Buffer.from(
          pdfBase64Url.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        );
        const storagePath = `${new Date().toISOString().slice(0, 7)}/${messageId}_${pdf.filename}`;
        await supabase.storage
          .from('supplier_documents')
          .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        const { error: insertErr } = await supabase.from('supplier_documents').insert({
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
          continue;
        }

        anyOk = true;
        summary.parsed++;

        const tg = [
          `📄 <b>New supplier doc parsed</b>`,
          `<b>Supplier:</b> ${parsed.supplier_name ?? 'Unknown'}`,
          `<b>Type:</b> ${parsed.document_type ?? '?'}`,
          `<b>Total PHP:</b> ${parsed.total_php ?? '?'}`,
          `<b>File:</b> ${pdf.filename}`,
        ].join('\n');
        await sendTelegram(tg);
      }

      await relabel(token, messageId, anyOk ? parsedId : failedId, toParseId);
      if (!anyOk) summary.failed++;
    } catch (err: any) {
      summary.errors.push({ messageId, error: err.message });
      summary.failed++;
    }
  }

  return NextResponse.json(summary);
}
