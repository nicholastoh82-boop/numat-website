// app/api/webhooks/send-quote/route.ts
//
// Send Quote webhook. Replaces n8n NUMAT — Send Quote (CRM webhook).
// Receives { quote_id, recipient_email?, recipient_name?, sender_rep_email?,
// doc_type? } from the CRM Send Quote button. Fetches the quote record,
// generates the PDF via the existing /api/quote/{id}/pdf endpoint, uploads
// the PDF to Supabase storage for archival, sends the email from the
// specified rep's inbox with the PDF attached, and logs activity.

import { required, sendGmail, supabaseGetRaw, supabasePatch, supabasePost, type RepKey } from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SendQuoteBody = {
  quote_id?: string;
  quote_number?: string;
  recipient_email?: string;
  recipient_name?: string;
  sent_by?: string;
  sender_rep_email?: string;
  doc_type?: string;
};

type QuoteRow = {
  id: string;
  quote_number: string;
  doc_type: string | null;
  currency: string | null;
  display_currency: string | null;
  total: number | null;
  display_total: number | null;
  email: string | null;
  customer_name: string | null;
  lead_id: string | null;
  valid_until: string | null;
  payment_due_date: string | null;
  po_reference: string | null;
  generated_by: string | null;
};

function authorized(req: Request): boolean {
  const secret = process.env.SEND_QUOTE_WEBHOOK_SECRET;
  if (!secret) return true;
  const provided = req.headers.get("x-send-quote-secret") ?? "";
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  return mismatch === 0;
}

function fmtDate(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function repKeyFromEmail(email: string | null | undefined): RepKey {
  const e = (email ?? "").toLowerCase();
  if (e.includes("bryan")) return "Bryan";
  if (e.includes("mohan")) return "Mohan";
  return "Nick";
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  let body: SendQuoteBody;
  try {
    body = (await req.json()) as SendQuoteBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.quote_id) {
    return Response.json({ ok: false, error: "Missing quote_id" }, { status: 400 });
  }

  try {
    // 1. Fetch the quote
    const quoteRows = await supabaseGetRaw<QuoteRow[]>(
      `quotes?id=eq.${encodeURIComponent(body.quote_id)}&select=*`
    );
    if (!quoteRows.length) {
      return Response.json({ ok: false, error: `Quote not found: ${body.quote_id}` }, { status: 404 });
    }
    const quote = quoteRows[0];
    const recipientEmail = body.recipient_email || quote.email;
    const recipientName = body.recipient_name || quote.customer_name || "there";
    const senderRepEmail = body.sender_rep_email || quote.generated_by || "nick@numat.ph";
    if (!recipientEmail) {
      return Response.json({ ok: false, error: "Quote has no recipient email" }, { status: 400 });
    }

    // 2. Generate PDF (existing Next.js endpoint, same deployment)
    const pdfRes = await fetch(`https://numatbamboo.com/api/quote/${encodeURIComponent(quote.id)}/pdf`);
    if (!pdfRes.ok) {
      throw new Error(`PDF generation failed: ${pdfRes.status} ${await pdfRes.text()}`);
    }
    const pdfArrayBuffer = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfArrayBuffer).toString("base64");

    // 3. Upload PDF to Supabase storage for archival (best-effort, non-blocking)
    const supabaseUrl = required("SUPABASE_URL");
    const supabaseKey = required("SUPABASE_SERVICE_ROLE_KEY");
    const storagePath = `quote-pdfs/${quote.quote_number}.pdf`;
    const publicPdfUrl = `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
    try {
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${storagePath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/pdf",
          "x-upsert": "true",
        },
        body: pdfArrayBuffer,
      });
      if (!uploadRes.ok) {
        console.warn(`PDF storage upload failed (non-fatal): ${uploadRes.status} ${await uploadRes.text()}`);
      }
    } catch (err) {
      console.warn("PDF storage upload failed (non-fatal):", err);
    }

    // 4. Build email context
    const isInvoice = quote.doc_type === "invoice";
    const displayCurrency = (quote.display_currency ?? quote.currency ?? "USD").toUpperCase();
    const displayTotalNum = Number(quote.display_total ?? quote.total ?? 0);
    const zeroDecimal = ["JPY", "KRW", "VND", "IDR", "CLP", "COP", "HUF", "PKR", "NGN"];
    const isZero = zeroDecimal.includes(displayCurrency);
    const totalFmt = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: isZero ? 0 : 2,
      maximumFractionDigits: isZero ? 0 : 2,
    }).format(displayTotalNum);
    const totalDisplay = `${displayCurrency} ${totalFmt}`;

    const validUntil = fmtDate(quote.valid_until);
    const paymentDue = fmtDate(quote.payment_due_date);

    const numberLabel = isInvoice ? "Invoice number" : "Proforma number";
    const totalLabel = isInvoice ? "Amount due" : "Total";
    const dateLabel = isInvoice ? "Payment due" : "Valid until";
    const dateValue = (isInvoice ? paymentDue : validUntil) || "to be confirmed";

    const docLabel = isInvoice ? "Invoice" : "Proforma Invoice";
    const subject = `${docLabel} ${quote.quote_number} from NUMAT`;

    const poLine = isInvoice && quote.po_reference
      ? `<li>PO reference: <strong>${quote.po_reference}</strong></li>`
      : "";
    const introLine = isInvoice
      ? `Please find invoice <strong>${quote.quote_number}</strong> attached as a PDF.`
      : `Thank you for your interest in NUMAT engineered bamboo. Please find your proforma invoice <strong>${quote.quote_number}</strong> attached as a PDF.`;
    const closingLine = isInvoice
      ? "Please settle this invoice by the due date. Bank and payment details are included in the attached PDF."
      : "If you would like to proceed, please reply to this email to confirm your order. Upon confirmation, we will issue an invoice for the 50 percent deposit payment and begin production scheduling.";

    const html = [
      '<div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #0F1F14; max-width: 600px; line-height: 1.55;">',
      `<p>Hi ${recipientName},</p>`,
      `<p>${introLine}</p>`,
      "<p><strong>Key details at a glance:</strong></p>",
      '<ul style="padding-left: 20px;">',
      `<li>${numberLabel}: <strong>${quote.quote_number}</strong></li>`,
      `<li>${totalLabel}: <strong>${totalDisplay}</strong></li>`,
      `<li>${dateLabel}: <strong>${dateValue}</strong></li>`,
      poLine,
      "</ul>",
      `<p>${closingLine}</p>`,
      '<p style="margin-top: 24px;">',
      "Best regards,<br/>",
      "<strong>NUMAT Sustainable Manufacturing</strong><br/>",
      '<span style="color: #8A958D; font-size: 12px;">sales@numat.ph \u00b7 numatbamboo.com</span>',
      "</p>",
      "</div>",
    ].join("");

    // 5. Send the email from the correct rep's inbox
    const repKey = repKeyFromEmail(senderRepEmail);
    const gmailMessageId = await sendGmail({
      from: repKey,
      to: recipientEmail,
      subject,
      html,
      attachments: [
        {
          filename: `${quote.quote_number}.pdf`,
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      ],
    });

    // 6. Update quote.status = 'sent', sent_at, sent_by
    const nowIso = new Date().toISOString();
    try {
      await supabasePatch(`quotes?id=eq.${encodeURIComponent(quote.id)}`, {
        status: "sent",
        sent_at: nowIso,
        sent_by: senderRepEmail,
      });
    } catch (err) {
      console.error("quotes update failed:", err);
    }

    // 7. Update linked lead (by lead_id or by email)
    try {
      const leadIdFilter = quote.lead_id
        ? `or=(id.eq.${encodeURIComponent(quote.lead_id)},email.eq.${encodeURIComponent(recipientEmail)})`
        : `email=eq.${encodeURIComponent(recipientEmail)}`;
      await supabasePatch(`master_leads?${leadIdFilter}`, {
        quoted_at: nowIso,
        pipeline_stage: "proposal_sent",
        last_activity_at: nowIso,
        last_activity_type: "quote_sent",
        quote_currency: displayCurrency,
        quote_notes: `Quote ${quote.quote_number} sent via automation`,
      });
    } catch (err) {
      console.error("master_leads update failed:", err);
    }

    // 8. Log sales activity
    try {
      await supabasePost("sales_activities", {
        lead_id: quote.lead_id,
        activity_type: "quote_sent",
        actor: "send_quote_workflow",
        payload: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          total: displayTotalNum,
          currency: displayCurrency,
          pdf_url: publicPdfUrl,
          gmail_message_id: gmailMessageId,
        },
      });
    } catch (err) {
      console.error("sales_activities log failed:", err);
    }

    return Response.json({
      ok: true,
      success: true,
      quote_number: quote.quote_number,
      pdf_url: publicPdfUrl,
      sent_to: recipientEmail,
      sent_from: senderRepEmail,
      gmail_message_id: gmailMessageId,
    });
  } catch (err) {
    console.error("send-quote error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-send-quote-secret",
    },
  });
}

export async function GET() {
  return new Response("This endpoint accepts POST only.", { status: 405, headers: { Allow: "POST" } });
}