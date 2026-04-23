// app/finance/reports/pl/page.tsx
// NUMAT Profit and Loss report, IFRS aligned.
// Drop this in place of the existing app/finance/reports/pl/page.tsx.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getSupabase,
  PL_SECTION_ORDER,
  PL_SECTION_LABELS,
  NON_PL_ENTRY_TYPES,
  type Category,
  type PlSection,
} from "@/lib/finance";

// -----------------------------------------------------------------------------
// Types for the report
// -----------------------------------------------------------------------------

type Row = {
  id: string;
  transaction_date: string;
  entry_type: string;
  amount: number;
  currency: "PHP" | "USD" | "SGD";
  category_id: number | null;
  status: string | null;
  submitted_by: string | null;
};

type PeriodKind = "full_year" | "ytd" | "month" | "custom";

function firstDayOfYear(y: number) {
  return `${y}-01-01`;
}
function lastDayOfYear(y: number) {
  return `${y}-12-31`;
}
function firstDayOfMonth(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}-01`;
}
function lastDayOfMonth(y: number, m: number) {
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// -----------------------------------------------------------------------------
// FX conversion (monthly BSP averages from fin_fx_rates_monthly, USD only).
// SGD falls back to a flat 43.0 because we don't have SGD series in the DB.
// -----------------------------------------------------------------------------

type FxMap = Record<string, number>; // "2026-01" -> 59.1622 PHP per USD

async function loadFxMap(): Promise<FxMap> {
  const sb = getSupabase();
  const { data } = await sb.from("fin_fx_rates_monthly").select("year, month, avg_rate");
  const map: FxMap = {};
  if (data) {
    for (const r of data as Array<{ year: number; month: number; avg_rate: number }>) {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      map[key] = Number(r.avg_rate);
    }
  }
  return map;
}

function toPhp(row: Row, fx: FxMap): number {
  const amt = Number(row.amount) || 0;
  if (row.currency === "PHP") return amt;
  const key = row.transaction_date.slice(0, 7);
  if (row.currency === "USD") {
    const rate = fx[key] ?? 58.5;
    return amt * rate;
  }
  if (row.currency === "SGD") return amt * 43.0;
  return amt;
}

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

function peso(n: number) {
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? "(\u20b1" : "\u20b1") + s + (n < 0 ? ")" : "");
}

// -----------------------------------------------------------------------------
// Section aggregation with IFRS sign rules
// -----------------------------------------------------------------------------

type SectionBreakdown = {
  section: PlSection;
  lines: Array<{
    cat_code: string;
    cat_name: string;
    amount_php: number; // positive for normal expenses / revenues, negative for contras
    txn_count: number;
  }>;
  subtotal: number;
  // For Revenue and Other Income: subtotal is positive (inflow)
  // For all expense sections: subtotal is a positive number, reported as an outflow
};

function aggregate(
  rows: Row[],
  fx: FxMap,
  categories: Category[]
): SectionBreakdown[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const bySection = new Map<
    PlSection,
    Map<number, { code: string; name: string; amount: number; n: number }>
  >();
  for (const s of PL_SECTION_ORDER) {
    bySection.set(s, new Map());
  }

  for (const r of rows) {
    if (!r.category_id) continue;
    const c = catById.get(r.category_id);
    if (!c || !c.pl_section) continue;
    const section = c.pl_section as PlSection;
    const amt_php = toPhp(r, fx);

    // Sign rule:
    //   Revenue, Other Income: is_income rows are positive, rare non is_income rows are negative.
    //   Expense sections (COGS, OpEx, Finance Costs): non is_income rows are positive (expense),
    //     is_income rows are negative (contra expense, e.g. utility refund or reversal).
    const isIncomeSection = section === "Revenue" || section === "Other Income";
    const signed = isIncomeSection
      ? c.is_income
        ? amt_php
        : -amt_php
      : c.is_income
      ? -amt_php
      : amt_php;

    const secMap = bySection.get(section)!;
    const existing = secMap.get(c.id);
    if (existing) {
      existing.amount += signed;
      existing.n += 1;
    } else {
      secMap.set(c.id, { code: c.code, name: c.name, amount: signed, n: 1 });
    }
  }

  const out: SectionBreakdown[] = [];
  for (const section of PL_SECTION_ORDER) {
    const lines = Array.from(bySection.get(section)!.values())
      .map((v) => ({
        cat_code: v.code,
        cat_name: v.name,
        amount_php: v.amount,
        txn_count: v.n,
      }))
      .filter((l) => Math.abs(l.amount_php) > 0.005)
      .sort((a, b) => Math.abs(b.amount_php) - Math.abs(a.amount_php));
    const subtotal = lines.reduce((a, l) => a + l.amount_php, 0);
    out.push({ section, lines, subtotal });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function PLReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [periodKind, setPeriodKind] = useState<PeriodKind>("ytd");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [customStart, setCustomStart] = useState(firstDayOfYear(now.getFullYear()));
  const [customEnd, setCustomEnd] = useState(todayISO());

  const [rows, setRows] = useState<Row[]>([]);
  const [fx, setFx] = useState<FxMap>({});
  const [categories, setCategories] = useState<Category[]>([]);

  // Resolve start/end based on period kind
  const { startISO, endISO } = useMemo(() => {
    if (periodKind === "full_year") {
      return { startISO: firstDayOfYear(year), endISO: lastDayOfYear(year) };
    }
    if (periodKind === "ytd") {
      return { startISO: firstDayOfYear(year), endISO: todayISO() };
    }
    if (periodKind === "month") {
      return {
        startISO: firstDayOfMonth(year, month),
        endISO: lastDayOfMonth(year, month),
      };
    }
    return { startISO: customStart, endISO: customEnd };
  }, [periodKind, year, month, customStart, customEnd]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const sb = getSupabase();
        const [txRes, catRes, fxMap] = await Promise.all([
          sb
            .from("fin_transactions")
            .select(
              "id, transaction_date, entry_type, amount, currency, category_id, status, submitted_by"
            )
            .gte("transaction_date", startISO)
            .lte("transaction_date", endISO)
            .order("transaction_date", { ascending: true }),
          sb.from("fin_categories").select("*").eq("is_active", true),
          loadFxMap(),
        ]);
        if (cancelled) return;
        if (txRes.error) throw txRes.error;
        if (catRes.error) throw catRes.error;

        // Filter out: non-P&L entry types, reversed or flagged status, reconciliation plugs
        const raw = (txRes.data as Row[]) || [];
        const filtered = raw.filter((r) => {
          if (NON_PL_ENTRY_TYPES.includes(r.entry_type as any)) return false;
          if (r.status === "reversed" || r.status === "flagged") return false;
          if (r.submitted_by === "historical_reconciliation") return false;
          return true;
        });
        setRows(filtered);
        setCategories((catRes.data as Category[]) || []);
        setFx(fxMap);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load P&L");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [startISO, endISO]);

  const sections = useMemo(
    () => aggregate(rows, fx, categories),
    [rows, fx, categories]
  );

  // Subtotals by section for the summary block
  const revenue =
    sections.find((s) => s.section === "Revenue")?.subtotal ?? 0;
  const cogs =
    sections.find((s) => s.section === "Cost of Goods Sold")?.subtotal ?? 0;
  const otherIncome =
    sections.find((s) => s.section === "Other Income")?.subtotal ?? 0;
  const opex =
    sections.find((s) => s.section === "Operating Expenses")?.subtotal ?? 0;
  const finance =
    sections.find((s) => s.section === "Finance Costs")?.subtotal ?? 0;

  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit + otherIncome - opex;
  const netProfit = operatingProfit - finance;

  // ---------------------------------------------------------------------------
  // Export to XLSX
  // ---------------------------------------------------------------------------

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const header = [
      ["NUMAT Sustainable Manufacturing Inc."],
      ["Profit and Loss Statement, IFRS format"],
      [`Period: ${startISO} to ${endISO}`],
      ["All figures in PHP, USD/SGD converted at BSP monthly averages"],
      [],
    ];

    const body: any[][] = [];
    body.push(["Line item", "Amount (PHP)", "Txn count"]);

    body.push(["Revenue", revenue.toFixed(2)]);
    for (const l of sections.find((s) => s.section === "Revenue")!.lines) {
      body.push([`    ${l.cat_name}`, l.amount_php.toFixed(2), l.txn_count]);
    }
    body.push([]);

    body.push(["Cost of Goods Sold", (-cogs).toFixed(2)]);
    for (const l of sections.find((s) => s.section === "Cost of Goods Sold")!.lines) {
      body.push([`    ${l.cat_name}`, (-l.amount_php).toFixed(2), l.txn_count]);
    }
    body.push([]);

    body.push(["Gross Profit", grossProfit.toFixed(2)]);
    body.push([]);

    body.push(["Other Income", otherIncome.toFixed(2)]);
    for (const l of sections.find((s) => s.section === "Other Income")!.lines) {
      body.push([`    ${l.cat_name}`, l.amount_php.toFixed(2), l.txn_count]);
    }
    body.push([]);

    body.push(["Operating Expenses", (-opex).toFixed(2)]);
    for (const l of sections.find((s) => s.section === "Operating Expenses")!.lines) {
      body.push([`    ${l.cat_name}`, (-l.amount_php).toFixed(2), l.txn_count]);
    }
    body.push([]);

    body.push(["Operating Profit", operatingProfit.toFixed(2)]);
    body.push([]);

    body.push(["Finance Costs", (-finance).toFixed(2)]);
    for (const l of sections.find((s) => s.section === "Finance Costs")!.lines) {
      body.push([`    ${l.cat_name}`, (-l.amount_php).toFixed(2), l.txn_count]);
    }
    body.push([]);

    body.push(["Net Profit", netProfit.toFixed(2)]);

    const ws = XLSX.utils.aoa_to_sheet([...header, ...body]);
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    XLSX.writeFile(
      wb,
      `NUMAT_PL_${startISO}_to_${endISO}.xlsx`
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/finance/reports" className="text-sm text-neutral-500">
              &larr; Reports
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">
              Profit and Loss Statement
            </h1>
            <p className="text-sm text-neutral-500">
              IFRS format, PHP presentation currency
            </p>
          </div>
          <button
            onClick={exportXlsx}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Export to Excel
          </button>
        </div>

        {/* Period controls */}
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600">
                Period
              </label>
              <select
                value={periodKind}
                onChange={(e) => setPeriodKind(e.target.value as PeriodKind)}
                className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ytd">Year to date</option>
                <option value="full_year">Full year</option>
                <option value="month">Single month</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {(periodKind === "ytd" ||
              periodKind === "full_year" ||
              periodKind === "month") && (
              <div>
                <label className="block text-xs font-medium text-neutral-600">
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 w-24 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}

            {periodKind === "month" && (
              <div>
                <label className="block text-xs font-medium text-neutral-600">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("en-US", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodKind === "custom" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-600">
                    Start
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600">
                    End
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="ml-auto text-right text-sm text-neutral-500">
              <div>
                {startISO} to {endISO}
              </div>
              <div>{rows.length.toLocaleString()} transactions included</div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
            Loading P&L
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Line item</th>
                  <th className="px-4 py-3 text-right font-medium">Amount (PHP)</th>
                  <th className="px-4 py-3 text-right font-medium">Txns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {/* Revenue */}
                <SectionHeader label="Revenue" total={revenue} />
                {sections
                  .find((s) => s.section === "Revenue")!
                  .lines.map((l) => (
                    <LineRow key={l.cat_code} line={l} signedAmount={l.amount_php} />
                  ))}

                {/* COGS */}
                <SectionHeader
                  label="Cost of Goods Sold"
                  total={-cogs}
                  expense
                />
                {sections
                  .find((s) => s.section === "Cost of Goods Sold")!
                  .lines.map((l) => (
                    <LineRow
                      key={l.cat_code}
                      line={l}
                      signedAmount={-l.amount_php}
                      expense
                    />
                  ))}

                {/* Gross Profit */}
                <SubtotalRow label="Gross Profit" amount={grossProfit} bold />

                {/* Other Income */}
                <SectionHeader label="Other Income" total={otherIncome} />
                {sections
                  .find((s) => s.section === "Other Income")!
                  .lines.map((l) => (
                    <LineRow key={l.cat_code} line={l} signedAmount={l.amount_php} />
                  ))}

                {/* OpEx */}
                <SectionHeader
                  label="Operating Expenses"
                  total={-opex}
                  expense
                />
                {sections
                  .find((s) => s.section === "Operating Expenses")!
                  .lines.map((l) => (
                    <LineRow
                      key={l.cat_code}
                      line={l}
                      signedAmount={-l.amount_php}
                      expense
                    />
                  ))}

                {/* Operating Profit */}
                <SubtotalRow
                  label="Operating Profit"
                  amount={operatingProfit}
                  bold
                />

                {/* Finance Costs */}
                <SectionHeader label="Finance Costs" total={-finance} expense />
                {sections
                  .find((s) => s.section === "Finance Costs")!
                  .lines.map((l) => (
                    <LineRow
                      key={l.cat_code}
                      line={l}
                      signedAmount={-l.amount_php}
                      expense
                    />
                  ))}

                {/* Net Profit */}
                <SubtotalRow label="Net Profit" amount={netProfit} bold big />
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-xs text-neutral-500">
          Transfers, salary advances, revolving fund movements, shareholder advances,
          reversed entries, and flagged reconciliation plugs are excluded from this
          report. Amounts shown in USD and SGD are converted to PHP using BSP monthly
          average rates from fin_fx_rates_monthly (USD) and 43.0 PHP per SGD (flat).
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

function SectionHeader({
  label,
  total,
  expense,
}: {
  label: string;
  total: number;
  expense?: boolean;
}) {
  return (
    <tr className="bg-neutral-50">
      <td className="px-4 py-3 font-semibold">{label}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums">
        {peso(expense ? -total : total)}
      </td>
      <td className="px-4 py-3 text-right text-xs text-neutral-500"></td>
    </tr>
  );
}

function LineRow({
  line,
  signedAmount,
  expense,
}: {
  line: { cat_code: string; cat_name: string; amount_php: number; txn_count: number };
  signedAmount: number;
  expense?: boolean;
}) {
  return (
    <tr>
      <td className="px-4 py-2 pl-8 text-neutral-700">{line.cat_name}</td>
      <td className="px-4 py-2 text-right tabular-nums">
        {peso(signedAmount)}
      </td>
      <td className="px-4 py-2 text-right text-xs text-neutral-500 tabular-nums">
        {line.txn_count}
      </td>
    </tr>
  );
}

function SubtotalRow({
  label,
  amount,
  bold,
  big,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  big?: boolean;
}) {
  return (
    <tr className={big ? "bg-neutral-100" : "bg-neutral-50"}>
      <td
        className={`px-4 ${big ? "py-4" : "py-3"} ${
          bold ? "font-semibold" : ""
        } ${big ? "text-base" : ""}`}
      >
        {label}
      </td>
      <td
        className={`px-4 ${big ? "py-4" : "py-3"} text-right tabular-nums ${
          bold ? "font-semibold" : ""
        } ${big ? "text-base" : ""}`}
      >
        {peso(amount)}
      </td>
      <td className={`px-4 ${big ? "py-4" : "py-3"}`}></td>
    </tr>
  );
}