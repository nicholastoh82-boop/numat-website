// app/api/crm/send-quote/route.ts
//
// CRM-authenticated replacement for the disabled n8n send-quote webhook.
// Called directly from the CRM Send button. Uses Supabase session cookie auth.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { sendGmail, supabaseGetRaw, supabasePatch, supabasePost, type RepKey } from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type QuoteRow = {
  id: string; quote_number: string; doc_type: string | null; currency: string | null;
  display_currency: string | null; total: number | null; display_total: number | null;
  email: string | null; customer_name: string | null; lead_id: string | null;
  valid_until: string | null; payment_due_date: string | null;
  po_reference: string | null; generated_by: string | null;
};

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

async function isActiveCrmUser(userEmail: string): Promise<boolean> {
  const sc = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data } = await sc.from("crm_users").select("is_active").eq("email", userEmail).single();
  return Boolean(data?.is_active);
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!(await isActiveCrmUser(user.email))) return NextResponse.json({ ok: false, error: "CRM access denied" }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, error: "Auth error" }, { status: 401 });
  }

  let body: { quote_id?: string; recipient_email?: string; recipient_name?: string; sender_rep_email?: string; sent_by?: string; doc_type?: string; };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  if (!body.quote_id) return NextResponse.json({ ok: false, error: "Missing quote_id" }, { status: 400 });

  try {
    const quoteRows = await supabaseGetRaw<QuoteRow[]>(`quotes?id=eq.${encodeURIComponent(body.quote_id)}&select=*`);
    if (!quoteRows.length) return NextResponse.json({ ok: false, error: `Quote not found: ${body.quote_id}` }, { status: 404 });
    const quote = quoteRows[0];
    const recipientEmail = body.recipient_email || quote.email;
    const recipientName = body.recipient_name || quote.customer_name || "there";
    const senderRepEmail = body.sender_rep_email || quote.generated_by || "nick@numat.ph";
    if (!recipientEmail) return NextResponse.json({ ok: false, error: "No recipient email — set one via the pencil icon next to the document" }, { status: 400 });

    const quoteSecret = process.env.QUOTE_PDF_SECRET;
    const pdfRes = await fetch(`https://numatbamboo.com/api/quote/${encodeURIComponent(quote.id)}/pdf`, {
      headers: quoteSecret ? { "x-quote-secret": quoteSecret } : {}
    });
    if (!pdfRes.ok) throw new Error(`PDF generation failed: ${pdfRes.status} ${await pdfRes.text()}`);
    const pdfArrayBuffer = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfArrayBuffer).toString("base64");

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const storagePath = `quote-pdfs/${quote.quote_number}.pdf`;
    try {
      await fetch(`${supabaseUrl}/storage/v1/object/${storagePath}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: pdfArrayBuffer,
      });
    } catch (err) { console.warn("PDF storage non-fatal:", err); }

    const isInvoice = quote.doc_type === "invoice";
    const displayCurrency = (quote.display_currency ?? quote.currency ?? "USD").toUpperCase();
    const displayTotalNum = Number(quote.display_total ?? quote.total ?? 0);
    const zeroDecimal = ["JPY","KRW","VND","IDR","CLP","COP","HUF","PKR","NGN"];
    const totalFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: zeroDecimal.includes(displayCurrency)?0:2, maximumFractionDigits: zeroDecimal.includes(displayCurrency)?0:2 }).format(displayTotalNum);
    const totalDisplay = `${displayCurrency} ${totalFmt}`;
    const docLabel = isInvoice ? "Invoice" : "Proforma Invoice";
    const subject = `${docLabel} ${quote.quote_number} from NUMAT`;
    const dateValue = (isInvoice ? fmtDate(quote.payment_due_date) : fmtDate(quote.valid_until)) || "to be confirmed";
    const poLine = isInvoice && quote.po_reference ? `<li>PO reference: <strong>${quote.po_reference}</strong></li>` : "";
    const introLine = isInvoice
      ? `Please find invoice <strong>${quote.quote_number}</strong> attached as a PDF.`
      : `Thank you for your interest in NUMAT engineered bamboo. Please find your proforma invoice <strong>${quote.quote_number}</strong> attached as a PDF.`;
    const closingLine = isInvoice
      ? "Please settle this invoice by the due date. Bank and payment details are included in the attached PDF."
      : "If you would like to proceed, please reply to confirm your order and we will issue a deposit invoice and begin production scheduling.";

    const html = [
      '<div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #0F1F14; max-width: 600px; line-height: 1.55;">',
      `<p>Hi ${recipientName},</p>`,
      `<p>${introLine}</p>`,
      "<p><strong>Key details:</strong></p>",
      '<ul style="padding-left: 20px;">',
      `<li>${isInvoice ? "Invoice" : "Proforma"} number: <strong>${quote.quote_number}</strong></li>`,
      `<li>${isInvoice ? "Amount due" : "Total"}: <strong>${totalDisplay}</strong></li>`,
      `<li>${isInvoice ? "Payment due" : "Valid until"}: <strong>${dateValue}</strong></li>`,
      poLine, "</ul>",
      `<p>${closingLine}</p>`,
      '<p style="margin-top: 24px;">Best regards,<br/>',
      "<strong>NUMAT Sustainable Manufacturing</strong><br/>",
      '<span style="color: #8A958D; font-size: 12px;">sales@numat.ph \u00b7 numatbamboo.com</span></p>',
      "</div>",
    ].join("");

    const repKey = repKeyFromEmail(senderRepEmail);
    const gmailMessageId = await sendGmail({
      from: repKey, to: recipientEmail, subject, html,
      attachments: [{ filename: `${quote.quote_number}.pdf`, mimeType: "application/pdf", data: pdfBase64 }],
    });

    const nowIso = new Date().toISOString();
    await supabasePatch(`quotes?id=eq.${encodeURIComponent(quote.id)}`, { status: "sent", sent_at: nowIso, sent_by: senderRepEmail });

    try {
      const leadIdFilter = quote.lead_id
        ? `or=(id.eq.${encodeURIComponent(quote.lead_id)},email.eq.${encodeURIComponent(recipientEmail)})`
        : `email=eq.${encodeURIComponent(recipientEmail)}`;
      await supabasePatch(`master_leads?${leadIdFilter}`, {
        quoted_at: nowIso, pipeline_stage: "proposal_sent", last_activity_at: nowIso,
        last_activity_type: "quote_sent", quote_currency: displayCurrency,
        quote_notes: `${docLabel} ${quote.quote_number} sent via CRM`,
      });
    } catch (err) { console.error("lead update non-fatal:", err); }

    try {
      await supabasePost("sales_activities", {
        lead_id: quote.lead_id, activity_type: "quote_sent", actor: body.sent_by || senderRepEmail,
        payload: { quote_id: quote.id, quote_number: quote.quote_number, recipient_email: recipientEmail,
          total: displayTotalNum, currency: displayCurrency, pdf_url: `${supabaseUrl}/storage/v1/object/public/${storagePath}`, gmail_message_id: gmailMessageId },
      });
    } catch (err) { console.error("activity log non-fatal:", err); }

    return NextResponse.json({ ok: true, success: true, quote_number: quote.quote_number, sent_to: recipientEmail, sent_from: senderRepEmail });
  } catch (err) {
    console.error("crm/send-quote error:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
