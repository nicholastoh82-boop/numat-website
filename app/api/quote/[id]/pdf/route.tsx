// ============================================================================
// File path in your repo: app/api/quote/[id]/pdf/route.tsx
// (App Router — Next.js 13+)
//
// Env vars required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   QUOTE_PDF_SECRET (n8n sends this in the x-quote-secret header)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

// ---------- NUMAT brand colors ----------
const COLORS = {
  green: "#2F5D3A",
  greenLight: "#4A7856",
  greenPale: "#F0F6F1",
  ink: "#0F1F14",
  body: "#3C4A40",
  muted: "#8A958D",
  line: "#E4EAE5",
  white: "#FFFFFF",
};

// Truly transparent NUMAT logo (RGBA with alpha channel). Served from Next.js /public.
const LOGO_URL = "https://numatbamboo.com/logo.png";

// ---------- Rep directory: email to display name for Issued by ----------
const REP_DIRECTORY: Record<string, string> = {
  "nick@numat.ph": "Nicholas Toh",
  "mohan@numat.ph": "Mohan Louis",
  "bryan@numat.ph": "Bryan",
  "lemuelaseniero@numat.ph": "Lemuel Aseniero",
  "sales@numat.ph": "NUMAT Sales Team",
};

function repDisplayName(email: string | null | undefined): string {
  if (!email) return "NUMAT Sales Team";
  const e = email.toLowerCase().trim();
  if (REP_DIRECTORY[e]) return REP_DIRECTORY[e];
  const local = e.split("@")[0] || "";
  return local
    .split(/[._\-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ") || "NUMAT Sales Team";
}

// ---------- Country to currency mapping ----------
// Base quote currency is USD. Display currency is derived from the lead's country.
type CurrencyEntry = { currency: string; ratePerUsd: number };

const COUNTRY_CURRENCY: Record<string, CurrencyEntry> = {
  philippines: { currency: "PHP", ratePerUsd: 56 },
  "the philippines": { currency: "PHP", ratePerUsd: 56 },
  ph: { currency: "PHP", ratePerUsd: 56 },
  malaysia: { currency: "MYR", ratePerUsd: 4.7 },
  my: { currency: "MYR", ratePerUsd: 4.7 },
  singapore: { currency: "SGD", ratePerUsd: 1.35 },
  sg: { currency: "SGD", ratePerUsd: 1.35 },
  indonesia: { currency: "IDR", ratePerUsd: 16000 },
  "republic of indonesia": { currency: "IDR", ratePerUsd: 16000 },
  id: { currency: "IDR", ratePerUsd: 16000 },
  thailand: { currency: "THB", ratePerUsd: 36 },
  th: { currency: "THB", ratePerUsd: 36 },
  vietnam: { currency: "VND", ratePerUsd: 25000 },
  vn: { currency: "VND", ratePerUsd: 25000 },
  japan: { currency: "JPY", ratePerUsd: 150 },
  jp: { currency: "JPY", ratePerUsd: 150 },
  china: { currency: "CNY", ratePerUsd: 7.24 },
  cn: { currency: "CNY", ratePerUsd: 7.24 },
  "hong kong": { currency: "HKD", ratePerUsd: 7.8 },
  hk: { currency: "HKD", ratePerUsd: 7.8 },
  taiwan: { currency: "TWD", ratePerUsd: 32 },
  tw: { currency: "TWD", ratePerUsd: 32 },
  "south korea": { currency: "KRW", ratePerUsd: 1380 },
  korea: { currency: "KRW", ratePerUsd: 1380 },
  kr: { currency: "KRW", ratePerUsd: 1380 },
  india: { currency: "INR", ratePerUsd: 83 },
  in: { currency: "INR", ratePerUsd: 83 },
  pakistan: { currency: "PKR", ratePerUsd: 280 },
  australia: { currency: "AUD", ratePerUsd: 1.52 },
  au: { currency: "AUD", ratePerUsd: 1.52 },
  "new zealand": { currency: "NZD", ratePerUsd: 1.66 },
  nz: { currency: "NZD", ratePerUsd: 1.66 },
  "united arab emirates": { currency: "AED", ratePerUsd: 3.67 },
  uae: { currency: "AED", ratePerUsd: 3.67 },
  ae: { currency: "AED", ratePerUsd: 3.67 },
  "saudi arabia": { currency: "SAR", ratePerUsd: 3.75 },
  sa: { currency: "SAR", ratePerUsd: 3.75 },
  qatar: { currency: "QAR", ratePerUsd: 3.64 },
  qa: { currency: "QAR", ratePerUsd: 3.64 },
  kuwait: { currency: "KWD", ratePerUsd: 0.31 },
  kw: { currency: "KWD", ratePerUsd: 0.31 },
  bahrain: { currency: "BHD", ratePerUsd: 0.38 },
  oman: { currency: "OMR", ratePerUsd: 0.38 },
  turkey: { currency: "TRY", ratePerUsd: 34 },
  tr: { currency: "TRY", ratePerUsd: 34 },
  israel: { currency: "ILS", ratePerUsd: 3.7 },
  "united states": { currency: "USD", ratePerUsd: 1 },
  "united states of america": { currency: "USD", ratePerUsd: 1 },
  usa: { currency: "USD", ratePerUsd: 1 },
  us: { currency: "USD", ratePerUsd: 1 },
  america: { currency: "USD", ratePerUsd: 1 },
  canada: { currency: "CAD", ratePerUsd: 1.37 },
  ca: { currency: "CAD", ratePerUsd: 1.37 },
  mexico: { currency: "MXN", ratePerUsd: 17 },
  mx: { currency: "MXN", ratePerUsd: 17 },
  brazil: { currency: "BRL", ratePerUsd: 5.1 },
  br: { currency: "BRL", ratePerUsd: 5.1 },
  argentina: { currency: "ARS", ratePerUsd: 950 },
  chile: { currency: "CLP", ratePerUsd: 950 },
  colombia: { currency: "COP", ratePerUsd: 4000 },
  "european union": { currency: "EUR", ratePerUsd: 0.92 },
  eu: { currency: "EUR", ratePerUsd: 0.92 },
  europe: { currency: "EUR", ratePerUsd: 0.92 },
  germany: { currency: "EUR", ratePerUsd: 0.92 },
  france: { currency: "EUR", ratePerUsd: 0.92 },
  italy: { currency: "EUR", ratePerUsd: 0.92 },
  spain: { currency: "EUR", ratePerUsd: 0.92 },
  netherlands: { currency: "EUR", ratePerUsd: 0.92 },
  belgium: { currency: "EUR", ratePerUsd: 0.92 },
  austria: { currency: "EUR", ratePerUsd: 0.92 },
  portugal: { currency: "EUR", ratePerUsd: 0.92 },
  ireland: { currency: "EUR", ratePerUsd: 0.92 },
  greece: { currency: "EUR", ratePerUsd: 0.92 },
  slovakia: { currency: "EUR", ratePerUsd: 0.92 },
  slovenia: { currency: "EUR", ratePerUsd: 0.92 },
  finland: { currency: "EUR", ratePerUsd: 0.92 },
  estonia: { currency: "EUR", ratePerUsd: 0.92 },
  latvia: { currency: "EUR", ratePerUsd: 0.92 },
  lithuania: { currency: "EUR", ratePerUsd: 0.92 },
  luxembourg: { currency: "EUR", ratePerUsd: 0.92 },
  malta: { currency: "EUR", ratePerUsd: 0.92 },
  cyprus: { currency: "EUR", ratePerUsd: 0.92 },
  croatia: { currency: "EUR", ratePerUsd: 0.92 },
  "united kingdom": { currency: "GBP", ratePerUsd: 0.79 },
  uk: { currency: "GBP", ratePerUsd: 0.79 },
  "great britain": { currency: "GBP", ratePerUsd: 0.79 },
  britain: { currency: "GBP", ratePerUsd: 0.79 },
  england: { currency: "GBP", ratePerUsd: 0.79 },
  switzerland: { currency: "CHF", ratePerUsd: 0.91 },
  ch: { currency: "CHF", ratePerUsd: 0.91 },
  sweden: { currency: "SEK", ratePerUsd: 10.5 },
  norway: { currency: "NOK", ratePerUsd: 10.8 },
  denmark: { currency: "DKK", ratePerUsd: 6.8 },
  poland: { currency: "PLN", ratePerUsd: 3.95 },
  "czech republic": { currency: "CZK", ratePerUsd: 23 },
  czechia: { currency: "CZK", ratePerUsd: 23 },
  hungary: { currency: "HUF", ratePerUsd: 355 },
  romania: { currency: "RON", ratePerUsd: 4.55 },
  bulgaria: { currency: "BGN", ratePerUsd: 1.8 },
  "south africa": { currency: "ZAR", ratePerUsd: 18.5 },
  za: { currency: "ZAR", ratePerUsd: 18.5 },
  egypt: { currency: "EGP", ratePerUsd: 48 },
  nigeria: { currency: "NGN", ratePerUsd: 1500 },
  kenya: { currency: "KES", ratePerUsd: 130 },
  morocco: { currency: "MAD", ratePerUsd: 10 },
};

function resolveDisplayCurrency(country: string | null | undefined): CurrencyEntry {
  if (!country) return { currency: "USD", ratePerUsd: 1 };
  const key = country.toLowerCase().trim();
  if (COUNTRY_CURRENCY[key]) return COUNTRY_CURRENCY[key];
  const stripped = key.replace(/[\.,;:()]/g, "").trim();
  if (COUNTRY_CURRENCY[stripped]) return COUNTRY_CURRENCY[stripped];
  return { currency: "USD", ratePerUsd: 1 };
}

// Fetch a live USD->currency rate from Frankfurter (same source the website's
// /api/exchange-rate endpoint uses). Falls back to the hardcoded rate if the
// network call fails, the currency is unsupported, or the response is invalid.
// This keeps proforma/invoice totals aligned with the prices customers see
// on numatbamboo.com (which also reads from Frankfurter).
async function fetchLiveRate(currency: string, fallbackRate: number): Promise<{ rate: number; source: string }> {
  if (!currency || currency === "USD") return { rate: 1, source: "usd" };
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v2/rate/USD/${encodeURIComponent(currency)}`,
      { cache: "no-store", headers: { Accept: "application/json" } },
    );
    if (!res.ok) return { rate: fallbackRate, source: "fallback" };
    const data = await res.json();
    const rate =
      typeof data?.rate === "number" && Number.isFinite(data.rate) && data.rate > 0
        ? data.rate
        : null;
    if (!rate) return { rate: fallbackRate, source: "fallback" };
    return { rate, source: "frankfurter" };
  } catch {
    return { rate: fallbackRate, source: "fallback" };
  }
}

// ---------- PDF styles ----------
const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    color: COLORS.ink,
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerLeft: { flex: 1 },
  logo: { width: 130, height: 42, objectFit: "contain" },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
    letterSpacing: 1,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  quoteNumber: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
  },

  supersedesRow: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    fontFamily: "Helvetica-Oblique",
  },

  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  col: { flex: 1 },
  colSpacer: { width: 20 },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  bodyText: { fontSize: 10, color: COLORS.ink, marginBottom: 2 },
  bodyBold: {
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  repName: {
    fontSize: 11,
    color: COLORS.green,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  repEmail: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 6,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.green,
    color: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  tableRowAlt: { backgroundColor: COLORS.greenPale },
  cellProduct: { flex: 3 },
  cellQty: { flex: 1, textAlign: "right" },
  cellUnit: { flex: 1.2, textAlign: "right" },
  cellTotal: { flex: 1.3, textAlign: "right" },
  productName: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COLORS.ink, marginBottom: 2 },
  productSpec: { fontSize: 8, color: COLORS.muted },

  totalsBox: {
    marginTop: 16,
    alignSelf: "flex-end",
    width: 240,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.green,
    paddingTop: 8,
    marginTop: 4,
  },
  totalsFinalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
  },
  totalsFinalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
  },

  terms: {
    marginTop: 32,
    padding: 16,
    backgroundColor: COLORS.greenPale,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green,
  },
  termsLabel: {
    fontSize: 9,
    color: COLORS.green,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 8,
  },

  // ---------- T&Cs page (proforma page 2) ----------
  termsPage: {
    backgroundColor: COLORS.white,
    color: COLORS.ink,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 8,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  termsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  termsLogo: { width: 90, height: 28, objectFit: "contain" },
  termsPageHeader: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  termsPageTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
    letterSpacing: 1,
    marginBottom: 8,
  },
  termsIntro: {
    fontSize: 8,
    color: COLORS.body,
    marginBottom: 8,
    lineHeight: 1.3,
  },
  termsClause: {
    fontSize: 8,
    color: COLORS.ink,
    marginBottom: 3,
    lineHeight: 1.3,
  },
  termsClauseBold: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
  },
  termsAcceptanceNote: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 8,
    color: COLORS.body,
    fontFamily: "Helvetica-Oblique",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  signatureBlock: {
    flex: 1,
    padding: 10,
    borderWidth: 0.5,
    borderColor: COLORS.line,
    borderRadius: 4,
    marginRight: 12,
  },
  signatureBlockRight: {
    flex: 1,
    padding: 10,
    borderWidth: 0.5,
    borderColor: COLORS.line,
    borderRadius: 4,
  },
  signatureHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signatureSubheader: {
    fontSize: 7,
    color: COLORS.muted,
    marginBottom: 10,
    fontFamily: "Helvetica-Oblique",
  },
  signatureLine: {
    fontSize: 8,
    marginBottom: 7,
    color: COLORS.ink,
  },
});

// ---------- Helpers ----------
function formatCurrency(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = isNaN(n) ? 0 : n;
  const zeroDecimal = ["JPY", "KRW", "VND", "IDR", "CLP", "COP", "HUF", "PKR", "NGN"];
  const isZeroDec = zeroDecimal.includes(currency);
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: isZeroDec ? 0 : 2,
    maximumFractionDigits: isZeroDec ? 0 : 2,
  });
  return `${currency} ${formatter.format(safe)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------- Terms and Conditions (proforma page 2) ----------
const TERMS_INTRO =
  "These Terms and Conditions form part of every transaction with NUMAT Sustainable Manufacturing Inc. (\"NUMAT\") and shall prevail over any inconsistent customer terms unless expressly accepted by NUMAT in writing.";

const TERMS_ACCEPTANCE_NOTE =
  "By signing below, the Customer confirms that it has read, understood, and agrees to these Terms and Conditions, and that the signatory is duly authorized to bind the Customer.";

const TERMS_CLAUSES: Array<{ title: string; body: string }> = [
  {
    title: "Acceptance.",
    body: "The Customer accepts these Terms by issuing a purchase order, paying any deposit or invoice amount, confirming the order, accepting delivery, or allowing production, mobilization, or installation to proceed.",
  },
  {
    title: "Scope and Pricing.",
    body: "Only the goods and services expressly stated in NUMAT's quotation or invoice are included. Any change in quantity, dimensions, finish, scope, taxes, freight, site conditions, or timing may be repriced by NUMAT.",
  },
  {
    title: "Payment.",
    body: "Payment shall be strictly in accordance with the quotation or invoice. Unless NUMAT grants written credit approval, orders may be treated as prepaid, and NUMAT may require full payment before production, release, delivery, turnover, or completion. Payments shall be made in full without set-off, deduction, backcharge, or withholding, except where required by law.",
  },
  {
    title: "Deposits and Cancellation.",
    body: "Deposits secure production capacity, procurement, scheduling, and commercial commitments and are non-refundable once materials are ordered or allocated, production or coating begins, delivery is booked, or manpower is scheduled. Custom, fabricated, coated, or specially procured items may not be cancelled without NUMAT's written consent.",
  },
  {
    title: "Late Payment and Default.",
    body: "Overdue balances shall incur 2 percent interest per month or the maximum lawful rate, whichever is lower. Upon default, NUMAT may suspend work, stop delivery, cancel undelivered portions, reallocate stock, refuse further orders, and declare all outstanding balances immediately due.",
  },
  {
    title: "Ownership and Risk.",
    body: "Title to goods remains with NUMAT until full and cleared payment is received. Risk of loss, damage, theft, breakage, deterioration, or site exposure passes to the Customer upon delivery, unloading, turnover to carrier, site placement, or any delay caused by the Customer.",
  },
  {
    title: "Delivery and Site Conditions.",
    body: "All schedules are estimates only. NUMAT shall not be liable for delays caused by force majeure, supplier issues, transport problems, permit issues, weather, site inaccessibility, unsafe conditions, measurement changes, or Customer-side delays. Standby time, repeat mobilization, failed delivery, and site-caused extra works shall be chargeable.",
  },
  {
    title: "Variations, Storage, and Extra Charges.",
    body: "Any change order, out-of-scope work, return trip, special handling, storage, re-delivery, demurrage, overtime, or remobilization required by the Customer or actual site conditions shall be billed separately.",
  },
  {
    title: "Inspection, Acceptance, and Warranty.",
    body: "The Customer must inspect immediately upon delivery or completion and notify NUMAT in writing within 72 hours of any visible shortage, defect, or damage; otherwise the goods and services are deemed accepted. Any warranty is limited to repair, replacement, or re-performance, at NUMAT's option, and excludes misuse, improper storage, unauthorized alteration, third-party handling, normal wear, and site or substrate defects.",
  },
  {
    title: "Liability, Collection, and Law.",
    body: "NUMAT shall not be liable for indirect, incidental, consequential, or lost-profit damages, and its total liability shall not exceed the amount actually paid for the affected goods or services. The Customer shall reimburse collection costs and reasonable legal fees. Philippine law shall govern, and exclusive venue shall be the proper courts of the Philippines.",
  },
];

// ---------- PDF Component ----------
type QuoteData = {
  quote_number: string;
  doc_type: string;
  customer_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  customer_tin: string | null;
  customer_address: string | null;
  currency: string;
  display_currency: string | null;
  subtotal: string | number;
  discount_amount: string | number | null;
  discount_percent: number | null;
  total: string | number;
  display_total: string | number | null;
  valid_until: string | null;
  payment_due_date: string | null;
  po_reference: string | null;
  payment_status: string | null;
  vat_enabled: boolean | null;
  vat_rate: string | number | null;
  vat_amount: string | number | null;
  notes: string | null;
  created_at: string;
  payment_terms: string | null;
  incoterms: string | null;
  generated_by: string | null;
  issued_by_name: string | null;
  issued_by_email: string | null;
  revision_of: string | null;
  revision_number: number | null;
  supersedes_quote_number: string | null;
  // Commit B: Invoice lifecycle
  invoice_type: "deposit" | "balance" | "full" | null;
  converted_from_proforma_id: string | null;
  parent_proforma_number: string | null;
  deposit_references: Array<{ quote_number: string; total: string | number }>;
  items: Array<{
    product_name: string;
    product_specs: string | null;
    quantity: number;
    unit: string | null;
    unit_price: string | number;
    total_price: string | number;
  }>;
};

const QuotePDF: React.FC<{ data: QuoteData }> = ({ data }) => {
  const isInvoice = data.doc_type === "invoice";
  // Commit B: branch the title by invoice_type
  //   deposit  -> "DEPOSIT INVOICE"   (partial payment against a proforma)
  //   balance  -> "FINAL INVOICE"     (remaining balance after deposit)
  //   full     -> "INVOICE"           (one-shot invoice converted from proforma)
  //   null     -> "INVOICE"           (standalone invoice, not converted)
  let docTitle = "PROFORMA INVOICE";
  if (isInvoice) {
    if (data.invoice_type === "deposit") docTitle = "DEPOSIT INVOICE";
    else if (data.invoice_type === "balance") docTitle = "FINAL INVOICE";
    else docTitle = "INVOICE";
  }

  const displayCurrency = data.display_currency || data.currency;
  const baseCurrency = data.currency;
  const useDisplay = data.display_total && displayCurrency !== baseCurrency;

  const subtotalValue = useDisplay
    ? parseFloat(String(data.display_total)) +
      parseFloat(String(data.discount_amount || 0)) *
        (parseFloat(String(data.display_total)) /
          parseFloat(String(data.total || 1)))
    : parseFloat(String(data.subtotal));

  const totalValue = useDisplay
    ? parseFloat(String(data.display_total))
    : parseFloat(String(data.total));

  const discountValue = parseFloat(String(data.discount_amount || 0));
  const currencyShown = useDisplay ? displayCurrency! : baseCurrency;

  const vatEnabled = Boolean(data.vat_enabled);
  const vatRate = parseFloat(String(data.vat_rate || 12));
  const vatAmount = vatEnabled
    ? (useDisplay
        ? parseFloat(String(data.vat_amount || 0)) * (totalValue / parseFloat(String(data.total || 1)))
        : parseFloat(String(data.vat_amount || 0)))
    : 0;
  const grandTotal = vatEnabled ? totalValue + vatAmount : totalValue;

  const paymentTerms =
    data.payment_terms ||
    (isInvoice
      ? "Net 30 days from invoice date."
      : "50 percent deposit on purchase order. 50 percent balance before shipment.");
  const incoterms = data.incoterms || "EXW Cagayan de Oro, Philippines.";

  const repName = data.issued_by_name || "NUMAT Sales Team";
  const repEmail = data.issued_by_email || data.generated_by || "sales@numat.ph";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{docTitle}</Text>
            <Text style={styles.quoteNumber}>{data.quote_number}</Text>
            {data.supersedes_quote_number ? (
              <Text style={styles.supersedesRow}>
                Revision {data.revision_number || 1} · supersedes {data.supersedes_quote_number}
              </Text>
            ) : null}
            {data.parent_proforma_number ? (
              <Text style={styles.supersedesRow}>
                Issued against Proforma Invoice {data.parent_proforma_number}
                {data.deposit_references && data.deposit_references.length > 0
                  ? ` · net of deposit ${data.deposit_references
                      .map((d) => d.quote_number)
                      .join(", ")}`
                  : ""}
              </Text>
            ) : null}
            {isInvoice && data.payment_status === "paid" ? (
              <Text style={{ ...styles.statusBadge, color: "#16A34A" }}>PAID</Text>
            ) : isInvoice && data.payment_status === "overdue" ? (
              <Text style={{ ...styles.statusBadge, color: "#DC2626" }}>OVERDUE</Text>
            ) : null}
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        {/* Meta grid */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>{isInvoice ? "Bill to" : "Prepared for"}</Text>
            <Text style={styles.bodyBold}>{data.customer_name}</Text>
            {data.company ? (
              <Text style={styles.bodyText}>{data.company}</Text>
            ) : null}
            {data.customer_address ? (
              <Text style={styles.bodyText}>{data.customer_address}</Text>
            ) : null}
            <Text style={styles.bodyText}>{data.email}</Text>
            {data.phone ? (
              <Text style={styles.bodyText}>{data.phone}</Text>
            ) : null}
            {isInvoice && data.customer_tin ? (
              <Text style={styles.bodyText}>TIN: {data.customer_tin}</Text>
            ) : null}
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Issued by</Text>
            <Text style={styles.repName}>{repName}</Text>
            <Text style={styles.repEmail}>{repEmail}</Text>
            <Text style={styles.bodyBold}>NUMAT Sustainable</Text>
            <Text style={styles.bodyBold}>Manufacturing Inc.</Text>
            <Text style={styles.bodyText}>Cagayan de Oro, Philippines</Text>
            <Text style={styles.bodyText}>numatbamboo.com</Text>
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Details</Text>
            <Text style={styles.bodyText}>
              Issue date: {formatDate(data.created_at)}
            </Text>
            {isInvoice ? (
              <>
                <Text style={styles.bodyText}>
                  Payment due: {formatDate(data.payment_due_date)}
                </Text>
                {data.po_reference ? (
                  <Text style={styles.bodyText}>PO ref: {data.po_reference}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.bodyText}>
                Valid until: {formatDate(data.valid_until)}
              </Text>
            )}
            <Text style={styles.bodyText}>Currency: {currencyShown}</Text>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={styles.cellProduct}>Product</Text>
          <Text style={styles.cellQty}>Qty</Text>
          <Text style={styles.cellUnit}>Unit Price</Text>
          <Text style={styles.cellTotal}>Line Total</Text>
        </View>

        {data.items.map((item, idx) => {
          const ratio = useDisplay
            ? parseFloat(String(data.display_total)) /
              parseFloat(String(data.total || 1))
            : 1;
          const unitPrice = parseFloat(String(item.unit_price)) * ratio;
          const lineTotal = parseFloat(String(item.total_price)) * ratio;
          return (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <View style={styles.cellProduct}>
                <Text style={styles.productName}>{item.product_name}</Text>
                {item.product_specs ? (
                  <Text style={styles.productSpec}>{item.product_specs}</Text>
                ) : null}
              </View>
              <Text style={styles.cellQty}>
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ""}
              </Text>
              <Text style={styles.cellUnit}>
                {formatCurrency(unitPrice, currencyShown)}
              </Text>
              <Text style={styles.cellTotal}>
                {formatCurrency(lineTotal, currencyShown)}
              </Text>
            </View>
          );
        })}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={{ color: COLORS.body }}>Subtotal</Text>
            <Text style={{ color: COLORS.ink }}>
              {formatCurrency(subtotalValue, currencyShown)}
            </Text>
          </View>
          {discountValue > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={{ color: COLORS.body }}>
                Discount{" "}
                {data.discount_percent ? `(${data.discount_percent}%)` : ""}
              </Text>
              <Text style={{ color: COLORS.ink }}>
                {formatCurrency(
                  useDisplay ? discountValue * (totalValue / parseFloat(String(data.total || 1))) : discountValue,
                  currencyShown,
                )}
              </Text>
            </View>
          ) : null}
          {vatEnabled ? (
            <>
              <View style={styles.totalsRow}>
                <Text style={{ color: COLORS.body }}>Subtotal (net of VAT)</Text>
                <Text style={{ color: COLORS.ink }}>
                  {formatCurrency(totalValue, currencyShown)}
                </Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={{ color: COLORS.body }}>VAT ({vatRate}%)</Text>
                <Text style={{ color: COLORS.ink }}>
                  {formatCurrency(vatAmount, currencyShown)}
                </Text>
              </View>
            </>
          ) : null}
          <View style={styles.totalsFinalRow}>
            <Text style={styles.totalsFinalLabel}>
              {isInvoice ? "AMOUNT DUE" : "TOTAL"}
            </Text>
            <Text style={styles.totalsFinalValue}>
              {formatCurrency(grandTotal, currencyShown)}
            </Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsLabel}>
            {isInvoice ? "Payment instructions" : "Terms and conditions"}
          </Text>
          <Text style={styles.bodyText}>
            Payment: {paymentTerms}
          </Text>
          <Text style={styles.bodyText}>Incoterms: {incoterms}</Text>
          {isInvoice ? (
            <>
              <Text style={styles.bodyText}>
                Bank: Rizal Commercial Banking Corporation (RCBC)
              </Text>
              <Text style={styles.bodyText}>
                Account Name: NUMAT Sustainable Manufacturing Inc.
              </Text>
              <Text style={styles.bodyText}>
                Account Type: Current Account (PHP)
              </Text>
              <Text style={styles.bodyText}>
                Account Number: 7591406069
              </Text>
              <Text style={styles.bodyText}>
                Please reference invoice number {data.quote_number} on all payments.
              </Text>
              <Text style={{ ...styles.bodyText, marginTop: 6, color: COLORS.muted, fontSize: 9, fontFamily: "Helvetica-Oblique" }}>
                This invoice is governed by the Terms and Conditions set out in the related Proforma Invoice accepted by the Customer.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.bodyText}>
                Validity: This proforma invoice is valid until{" "}
                {formatDate(data.valid_until)}.
              </Text>
              <Text style={styles.bodyText}>
                Lead time: Typically 4 to 6 weeks from receipt of deposit and
                confirmed specifications.
              </Text>
              <Text style={styles.bodyText}>
                This is a proforma invoice issued for proposal purposes. It is
                not a tax invoice and does not constitute a demand for payment.
              </Text>
              <Text style={{ ...styles.bodyText, marginTop: 6, color: COLORS.green, fontFamily: "Helvetica-Bold" }}>
                Full Terms and Conditions and signature page follow on page 2.
              </Text>
            </>
          )}
          {data.notes ? (
            <>
              <Text style={{ ...styles.termsLabel, marginTop: 10 }}>
                Additional notes
              </Text>
              <Text style={styles.bodyText}>{data.notes}</Text>
            </>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>NUMAT Sustainable Manufacturing Inc. · numatbamboo.com</Text>
          <Text>Engineered bamboo, built to outlast.</Text>
        </View>
      </Page>

      {/* ================================================================ */}
      {/* Page 2: Terms and Conditions + Signature block (proforma only)   */}
      {/* ================================================================ */}
      {!isInvoice ? (
        <Page size="A4" style={styles.termsPage}>
          <View style={styles.termsHeaderRow}>
            <Text style={styles.termsPageHeader}>
              Proforma Invoice {data.quote_number} · Terms and Conditions
            </Text>
            <Image src={LOGO_URL} style={styles.termsLogo} />
          </View>
          <Text style={styles.termsPageTitle}>Terms and Conditions</Text>
          <Text style={styles.termsIntro}>{TERMS_INTRO}</Text>

          {TERMS_CLAUSES.map((clause, idx) => (
            <Text key={idx} style={styles.termsClause}>
              <Text style={styles.termsClauseBold}>
                {idx + 1}. {clause.title}
              </Text>{" "}
              {clause.body}
            </Text>
          ))}

          <Text style={styles.termsAcceptanceNote}>{TERMS_ACCEPTANCE_NOTE}</Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureHeader}>Accepted for the Customer</Text>
              <Text style={styles.signatureSubheader}>
                Authorized signature over printed name
              </Text>
              <Text style={styles.signatureLine}>Name: ________________________</Text>
              <Text style={styles.signatureLine}>Position: _____________________</Text>
              <Text style={styles.signatureLine}>Date: _________________________</Text>
            </View>
            <View style={styles.signatureBlockRight}>
              <Text style={styles.signatureHeader}>
                For NUMAT Sustainable Manufacturing Inc.
              </Text>
              <Text style={styles.signatureSubheader}>
                Authorized signature over printed name
              </Text>
              <Text style={styles.signatureLine}>Name: ________________________</Text>
              <Text style={styles.signatureLine}>Position: _____________________</Text>
              <Text style={styles.signatureLine}>Date: _________________________</Text>
            </View>
          </View>

          <View style={styles.footer} fixed>
            <Text>NUMAT Sustainable Manufacturing Inc. · numatbamboo.com</Text>
            <Text>Engineered bamboo, built to outlast.</Text>
          </View>
        </Page>
      ) : null}
    </Document>
  );
};

// ---------- API Route Handler ----------
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check if the incoming request is from an authenticated CRM user (via Supabase session cookie).
// Used for in-browser Preview button. Falls back to x-quote-secret header for n8n backend.
async function isAuthenticatedCrmUser(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.email) return false;
    const serviceClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: crmUser } = await serviceClient
      .from("crm_users")
      .select("is_active")
      .eq("email", user.email)
      .single();
    return Boolean(crmUser?.is_active);
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth: allow either (a) x-quote-secret header from n8n, or (b) authenticated CRM user session
  const secret = req.headers.get("x-quote-secret");
  const isSecretValid = Boolean(secret && secret === process.env.QUOTE_PDF_SECRET);
  const isCrmUser = isSecretValid ? false : await isAuthenticatedCrmUser();
  if (!isSecretValid && !isCrmUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (qErr || !quote) {
    return NextResponse.json({ error: "quote not found" }, { status: 404 });
  }

  const { data: items, error: iErr } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("created_at", { ascending: true });

  if (iErr) {
    return NextResponse.json({ error: "items fetch failed" }, { status: 500 });
  }

  // Fetch the linked lead for country based currency derivation
  let leadCountry: string | null = null;
  if (quote.lead_id) {
    const { data: lead } = await supabase
      .from("master_leads")
      .select("country")
      .eq("id", quote.lead_id)
      .single();
    leadCountry = lead?.country ?? null;
  }

  // ==========================================================================
  // Currency + rate resolution with sent_at LOCKING
  //
  // Draft quotes (sent_at IS NULL): fetch a live FX rate from Frankfurter on
  //   every render and persist the computed display_total/display_currency +
  //   30-day default dates back to the quote row. The values stay in sync with
  //   the market until the rep actually sends the document to the customer.
  //
  // Sent quotes (sent_at IS NOT NULL): read the stored display_total +
  //   display_currency from the quote row as-is. No Frankfurter call. No DB
  //   write. No date mutation. This guarantees that a customer seeing a PDF
  //   labeled e.g. "Valid until 19 May 2026, PHP 38,624.00" today will see the
  //   exact same numbers if they re-open the PDF next week, regardless of FX
  //   movement. The rep must explicitly Revise the quote to regenerate numbers.
  // ==========================================================================
  const baseCurrency = (quote.currency || "USD").toUpperCase();
  const fx = resolveDisplayCurrency(leadCountry);
  const baseTotal = parseFloat(String(quote.total || 0));
  const isSent = Boolean(quote.sent_at);
  // Commit B: converted invoices (deposit/balance/full derived from a sent
  // proforma) inherit their display values from the parent proforma at
  // creation time and must NEVER refetch Frankfurter, even as drafts. The
  // parent proforma is already locked when the rep sent it, so this invoice
  // is bound to that same locked rate by contract.
  const isConvertedInvoice = Boolean(quote.converted_from_proforma_id);
  const useLockedDisplayValues = isSent || isConvertedInvoice;

  let computedDisplayTotal: number;
  let effectiveDisplayCurrency: string;

  if (useLockedDisplayValues) {
    // LOCKED path: use whatever was written when the quote was first rendered
    // while still a draft, or inherited from the parent proforma at creation.
    // If somehow display_total was never persisted (very old quote), fall
    // back to baseTotal in baseCurrency to avoid a crash.
    effectiveDisplayCurrency = (quote.display_currency || baseCurrency).toUpperCase();
    const storedTotal = parseFloat(String(quote.display_total || ""));
    computedDisplayTotal = Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : baseTotal;
    // Override fx.currency so downstream logic is consistent with stored values
    fx.currency = effectiveDisplayCurrency;
  } else {
    // DRAFT path: fetch live rate, recompute on every render
    effectiveDisplayCurrency = fx.currency;
    const { rate: liveRate } =
      fx.currency === baseCurrency
        ? { rate: 1 }
        : await fetchLiveRate(fx.currency, fx.ratePerUsd);
    computedDisplayTotal =
      fx.currency === baseCurrency ? baseTotal : baseTotal * liveRate;
  }

  // Rep attribution for "Issued by"
  const issuedByEmail = quote.generated_by || null;
  const issuedByName = repDisplayName(issuedByEmail);

  // If this is a revision, fetch the ancestor's quote_number for the "supersedes" line
  let supersedesQuoteNumber: string | null = null;
  if (quote.revision_of) {
    const { data: ancestor } = await supabase
      .from("quotes")
      .select("quote_number")
      .eq("id", quote.revision_of)
      .single();
    supersedesQuoteNumber = ancestor?.quote_number ?? null;
  }

  // Commit B: fetch parent proforma + deposit siblings for lineage rendering
  let parentProformaNumber: string | null = null;
  let depositReferences: Array<{ quote_number: string; total: string | number }> = [];
  if (quote.converted_from_proforma_id) {
    const { data: parent } = await supabase
      .from("quotes")
      .select("quote_number")
      .eq("id", quote.converted_from_proforma_id)
      .single();
    parentProformaNumber = parent?.quote_number ?? null;

    // For balance invoices, reference any deposit invoices issued earlier so
    // the customer sees the full payment history at a glance.
    if (quote.invoice_type === "balance") {
      const { data: siblings } = await supabase
        .from("quotes")
        .select("quote_number, invoice_type, total, sent_at")
        .eq("converted_from_proforma_id", quote.converted_from_proforma_id)
        .neq("id", quote.id)
        .is("superseded_by", null);
      depositReferences = (siblings || [])
        .filter((s: any) => s.invoice_type === "deposit")
        .map((s: any) => ({ quote_number: s.quote_number, total: s.total }));
    }
  }

  const enrichedQuote = {
    ...quote,
    currency: baseCurrency,
    display_currency: fx.currency,
    display_total: computedDisplayTotal,
    issued_by_name: issuedByName,
    issued_by_email: issuedByEmail,
    supersedes_quote_number: supersedesQuoteNumber,
    parent_proforma_number: parentProformaNumber,
    deposit_references: depositReferences,
    items: items || [],
  };

  // ==========================================================================
  // Persist computed display values back to the quote row — DRAFTS ONLY.
  // Once a quote is sent (sent_at IS NOT NULL) OR is a converted invoice
  // (converted_from_proforma_id IS NOT NULL), the stored values are treated
  // as the locked contract and must never be overwritten by subsequent
  // renders.
  // ==========================================================================
  if (!useLockedDisplayValues) {
    const persistPayload: Record<string, unknown> = {
      display_currency: fx.currency,
      display_total: computedDisplayTotal.toFixed(2),
    };
    const createdAtMs = quote.created_at ? new Date(quote.created_at).getTime() : Date.now();
    const thirtyDaysLater = new Date(createdAtMs + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD
    if (!quote.valid_until) {
      persistPayload.valid_until = thirtyDaysLater;
      enrichedQuote.valid_until = thirtyDaysLater;
    }
    if (!quote.payment_due_date) {
      persistPayload.payment_due_date = thirtyDaysLater;
      enrichedQuote.payment_due_date = thirtyDaysLater;
    }
    // Await the UPDATE so it is guaranteed to complete before the PDF response
    // is returned and the serverless function potentially shuts down.
    const { error: persistErr } = await supabase
      .from("quotes")
      .update(persistPayload)
      .eq("id", id);
    if (persistErr) {
      console.error("[pdf route] persist display values failed:", persistErr.message);
    }
  }

  const buffer = await renderToBuffer(<QuotePDF data={enrichedQuote} />);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}