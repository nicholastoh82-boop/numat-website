// app/api/receipt/preview-email/route.ts
//
// Returns the default subject + HTML body the system would send for a
// given receipt. Used to pre-fill the Edit Email modal in the CRM
// dashboard so reps can review and tweak before sending.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseGetRaw } from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReceiptRow = {
  id: string; receipt_number: string; quote_id: string;
  actual_amount: number | string; actual_currency: string | null;
  display_amount: number | string | null; display_currency: string | null;
  actual_date: string; payment_method: string; bank_reference: string | null;
};

type InvoiceRow = {
  id: string; quote_number: string; email: string | null;
  customer_name: string | null; lead_id: string | null;
  generated_by: string | null; payment_status: string | null;
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return "the date of payment";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "the date of payment";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  const zeroDecimal = ["JPY", "KRW", "VND", "IDR", "CLP", "COP", "HUF", "PKR", "NGN"];
  const fractionDigits = zeroDecimal.includes(currency) ? 0 : 2;
  return `${currency} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(safe)}`;
}

function methodLabel(m: string | null): string {
  if (!m) return "payment";
  const map: Record<string, string> = {
    wire_transfer: "wire transfer", bank_deposit: "bank deposit", check: "check",
    gcash: "GCash", paymaya: "PayMaya", cash: "cash", other: "payment",
  };
  return map[m] || "payment";
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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user?.email) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!(await isActiveCrmUser(user.email))) return NextResponse.json({ ok: false, error: "CRM access denied" }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, error: "Auth error" }, { status: 401 });
  }

  let body: { receipt_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }
  if (!body.receipt_id) return NextResponse.json({ ok: false, error: "Missing receipt_id" }, { status: 400 });

  try {
    const receiptRows = await supabaseGetRaw<ReceiptRow[]>(`receipts?id=eq.${encodeURIComponent(body.receipt_id)}&select=*`);
    if (!receiptRows.length) return NextResponse.json({ ok: false, error: `Receipt not found` }, { status: 404 });
    const receipt = receiptRows[0];

    const invoiceRows = await supabaseGetRaw<InvoiceRow[]>(`quotes?id=eq.${encodeURIComponent(receipt.quote_id)}&select=*`);
    if (!invoiceRows.length) return NextResponse.json({ ok: false, error: "Linked invoice not found" }, { status: 404 });
    const invoice = invoiceRows[0];

    const recipientName = invoice.customer_name || "there";
    const displayCurrency = (receipt.display_currency || receipt.actual_currency || "PHP").toUpperCase();
    const displayAmount = Number(receipt.display_amount ?? receipt.actual_amount ?? 0);
    const totalDisplay = fmtMoney(displayAmount, displayCurrency);
    const paymentDate = fmtDate(receipt.actual_date);
    const method = methodLabel(receipt.payment_method);
    const bankRef = receipt.bank_reference ? ` (reference ${receipt.bank_reference})` : "";
    const isPaidInFull = invoice.payment_status === "paid";

    const subject = `Payment Receipt ${receipt.receipt_number} from NUMAT`;
    const closingLine = isPaidInFull
      ? `This invoice is now <strong>fully settled</strong>. We appreciate your prompt payment.`
      : `This is a partial payment acknowledgment against invoice <strong>${invoice.quote_number}</strong>. Further receipts will follow as additional payments are received.`;

    const html = [
      '<div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #0F1F14; max-width: 600px; line-height: 1.55;">',
      `<p>Hi ${recipientName},</p>`,
      `<p>Thank you for your ${method}${bankRef}. Please find your payment receipt <strong>${receipt.receipt_number}</strong> attached as a PDF.</p>`,
      "<p><strong>Payment details:</strong></p>",
      '<ul style="padding-left: 20px;">',
      `<li>Receipt number: <strong>${receipt.receipt_number}</strong></li>`,
      `<li>Amount acknowledged: <strong>${totalDisplay}</strong></li>`,
      `<li>Payment date: <strong>${paymentDate}</strong></li>`,
      `<li>Against invoice: <strong>${invoice.quote_number}</strong></li>`,
      "</ul>",
      `<p>${closingLine}</p>`,
      '<p style="margin-top: 24px;">Best regards,<br/>',
      "<strong>NUMAT Sustainable Manufacturing</strong><br/>",
      '<span style="color: #8A958D; font-size: 12px;">sales@numat.ph \u00b7 numatbamboo.com</span></p>',
      '<p style="color: #8A958D; font-size: 11px; margin-top: 16px;">Note: this document is a commercial payment acknowledgment. It is not a BIR Official Receipt.</p>',
      "</div>",
    ].join("");

    return NextResponse.json({
      ok: true,
      subject,
      html,
      recipient_email: invoice.email || "",
      recipient_name: recipientName,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
