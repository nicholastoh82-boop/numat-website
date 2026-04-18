// ============================================================================
// File path in your repo: src/app/api/quote/[id]/pdf/route.tsx
// (App Router — Next.js 13+)
//
// Install dependency first:
//   pnpm add @react-pdf/renderer
//
// Env var required (already in your .env most likely):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   QUOTE_PDF_SECRET   <-- NEW. Set this to any long random string.
//                          n8n will send it in the x-quote-secret header.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

// ---------- NUMAT brand colors & fonts ----------
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

const LOGO_URL =
  "https://peuwxnrojlfybdymkazj.supabase.co/storage/v1/object/public/logos/numat-logo-transparent.png";

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
  logo: { width: 110, height: 40, objectFit: "contain" },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green,
    letterSpacing: 1.5,
  },
  quoteNumber: { fontSize: 10, color: COLORS.muted, marginTop: 4 },

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
  bodyBold: { fontSize: 10, color: COLORS.ink, fontFamily: "Helvetica-Bold" },

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
});

// ---------- Helpers ----------
function formatCurrency(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = isNaN(n) ? 0 : n;
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// ---------- PDF Component ----------
type QuoteData = {
  quote_number: string;
  customer_name: string;
  company: string | null;
  email: string;
  phone: string | null;
  currency: string;
  display_currency: string | null;
  subtotal: string | number;
  discount_amount: string | number | null;
  discount_percent: number | null;
  total: string | number;
  display_total: string | number | null;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  payment_terms: string | null;
  incoterms: string | null;
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

  const paymentTerms =
    data.payment_terms ||
    "50 percent deposit on purchase order. 50 percent balance before shipment.";
  const incoterms = data.incoterms || "EXW Cagayan de Oro, Philippines.";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>QUOTATION</Text>
            <Text style={styles.quoteNumber}>{data.quote_number}</Text>
          </View>
          <Image src={LOGO_URL} style={styles.logo} />
        </View>

        {/* Meta grid */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Prepared for</Text>
            <Text style={styles.bodyBold}>{data.customer_name}</Text>
            {data.company ? (
              <Text style={styles.bodyText}>{data.company}</Text>
            ) : null}
            <Text style={styles.bodyText}>{data.email}</Text>
            {data.phone ? (
              <Text style={styles.bodyText}>{data.phone}</Text>
            ) : null}
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Issued by</Text>
            <Text style={styles.bodyBold}>NUMAT Sustainable Manufacturing</Text>
            <Text style={styles.bodyText}>Cagayan de Oro, Philippines</Text>
            <Text style={styles.bodyText}>sales@numat.ph</Text>
            <Text style={styles.bodyText}>numatbamboo.com</Text>
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Details</Text>
            <Text style={styles.bodyText}>
              Issue date: {formatDate(data.created_at)}
            </Text>
            <Text style={styles.bodyText}>
              Valid until: {formatDate(data.valid_until)}
            </Text>
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
          <View style={styles.totalsFinalRow}>
            <Text style={styles.totalsFinalLabel}>TOTAL</Text>
            <Text style={styles.totalsFinalValue}>
              {formatCurrency(totalValue, currencyShown)}
            </Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={styles.termsLabel}>Terms and conditions</Text>
          <Text style={styles.bodyText}>
            Payment: {paymentTerms}
          </Text>
          <Text style={styles.bodyText}>Incoterms: {incoterms}</Text>
          <Text style={styles.bodyText}>
            Validity: This quote is valid until{" "}
            {formatDate(data.valid_until)}.
          </Text>
          <Text style={styles.bodyText}>
            Lead time: Typically 4 to 6 weeks from receipt of deposit and
            confirmed specifications.
          </Text>
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
    </Document>
  );
};

// ---------- API Route Handler ----------
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Simple secret check so only n8n / CRM can hit this
  const secret = req.headers.get("x-quote-secret");
  if (!secret || secret !== process.env.QUOTE_PDF_SECRET) {
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

  const buffer = await renderToBuffer(
    <QuotePDF data={{ ...quote, items: items || [] }} />,
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}