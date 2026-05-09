// ============================================================================
// File: app/api/receipt/[id]/pdf/route.tsx
//
// Commit C: Payment Acknowledgment PDF.
//
// This is a COMMERCIAL acknowledgment of payment received, NOT a BIR Official
// Receipt (OR). The distinction is surfaced clearly in the PDF footnote and
// the title deliberately says "PAYMENT ACKNOWLEDGMENT" rather than "OFFICIAL
// RECEIPT" so there is no ambiguity about the document's legal status.
//
// Commit C UX polish: for invoices that are tranches of a parent proforma
// (Deposit or Balance invoices), the PDF now also shows an "Order Summary"
// box below the per-invoice Payment Summary. This box shows the parent
// proforma's total, cumulative payments across ALL sibling invoices, and
// outstanding balance on the overall order. It prevents the customer from
// misreading "PAID IN FULL" on a deposit receipt as meaning the whole
// order is settled.
//
// Auth:
//   - Authenticated CRM user session (any active role can preview)
//   - OR x-receipt-secret header (reserved for future n8n email workflow)
//
// Env vars required:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   RECEIPT_PDF_SECRET (optional, for future n8n integration)
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

// ---------- NUMAT brand colors (match quote PDF) ----------
const COLORS = {
  green: "#2F5D3A",
  greenLight: "#4A7856",
  greenPale: "#F0F6F1",
  ink: "#0F1F14",
  body: "#3C4A40",
  muted: "#8A958D",
  line: "#E4EAE5",
  white: "#FFFFFF",
  amber: "#B45309",
  amberPale: "#FEF3C7",
  blue: "#1E40AF",
  blueLight: "#60A5FA",
  bluePale: "#EFF6FF",
};

const LOGO_URL = "https://numatbamboo.com/logo.png";

// ---------- Rep directory for "Acknowledged by" attribution ----------
const REP_DIRECTORY: Record<string, string> = {
  "nick@numat.ph": "Nicholas Toh",
  "mohan@numat.ph": "Mohan Louis",
  "bryan@numat.ph": "Bryan",
  "eugene@numat.ph": "Eugene",
  "sales@numat.ph": "NUMAT Sales Team",
};

function repDisplayName(email: string | null | undefined): string {
  if (!email) return "NUMAT Sales Team";
  const e = email.toLowerCase().trim();
  if (REP_DIRECTORY[e]) return REP_DIRECTORY[e];
  const local = e.split("@")[0] || "";
  return (
    local
      .split(/[._\-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ") || "NUMAT Sales Team"
  );
}

// ---------- Payment method display labels ----------
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wire_transfer: "Wire Transfer",
  bank_deposit: "Bank Deposit",
  check: "Check",
  gcash: "GCash",
  paymaya: "PayMaya",
  cash: "Cash",
  other: "Other",
};

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

function formatPercent(part: number, whole: number): string {
  if (whole <= 0) return "";
  const pct = (part / whole) * 100;
  if (pct >= 99.99 && pct <= 100.01) return "100%";
  if (pct <= 0) return "0%";
  return `${pct.toFixed(pct < 10 ? 1 : 0)}%`;
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
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
    letterSpacing: 1,
    lineHeight: 1.2,
    marginBottom: 8,
  },
  receiptNumber: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  lineageRow: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    fontFamily: "Helvetica-Oblique",
  },
  notOfficialBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.amber,
    backgroundColor: COLORS.amberPale,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 2,
    letterSpacing: 0.5,
  },

  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
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

  // --- Amount received hero block ---
  amountHero: {
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.greenPale,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  amountLabel: {
    fontSize: 9,
    color: COLORS.green,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  amountDisplay: {
    fontSize: 24,
    lineHeight: 1.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
    marginBottom: 8,
  },
  amountBase: {
    fontSize: 11,
    lineHeight: 1.4,
    color: COLORS.body,
    marginBottom: 0,
  },

  // --- Details table ---
  detailsTable: {
    marginBottom: 24,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.line,
  },
  detailLabel: {
    flex: 1,
    fontSize: 9,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Bold",
  },
  detailValue: {
    flex: 2,
    fontSize: 10,
    color: COLORS.ink,
  },
  detailValueBold: {
    flex: 2,
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: "Helvetica-Bold",
  },

  // --- Balance summary box (invoice-level) ---
  balanceBox: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.greenPale,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.greenLight,
  },
  balanceLabel: {
    fontSize: 9,
    color: COLORS.green,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  balanceRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.greenLight,
  },
  balanceText: {
    fontSize: 10,
    color: COLORS.body,
  },
  balanceValue: {
    fontSize: 10,
    color: COLORS.ink,
  },
  balanceFinalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
  },
  balanceFinalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
  },

  // --- Order summary box (parent-proforma level, blue-tinted to distinguish) ---
  orderBox: {
    marginTop: 0,
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORS.bluePale,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blueLight,
  },
  orderLabel: {
    fontSize: 9,
    color: COLORS.blue,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  orderSubLabel: {
    fontSize: 8,
    color: COLORS.muted,
    marginBottom: 10,
    fontFamily: "Helvetica-Oblique",
  },
  orderRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.blueLight,
  },
  orderFinalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.blue,
  },
  orderFinalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.blue,
  },
  siblingList: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.blueLight,
  },
  siblingListLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  siblingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  siblingText: {
    fontSize: 9,
    color: COLORS.body,
  },
  siblingTextSelf: {
    fontSize: 9,
    color: COLORS.blue,
    fontFamily: "Helvetica-Bold",
  },

  // --- Acknowledgment note (bottom) ---
  acknowledgmentBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: COLORS.amberPale,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
  },
  acknowledgmentLabel: {
    fontSize: 9,
    color: COLORS.amber,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  acknowledgmentText: {
    fontSize: 9,
    color: COLORS.body,
    lineHeight: 1.4,
  },

  // --- Signature block ---
  signatureRow: {
    flexDirection: "row",
    marginTop: 32,
  },
  signatureBlock: {
    flex: 1,
    paddingTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.ink,
    marginRight: 40,
  },
  signatureName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.ink,
    marginBottom: 2,
  },
  signatureSub: {
    fontSize: 8,
    color: COLORS.muted,
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
});

// ---------- PDF Data Type ----------
type OrderContext = {
  parent_total_base: number;
  parent_total_display: number;
  parent_display_currency: string;
  order_paid_base: number;
  order_paid_display: number;
  siblings: {
    quote_number: string;
    invoice_type: "deposit" | "balance" | "full" | null;
    total_base: number;
    total_display: number;
    received_base: number;
    is_paid: boolean;
    is_self: boolean;
  }[];
  uninvoiced_base: number;
  uninvoiced_display: number;
};

type ReceiptData = {
  receipt_number: string;
  created_at: string;
  actual_date: string;
  actual_amount: string | number;
  actual_currency: string;
  display_amount: string | number | null;
  display_currency: string | null;
  payment_method: string;
  bank_reference: string | null;
  notes: string | null;
  issued_by: string;

  invoice_number: string;
  invoice_total: string | number;
  invoice_display_total: string | number | null;
  invoice_display_currency: string | null;
  invoice_type: "deposit" | "balance" | "full" | null;
  parent_proforma_number: string | null;
  customer_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  customer_address: string | null;
  customer_tin: string | null;

  cumulative_received_base: number;
  cumulative_received_display: number;

  // Populated only when the invoice is a tranche (deposit or balance) of a parent proforma.
  // null for standalone invoices and Full invoices (where order-level summary would be redundant).
  order_context: OrderContext | null;
};

// ---------- Component ----------
const ReceiptPDF: React.FC<{ data: ReceiptData }> = ({ data }) => {
  const actualAmount = parseFloat(String(data.actual_amount)) || 0;
  const displayAmount = parseFloat(String(data.display_amount ?? "")) || 0;
  const invoiceTotal = parseFloat(String(data.invoice_total)) || 0;
  const invoiceDisplayTotal = parseFloat(String(data.invoice_display_total ?? "")) || 0;

  const actualCurrency = (data.actual_currency || "USD").toUpperCase();
  const displayCurrency = (data.display_currency || actualCurrency).toUpperCase();
  const invoiceDisplayCurrency = (
    data.invoice_display_currency || actualCurrency
  ).toUpperCase();

  const hasDisplay = displayAmount > 0 && displayCurrency !== actualCurrency;

  const balanceDue = Math.max(0, invoiceTotal - data.cumulative_received_base);
  const balanceDueDisplay = Math.max(
    0,
    invoiceDisplayTotal - data.cumulative_received_display
  );
  const isFullyPaid = balanceDue <= 0.01;

  const issuedByName = repDisplayName(data.issued_by);
  const paymentMethodLabel =
    PAYMENT_METHOD_LABELS[data.payment_method] || data.payment_method;

  // Build the lineage line: "Against Invoice INV-xxxx (Proforma PI-xxxx)"
  const lineageParts: string[] = [];
  lineageParts.push(`Against Invoice ${data.invoice_number}`);
  if (data.parent_proforma_number) {
    const typeLabel =
      data.invoice_type === "deposit"
        ? "deposit"
        : data.invoice_type === "balance"
          ? "balance"
          : "full";
    lineageParts.push(
      `${typeLabel} invoice from Proforma ${data.parent_proforma_number}`
    );
  }
  const lineageText = lineageParts.join(" \u00b7 ");

  // Order-level computations (only shown when order_context present)
  const oc = data.order_context;
  const orderCurrency = oc?.parent_display_currency || actualCurrency;
  const orderTotal = oc ? oc.parent_total_display || oc.parent_total_base : 0;
  const orderPaid = oc ? oc.order_paid_display || oc.order_paid_base : 0;
  const orderOutstanding = Math.max(0, orderTotal - orderPaid);
  const orderFullyPaid = oc ? orderOutstanding <= 0.01 : false;
  const usingDisplayForOrder = oc ? oc.parent_total_display > 0 : false;
  const orderPercent = oc ? formatPercent(orderPaid, orderTotal) : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>PAYMENT ACKNOWLEDGMENT</Text>
            <Text style={styles.receiptNumber}>{data.receipt_number}</Text>
            <Text style={styles.lineageRow}>{lineageText}</Text>
            <Text style={styles.notOfficialBadge}>
              NOT A BIR OFFICIAL RECEIPT
            </Text>
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        {/* Two-column: received from | received by */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Received from</Text>
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
            {data.customer_tin ? (
              <Text style={styles.bodyText}>TIN: {data.customer_tin}</Text>
            ) : null}
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Received by</Text>
            <Text style={styles.bodyBold}>NUMAT Sustainable</Text>
            <Text style={styles.bodyBold}>Manufacturing Inc.</Text>
            <Text style={styles.bodyText}>Cagayan de Oro, Philippines</Text>
            <Text style={styles.bodyText}>numatbamboo.com</Text>
            <Text style={{ ...styles.bodyText, marginTop: 6 }}>
              Acknowledged by: {issuedByName}
            </Text>
          </View>
        </View>

        {/* Amount received hero */}
        <View style={styles.amountHero}>
          <Text style={styles.amountLabel}>Amount acknowledged</Text>
          <Text style={styles.amountDisplay}>
            {hasDisplay
              ? formatCurrency(displayAmount, displayCurrency)
              : formatCurrency(actualAmount, actualCurrency)}
          </Text>
          {hasDisplay ? (
            <Text style={styles.amountBase}>
              Base amount: {formatCurrency(actualAmount, actualCurrency)}
              {"  \u00b7  Locked FX rate from invoice "}
              {data.invoice_number}
            </Text>
          ) : null}
        </View>

        {/* Details table */}
        <View style={styles.detailsTable}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receipt date</Text>
            <Text style={styles.detailValue}>{formatDate(data.created_at)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment date</Text>
            <Text style={styles.detailValueBold}>
              {formatDate(data.actual_date)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment method</Text>
            <Text style={styles.detailValue}>{paymentMethodLabel}</Text>
          </View>
          {data.bank_reference ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference</Text>
              <Text style={styles.detailValue}>{data.bank_reference}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice</Text>
            <Text style={styles.detailValueBold}>{data.invoice_number}</Text>
          </View>
          {data.notes ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.detailValue}>{data.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Invoice-level payment summary */}
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>
            Payment Summary (This Invoice)
          </Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Invoice total</Text>
            <Text style={styles.balanceValue}>
              {hasDisplay
                ? formatCurrency(invoiceDisplayTotal, invoiceDisplayCurrency)
                : formatCurrency(invoiceTotal, actualCurrency)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>
              Cumulative received (incl. this payment)
            </Text>
            <Text style={styles.balanceValue}>
              {hasDisplay
                ? formatCurrency(
                    data.cumulative_received_display,
                    invoiceDisplayCurrency
                  )
                : formatCurrency(data.cumulative_received_base, actualCurrency)}
            </Text>
          </View>
          <View style={styles.balanceRowFinal}>
            <Text style={styles.balanceFinalLabel}>
              {isFullyPaid ? "PAID IN FULL" : "OUTSTANDING BALANCE"}
            </Text>
            <Text style={styles.balanceFinalValue}>
              {isFullyPaid
                ? "\u2014"
                : hasDisplay
                  ? formatCurrency(balanceDueDisplay, invoiceDisplayCurrency)
                  : formatCurrency(balanceDue, actualCurrency)}
            </Text>
          </View>
        </View>

        {/* Order-level summary (only for deposit/balance invoices tied to a proforma) */}
        {oc ? (
          <View style={styles.orderBox}>
            <Text style={styles.orderLabel}>
              Order Summary (Proforma {data.parent_proforma_number})
            </Text>
            <Text style={styles.orderSubLabel}>
              Cumulative position across all invoices issued against this order
            </Text>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceText}>Order total</Text>
              <Text style={styles.balanceValue}>
                {usingDisplayForOrder
                  ? formatCurrency(oc.parent_total_display, orderCurrency)
                  : formatCurrency(oc.parent_total_base, orderCurrency)}
              </Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceText}>
                Paid to date{orderPercent ? ` (${orderPercent})` : ""}
              </Text>
              <Text style={styles.balanceValue}>
                {usingDisplayForOrder
                  ? formatCurrency(oc.order_paid_display, orderCurrency)
                  : formatCurrency(oc.order_paid_base, orderCurrency)}
              </Text>
            </View>
            <View style={styles.orderRowFinal}>
              <Text style={styles.orderFinalLabel}>
                {orderFullyPaid ? "ORDER FULLY PAID" : "ORDER BALANCE OUTSTANDING"}
              </Text>
              <Text style={styles.orderFinalValue}>
                {orderFullyPaid
                  ? "\u2014"
                  : formatCurrency(orderOutstanding, orderCurrency)}
              </Text>
            </View>

            {/* Sibling invoice breakdown (shows what has been invoiced) */}
            {oc.siblings.length > 0 ? (
              <View style={styles.siblingList}>
                <Text style={styles.siblingListLabel}>Invoices on this order</Text>
                {oc.siblings.map((s) => {
                  const typeLbl =
                    s.invoice_type === "deposit"
                      ? "Deposit"
                      : s.invoice_type === "balance"
                        ? "Balance"
                        : s.invoice_type === "full"
                          ? "Full"
                          : "Invoice";
                  const statusLbl = s.is_paid
                    ? "paid"
                    : s.received_base > 0
                      ? "partial"
                      : "unpaid";
                  const amt = usingDisplayForOrder
                    ? formatCurrency(s.total_display, orderCurrency)
                    : formatCurrency(s.total_base, orderCurrency);
                  return (
                    <View key={s.quote_number} style={styles.siblingRow}>
                      <Text
                        style={
                          s.is_self ? styles.siblingTextSelf : styles.siblingText
                        }
                      >
                        {s.quote_number} · {typeLbl} · {statusLbl}
                        {s.is_self ? " (this receipt)" : ""}
                      </Text>
                      <Text
                        style={
                          s.is_self ? styles.siblingTextSelf : styles.siblingText
                        }
                      >
                        {amt}
                      </Text>
                    </View>
                  );
                })}
                {oc.uninvoiced_base > 0.01 ? (
                  <View style={styles.siblingRow}>
                    <Text style={styles.siblingText}>
                      Not yet invoiced (further invoice pending)
                    </Text>
                    <Text style={styles.siblingText}>
                      {usingDisplayForOrder
                        ? formatCurrency(oc.uninvoiced_display, orderCurrency)
                        : formatCurrency(oc.uninvoiced_base, orderCurrency)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Acknowledgment footnote */}
        <View style={styles.acknowledgmentBox}>
          <Text style={styles.acknowledgmentLabel}>Important</Text>
          <Text style={styles.acknowledgmentText}>
            This document is a commercial acknowledgment of payment received by
            NUMAT Sustainable Manufacturing Inc. It is not a BIR-issued Official
            Receipt and should not be used for tax reporting purposes. A BIR
            Official Receipt will be issued separately upon request and in
            accordance with Philippine tax regulations.
          </Text>
        </View>

        {/* Signature block */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{issuedByName}</Text>
            <Text style={styles.signatureSub}>
              For NUMAT Sustainable Manufacturing Inc.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>NUMAT Sustainable Manufacturing Inc. · numatbamboo.com</Text>
          <Text>Engineered bamboo, built to outlast.</Text>
        </View>
      </Page>
    </Document>
  );
};

// ---------- API Route ----------
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      }
    );
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.email) return false;
    const serviceClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
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
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth: session cookie OR x-receipt-secret (reserved for future n8n workflow)
  const secret = req.headers.get("x-receipt-secret");
  const isSecretValid = Boolean(
    secret && secret === process.env.RECEIPT_PDF_SECRET
  );
  const isCrmUser = isSecretValid ? false : await isAuthenticatedCrmUser();
  if (!isSecretValid && !isCrmUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 1. Load the receipt
  const { data: receipt, error: rErr } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (rErr || !receipt) {
    return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  }

  // 2. Load the linked invoice
  const { data: invoice, error: iErr } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, doc_type, customer_name, company, email, phone, customer_tin, customer_address, total, display_total, display_currency, currency, invoice_type, converted_from_proforma_id"
    )
    .eq("id", receipt.quote_id)
    .single();

  if (iErr || !invoice) {
    return NextResponse.json(
      { error: "linked invoice not found" },
      { status: 404 }
    );
  }

  // 3. Resolve parent proforma + compute order-level context (deposit/balance only)
  let parentProformaNumber: string | null = null;
  let orderContext: OrderContext | null = null;

  if (invoice.converted_from_proforma_id) {
    const { data: parent } = await supabase
      .from("quotes")
      .select("quote_number, total, display_total, display_currency, currency")
      .eq("id", invoice.converted_from_proforma_id)
      .single();

    parentProformaNumber = parent?.quote_number ?? null;

    // Only build the Order Summary for deposit or balance invoices.
    // For Full invoices, order total == invoice total, so the box would be redundant.
    if (parent && (invoice.invoice_type === "deposit" || invoice.invoice_type === "balance")) {
      // 3a. Fetch all non-superseded sibling invoices against this proforma
      const { data: siblings } = await supabase
        .from("quotes")
        .select(
          "id, quote_number, invoice_type, total, display_total, payment_status, created_at"
        )
        .eq("converted_from_proforma_id", invoice.converted_from_proforma_id)
        .eq("doc_type", "invoice")
        .is("superseded_by", null)
        .order("created_at", { ascending: true });

      const siblingIds = (siblings || []).map((s) => s.id);

      // 3b. Fetch all receipts on those siblings up to and including this receipt's timestamp.
      //     This ensures an older receipt PDF doesn't show payments that hadn't happened yet.
      const { data: crossReceipts } = await supabase
        .from("receipts")
        .select("quote_id, actual_amount, display_amount, created_at")
        .in("quote_id", siblingIds.length > 0 ? siblingIds : ["__empty__"])
        .is("superseded_by", null)
        .lte("created_at", receipt.created_at);

      // 3c. Per-sibling receipt totals (used for "paid/partial/unpaid" status)
      const receivedByQuote = new Map<string, number>();
      let orderPaidBase = 0;
      let orderPaidDisplay = 0;
      for (const r of crossReceipts || []) {
        const baseAmt = Number(r.actual_amount) || 0;
        const dispAmt = Number(r.display_amount) || 0;
        orderPaidBase += baseAmt;
        orderPaidDisplay += dispAmt;
        receivedByQuote.set(
          r.quote_id,
          (receivedByQuote.get(r.quote_id) || 0) + baseAmt
        );
      }

      // 3d. Sum of sibling invoice totals (covers deposit + balance if both issued)
      let issuedBase = 0;
      let issuedDisplay = 0;
      for (const s of siblings || []) {
        issuedBase += Number(s.total) || 0;
        issuedDisplay += Number(s.display_total) || 0;
      }

      const parentTotalBase = Number(parent.total) || 0;
      const parentTotalDisplay = Number(parent.display_total) || 0;
      const parentCurrency =
        (parent.display_currency || parent.currency || invoice.currency || "USD").toUpperCase();

      const uninvoicedBase = Math.max(0, parentTotalBase - issuedBase);
      const uninvoicedDisplay = Math.max(0, parentTotalDisplay - issuedDisplay);

      orderContext = {
        parent_total_base: parentTotalBase,
        parent_total_display: parentTotalDisplay,
        parent_display_currency: parentCurrency,
        order_paid_base: Math.round(orderPaidBase * 100) / 100,
        order_paid_display: Math.round(orderPaidDisplay * 100) / 100,
        siblings: (siblings || []).map((s) => {
          const sTotalBase = Number(s.total) || 0;
          const sReceived = receivedByQuote.get(s.id) || 0;
          return {
            quote_number: s.quote_number,
            invoice_type: s.invoice_type as OrderContext["siblings"][number]["invoice_type"],
            total_base: sTotalBase,
            total_display: Number(s.display_total) || 0,
            received_base: Math.round(sReceived * 100) / 100,
            // Mark as paid ONLY if received covers total AS OF this receipt's timestamp.
            // This avoids showing future receipts as already settled in historical PDFs.
            is_paid: sReceived >= sTotalBase - 0.01,
            is_self: s.id === invoice.id,
          };
        }),
        uninvoiced_base: Math.round(uninvoicedBase * 100) / 100,
        uninvoiced_display: Math.round(uninvoicedDisplay * 100) / 100,
      };
    }
  }

  // 4. Cumulative on THIS invoice (existing logic, unchanged)
  const { data: allReceipts } = await supabase
    .from("receipts")
    .select("actual_amount, display_amount, created_at")
    .eq("quote_id", receipt.quote_id)
    .is("superseded_by", null)
    .order("created_at", { ascending: true });

  let cumulativeBase = 0;
  let cumulativeDisplay = 0;
  for (const r of allReceipts || []) {
    if (r.created_at > receipt.created_at) break;
    cumulativeBase += Number(r.actual_amount) || 0;
    cumulativeDisplay += Number(r.display_amount) || 0;
  }

  const data: ReceiptData = {
    receipt_number: receipt.receipt_number,
    created_at: receipt.created_at,
    actual_date: receipt.actual_date,
    actual_amount: receipt.actual_amount,
    actual_currency: receipt.actual_currency,
    display_amount: receipt.display_amount,
    display_currency: receipt.display_currency,
    payment_method: receipt.payment_method,
    bank_reference: receipt.bank_reference,
    notes: receipt.notes,
    issued_by: receipt.issued_by,

    invoice_number: invoice.quote_number,
    invoice_total: invoice.total,
    invoice_display_total: invoice.display_total,
    invoice_display_currency: invoice.display_currency,
    invoice_type: invoice.invoice_type as ReceiptData["invoice_type"],
    parent_proforma_number: parentProformaNumber,
    customer_name: invoice.customer_name,
    company: invoice.company,
    email: invoice.email,
    phone: invoice.phone,
    customer_address: invoice.customer_address,
    customer_tin: invoice.customer_tin,

    cumulative_received_base: Math.round(cumulativeBase * 100) / 100,
    cumulative_received_display: Math.round(cumulativeDisplay * 100) / 100,

    order_context: orderContext,
  };

  const buffer = await renderToBuffer(<ReceiptPDF data={data} />);

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${receipt.receipt_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
