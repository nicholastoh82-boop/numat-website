// app/finance/reports/pl/page.tsx
// NUMAT Profit and Loss report, Assembly Works format, actual cash basis.

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
// Types
// -----------------------------------------------------------------------------

type TxnRow = {
  id: string;
  transaction_date: string;
  entry_type: string;
  amount: number;
  currency: "PHP" | "USD" | "SGD";
  category_id: number | null;
  description: string | null;
  vendor_payee: string | null;
  notes: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  status: string | null;
  submitted_by: string | null;
};

type PeriodKind = "full_year" | "ytd" | "month" | "custom";

type FxRow = { year: number; month: number; avg_rate: number };
type FxMap = Record<string, number>;

type TxnDetail = {
  id: string;
  transaction_date: string;
  label: string;
  entry_type: string;
  amount: number;
  currency: "PHP" | "USD" | "SGD";
  amount_php: number;
};

type CategoryLine = {
  category_id: number;
  code: string;
  name: string;
  amount_php: number;
  txn_count: number;
  transactions: TxnDetail[];
};

type AccountCodeLine = {
  pl_account_code: string;
  amount_php: number;
  txn_count: number;
  categories: CategoryLine[];
};

type SectionBucket = {
  section: PlSection;
  lines: AccountCodeLine[];
  subtotal: number;
};

// -----------------------------------------------------------------------------
// Date helpers
// -----------------------------------------------------------------------------

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatIsoDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettyPeriod(
  kind: PeriodKind,
  year: number,
  month: number,
  startISO: string,
  endISO: string
): string {
  if (kind === "full_year") return String(year);
  if (kind === "month") return `${MONTH_NAMES[month - 1]} ${year}`;
  if (kind === "ytd") {
    const end = new Date(endISO);
    return `January to ${MONTH_NAMES[end.getMonth()]} ${year}`;
  }
  return `${formatIsoDate(startISO)} to ${formatIsoDate(endISO)}`;
}

function prettyEntryType(t: string): string {
  if (!t) return "";
  return t.replace(/_/g, " ");
}

// -----------------------------------------------------------------------------
// FX
// -----------------------------------------------------------------------------

function buildFxMap(rows: FxRow[]): FxMap {
  const map: FxMap = {};
  for (const r of rows) {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    map[key] = Number(r.avg_rate);
  }
  return map;
}

function toPhp(row: TxnRow, fx: FxMap): number {
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

function periodAvgUsdRate(fx: FxMap, startISO: string, endISO: string): number {
  const startY = Number(startISO.slice(0, 4));
  const startM = Number(startISO.slice(5, 7));
  const endY = Number(endISO.slice(0, 4));
  const endM = Number(endISO.slice(5, 7));
  const rates: number[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    const r = fx[`${y}-${String(m).padStart(2, "0")}`];
    if (typeof r === "number" && isFinite(r) && r > 0) rates.push(r);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  if (!rates.length) return 58.5;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

function peso(n: number) {
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? "(₱" : "₱") + s + (n < 0 ? ")" : "");
}

function usd(n: number) {
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? "($" : "$") + s + (n < 0 ? ")" : "");
}

// -----------------------------------------------------------------------------
// Aggregation
// -----------------------------------------------------------------------------

function parsePrefix(code: string): number | null {
  const m = code.match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Sort by numeric prefix ascending. Items without a prefix are inserted
// after the first numeric prefix, alphabetically among themselves.
// Example for Cost of Goods Sold: 310, Materials and Supplies, 469, 473, 490.
function sortAccountLines(lines: AccountCodeLine[]): AccountCodeLine[] {
  const withPrefix: Array<{ line: AccountCodeLine; prefix: number }> = [];
  const withoutPrefix: AccountCodeLine[] = [];
  for (const l of lines) {
    const p = parsePrefix(l.pl_account_code);
    if (p != null) withPrefix.push({ line: l, prefix: p });
    else withoutPrefix.push(l);
  }
  withPrefix.sort((a, b) => a.prefix - b.prefix);
  withoutPrefix.sort((a, b) =>
    a.pl_account_code.localeCompare(b.pl_account_code)
  );
  if (withPrefix.length === 0) return withoutPrefix;
  if (withoutPrefix.length === 0) return withPrefix.map((x) => x.line);
  const out: AccountCodeLine[] = [];
  out.push(withPrefix[0].line);
  out.push(...withoutPrefix);
  for (let i = 1; i < withPrefix.length; i++) out.push(withPrefix[i].line);
  return out;
}

function aggregate(
  rows: TxnRow[],
  fx: FxMap,
  categories: Category[]
): SectionBucket[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const bySection = new Map<PlSection, Map<string, Map<number, CategoryLine>>>();
  for (const s of PL_SECTION_ORDER) bySection.set(s, new Map());

  for (const r of rows) {
    if (!r.category_id) continue;
    const c = catById.get(r.category_id);
    if (!c || !c.pl_section || !c.pl_account_code) continue;
    const section = c.pl_section as PlSection;
    const secMap = bySection.get(section);
    if (!secMap) continue;

    const amt_php = toPhp(r, fx);
    const isIncomeSection = section === "Income" || section === "Other Income";
    const signed = isIncomeSection
      ? (c.is_income ? amt_php : -amt_php)
      : (c.is_income ? -amt_php : amt_php);

    let accMap = secMap.get(c.pl_account_code);
    if (!accMap) {
      accMap = new Map();
      secMap.set(c.pl_account_code, accMap);
    }
    let catLine = accMap.get(c.id);
    if (!catLine) {
      catLine = {
        category_id: c.id,
        code: c.code,
        name: c.name,
        amount_php: 0,
        txn_count: 0,
        transactions: [],
      };
      accMap.set(c.id, catLine);
    }
    catLine.amount_php += signed;
    catLine.txn_count += 1;
    catLine.transactions.push({
      id: r.id,
      transaction_date: r.transaction_date,
      label: r.vendor_payee || r.description || "(no description)",
      entry_type: r.entry_type,
      amount: Number(r.amount) || 0,
      currency: r.currency,
      amount_php: signed,
    });
  }

  const out: SectionBucket[] = [];
  for (const section of PL_SECTION_ORDER) {
    const accMap = bySection.get(section)!;
    const accountLines: AccountCodeLine[] = [];
    for (const [accountCode, catMap] of accMap.entries()) {
      const categoryLines = Array.from(catMap.values())
        .map((cl) => ({
          ...cl,
          transactions: [...cl.transactions].sort((a, b) =>
            b.transaction_date.localeCompare(a.transaction_date)
          ),
        }))
        .filter((cl) => Math.abs(cl.amount_php) > 0.005 || cl.txn_count > 0)
        .sort((a, b) => Math.abs(b.amount_php) - Math.abs(a.amount_php));
      const amount_php = categoryLines.reduce((a, cl) => a + cl.amount_php, 0);
      const txn_count = categoryLines.reduce((a, cl) => a + cl.txn_count, 0);
      accountLines.push({
        pl_account_code: accountCode,
        amount_php,
        txn_count,
        categories: categoryLines,
      });
    }
    const visibleLines = sortAccountLines(
      accountLines.filter(
        (l) => Math.abs(l.amount_php) > 0.005 || l.txn_count > 0
      )
    );
    const subtotal = visibleLines.reduce((a, l) => a + l.amount_php, 0);
    out.push({ section, lines: visibleLines, subtotal });
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

  const [rows, setRows] = useState<TxnRow[]>([]);
  const [fx, setFx] = useState<FxMap>({});
  const [categories, setCategories] = useState<Category[]>([]);

  const [openLines, setOpenLines] = useState<Set<string>>(new Set());
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [txnLimits, setTxnLimits] = useState<Record<string, number>>({});

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
        const [txRes, catRes, fxRes] = await Promise.all([
          sb
            .from("fin_transactions")
            .select(
              "id, transaction_date, entry_type, amount, currency, category_id, description, vendor_payee, notes, from_account_id, to_account_id, status, submitted_by"
            )
            .gte("transaction_date", startISO)
            .lte("transaction_date", endISO)
            .order("transaction_date", { ascending: true }),
          sb.from("fin_categories").select("*").eq("is_active", true),
          sb.from("fin_fx_rates_monthly").select("year, month, avg_rate"),
        ]);
        if (cancelled) return;
        if (txRes.error) throw txRes.error;
        if (catRes.error) throw catRes.error;

        const raw = (txRes.data as TxnRow[]) || [];
        const filtered = raw.filter((r) => {
          if (NON_PL_ENTRY_TYPES.includes(r.entry_type as any)) return false;
          if (r.status === "reversed" || r.status === "flagged") return false;
          if (r.submitted_by === "historical_reconciliation") return false;
          return true;
        });
        setRows(filtered);
        setCategories((catRes.data as Category[]) || []);
        setFx(buildFxMap((fxRes.data as FxRow[]) || []));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load P and L");
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
  const usdRate = useMemo(
    () => periodAvgUsdRate(fx, startISO, endISO),
    [fx, startISO, endISO]
  );

  const income = sections.find((s) => s.section === "Income")?.subtotal ?? 0;
  const cogs = sections.find((s) => s.section === "Cost of Goods Sold")?.subtotal ?? 0;
  const otherIncome = sections.find((s) => s.section === "Other Income")?.subtotal ?? 0;
  const expenses = sections.find((s) => s.section === "Expenses")?.subtotal ?? 0;
  const otherExpenses = sections.find((s) => s.section === "Other Expenses")?.subtotal ?? 0;

  const grossProfit = income - cogs;
  const netEarnings = grossProfit + otherIncome - expenses - otherExpenses;

  function toggleLine(key: string) {
    setOpenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleCat(key: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function showAllTxns(key: string, total: number) {
    setTxnLimits((prev) => ({ ...prev, [key]: total }));
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const header: any[][] = [
      ["NUMAT Sustainable Manufacturing Inc."],
      ["Profit and Loss Statement, Assembly Works format"],
      [`Period: ${startISO} to ${endISO}`],
      ["Actual Cash Basis, figures reflect actual cash movements from the bank ledger"],
      [`Average period USD rate: ${usdRate.toFixed(4)} PHP per USD`],
      [],
    ];

    const body: any[][] = [];
    body.push(["Line item", "Amount (PHP)", "Amount (USD)", "Txn count"]);

    const sign = (s: PlSection, amt: number) =>
      s === "Income" || s === "Other Income" ? amt : -amt;

    const pushSection = (s: PlSection) => {
      const b = sections.find((x) => x.section === s);
      if (!b) return;
      const sub = sign(s, b.subtotal);
      body.push([s, sub.toFixed(2), (sub / usdRate).toFixed(2), ""]);
      for (const l of b.lines) {
        const v = sign(s, l.amount_php);
        body.push([
          `    ${l.pl_account_code}`,
          v.toFixed(2),
          (v / usdRate).toFixed(2),
          l.txn_count,
        ]);
      }
      body.push([
        `Total for ${s}`,
        sub.toFixed(2),
        (sub / usdRate).toFixed(2),
        "",
      ]);
      body.push([]);
    };

    pushSection("Income");
    pushSection("Cost of Goods Sold");
    body.push([
      "Gross Profit",
      grossProfit.toFixed(2),
      (grossProfit / usdRate).toFixed(2),
      "",
    ]);
    body.push([]);
    pushSection("Other Income");
    pushSection("Expenses");
    pushSection("Other Expenses");
    body.push([
      "Net earnings",
      netEarnings.toFixed(2),
      (netEarnings / usdRate).toFixed(2),
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...header, ...body]);
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    XLSX.writeFile(wb, `NUMAT_PL_${startISO}_to_${endISO}.xlsx`);
  }

  // ---------------------------------------------------------------------------
  // Section block renderer
  // ---------------------------------------------------------------------------

  function SectionBlock({ section }: { section: PlSection }) {
    const bucket = sections.find((s) => s.section === section);
    if (!bucket) return null;
    const isIncomeSection = section === "Income" || section === "Other Income";
    const displaySub = isIncomeSection ? bucket.subtotal : -bucket.subtotal;

    return (
      <>
        <tr className="bg-neutral-50">
          <td className="px-2 md:px-4 py-3 font-semibold text-neutral-900" colSpan={2}>
            {PL_SECTION_LABELS[section]}
          </td>
          <td className="px-2 md:px-4 py-3"></td>
          <td className="hidden md:table-cell px-2 md:px-4 py-3"></td>
        </tr>

        {bucket.lines.length === 0 && (
          <tr>
            <td colSpan={4} className="px-2 md:px-4 py-2 pl-6 md:pl-10 text-sm text-neutral-500">
              No activity in this section for the selected period.
            </td>
          </tr>
        )}

        {bucket.lines.map((line) => {
          const lineKey = `${section}:${line.pl_account_code}`;
          const open = openLines.has(lineKey);
          const displayLineAmt = isIncomeSection
            ? line.amount_php
            : -line.amount_php;

          return (
            <FragmentRow key={lineKey}>
              <tr
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => toggleLine(lineKey)}
              >
                <td className="px-2 md:px-4 py-2 pl-4 md:pl-6" colSpan={2}>
                  <span className="inline-flex items-center gap-2 text-neutral-800">
                    <Chevron open={open} />
                    <span>{line.pl_account_code}</span>
                    <span className="text-xs text-neutral-500">
                      ({line.txn_count} {line.txn_count === 1 ? "txn" : "txns"})
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 md:px-4 py-2 text-right tabular-nums">
                  {peso(displayLineAmt)}
                </td>
                <td className="hidden md:table-cell px-2 md:px-4 py-2 text-right tabular-nums text-neutral-600">
                  {usd(displayLineAmt / usdRate)}
                </td>
              </tr>

              {open && (
                <tr>
                  <td colSpan={4} className="bg-neutral-50 px-2 md:px-4 py-3">
                    <div className="rounded-md border border-neutral-200 bg-white p-3">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Breakdown for {line.pl_account_code}
                      </div>
                      {line.categories.length === 0 && (
                        <div className="text-sm text-neutral-500">
                          No sub categories.
                        </div>
                      )}
                      <div className="divide-y divide-neutral-100">
                        {line.categories.map((cat) => {
                          const catKey = `${lineKey}:${cat.category_id}`;
                          const catOpen = openCats.has(catKey);
                          const displayCatAmt = isIncomeSection
                            ? cat.amount_php
                            : -cat.amount_php;
                          const limit = txnLimits[catKey] ?? 50;
                          const shownTxns = cat.transactions.slice(0, limit);

                          return (
                            <div key={catKey} className="py-2">
                              <button
                                type="button"
                                onClick={() => toggleCat(catKey)}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <span className="inline-flex items-center gap-2 text-sm text-neutral-800">
                                  <Chevron open={catOpen} small />
                                  <span className="font-medium">
                                    {cat.name}
                                  </span>
                                  <span className="text-xs text-neutral-500">
                                    {cat.code}, {cat.txn_count}{" "}
                                    {cat.txn_count === 1 ? "txn" : "txns"}
                                  </span>
                                </span>
                                <span className="flex items-center gap-4 tabular-nums">
                                  <span className="text-sm text-neutral-900">
                                    {peso(displayCatAmt)}
                                  </span>
                                  <span className="text-xs text-neutral-500">
                                    {usd(displayCatAmt / usdRate)}
                                  </span>
                                </span>
                              </button>

                              {catOpen && (
                                <div className="mt-2 overflow-hidden rounded border border-neutral-200">
                                  <table className="w-full text-xs">
                                    <thead className="bg-neutral-50 text-neutral-500">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium">Date</th>
                                        <th className="px-3 py-2 text-left font-medium">Description</th>
                                        <th className="px-3 py-2 text-left font-medium">Entry type</th>
                                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                                        <th className="px-3 py-2 text-right font-medium">Currency</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                      {shownTxns.map((t) => {
                                        const tAmtDisplay = isIncomeSection
                                          ? Math.abs(t.amount_php)
                                          : -Math.abs(t.amount_php);
                                        return (
                                          <tr key={t.id}>
                                            <td className="px-3 py-1.5 text-neutral-700">
                                              {formatIsoDate(t.transaction_date)}
                                            </td>
                                            <td className="px-3 py-1.5 text-neutral-800">
                                              {t.label}
                                            </td>
                                            <td className="px-3 py-1.5 text-neutral-600">
                                              {prettyEntryType(t.entry_type)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums text-neutral-900">
                                              {peso(tAmtDisplay)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums text-neutral-500">
                                              {t.currency}
                                              {t.currency !== "PHP"
                                                ? `, ${t.amount.toLocaleString(
                                                    "en-US",
                                                    {
                                                      minimumFractionDigits: 2,
                                                      maximumFractionDigits: 2,
                                                    }
                                                  )}`
                                                : ""}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  {cat.transactions.length > limit && (
                                    <div className="bg-white px-3 py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          showAllTxns(
                                            catKey,
                                            cat.transactions.length
                                          )
                                        }
                                        className="text-xs text-blue-600 hover:underline"
                                      >
                                        Show all {cat.transactions.length} transactions
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </FragmentRow>
          );
        })}

        <tr className="bg-neutral-50">
          <td className="px-2 md:px-4 py-2 pl-4 md:pl-6 font-semibold text-neutral-800" colSpan={2}>
            Total for {PL_SECTION_LABELS[section]}
          </td>
          <td className="whitespace-nowrap px-2 md:px-4 py-2 text-right font-semibold tabular-nums">
            {peso(displaySub)}
          </td>
          <td className="hidden md:table-cell px-2 md:px-4 py-2 text-right font-semibold tabular-nums text-neutral-600">
            {usd(displaySub / usdRate)}
          </td>
        </tr>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/finance/reports"
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            &larr; Reports
          </Link>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          {/* Header block */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Profit and Loss
              </h1>
              <div className="mt-1 text-sm text-neutral-700">
                NUMAT Sustainable Manufacturing Inc.
              </div>
              <div className="text-sm text-neutral-500">
                {prettyPeriod(periodKind, year, month, startISO, endISO)}
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  Actual Cash Basis
                </span>
                <div className="mt-2 max-w-xl text-xs text-neutral-500">
                  These figures reflect actual cash movements from the bank
                  ledger, not accruals. Prepared for internal use and investor
                  updates.
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-neutral-500">
              <div className="font-medium text-neutral-700">
                Average period USD rate: {usdRate.toFixed(4)} PHP per USD
              </div>
              <div className="mt-1 max-w-[20rem]">
                FX: BSP monthly averages, fin_fx_rates_monthly (USD), flat 43.0
                PHP per SGD.
              </div>
              <button
                onClick={exportXlsx}
                className="mt-3 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
              >
                Export to Excel
              </button>
            </div>
          </div>

          {/* Period controls */}
          <div className="mt-5 flex flex-wrap items-end gap-3 border-b border-neutral-200 pb-5">
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
                  onWheel={(e) => e.currentTarget.blur()}
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
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {name}
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

            <div className="ml-auto text-right text-xs text-neutral-500">
              <div>
                {startISO} to {endISO}
              </div>
              <div>{rows.length.toLocaleString()} transactions included</div>
            </div>
          </div>

          {loading && (
            <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
              Loading P and L, please wait.
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-5 overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wider text-neutral-600">
                  <tr>
                    <th className="px-2 md:px-4 py-3 font-medium" colSpan={2}>
                      Line item
                    </th>
                    <th className="px-2 md:px-4 py-3 text-right font-medium">
                      Amount (PHP)
                    </th>
                    <th className="hidden md:table-cell px-2 md:px-4 py-3 text-right font-medium">
                      Amount (USD)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  <SectionBlock section="Income" />
                  <SectionBlock section="Cost of Goods Sold" />

                  <tr className="bg-neutral-100">
                    <td
                      className="px-2 md:px-4 py-3 font-semibold text-neutral-900"
                      colSpan={2}
                    >
                      Gross Profit
                    </td>
                    <td className="whitespace-nowrap px-2 md:px-4 py-3 text-right font-semibold tabular-nums">
                      {peso(grossProfit)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-semibold tabular-nums text-neutral-700">
                      {usd(grossProfit / usdRate)}
                    </td>
                  </tr>

                  <SectionBlock section="Other Income" />
                  <SectionBlock section="Expenses" />
                  <SectionBlock section="Other Expenses" />

                  <tr className="bg-neutral-900 text-white">
                    <td
                      className="px-2 md:px-4 py-4 text-base font-semibold"
                      colSpan={2}
                    >
                      Net earnings
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-base font-semibold tabular-nums">
                      {peso(netEarnings)}
                    </td>
                    <td className="hidden md:table-cell px-2 md:px-4 py-4 text-right text-base font-semibold tabular-nums">
                      {usd(netEarnings / usdRate)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom info panel */}
          <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700">
            <div className="mb-3 text-sm font-semibold text-neutral-900">
              What is excluded from this P&amp;L and why
            </div>
            <ul className="space-y-2 text-sm leading-6 text-neutral-700">
              <li>
                <span className="font-medium text-neutral-900">
                  Transfers between accounts:
                </span>{" "}
                moving money from OCBC to RCBC is not spending. Excluded because
                it is not a real expense.
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  Salary advances:
                </span>{" "}
                a salary advance is a loan to the employee that is recovered
                later from their salary. Including it would double count the
                same compensation.
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  Revolving fund movements:
                </span>{" "}
                topping up the B22 factory fund is cash movement, not expense.
                Expenses happen later when the factory actually buys fuel,
                supplies or pays contractors.
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  Shareholder advances and drawings:
                </span>{" "}
                when a shareholder takes money out it reduces equity, it is not
                an operating expense.
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  Reversed entries:
                </span>{" "}
                the original entry already hit the ledger, so counting the
                reversal too would double count. Both sides are netted out.
              </li>
              <li>
                <span className="font-medium text-neutral-900">
                  Reconciliation plugs:
                </span>{" "}
                these are balance adjustments booked to force the database to
                match what the bank statement actually shows. They are parked
                in a suspense account for investigation, not real business
                activity.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Small presentational helpers
// -----------------------------------------------------------------------------

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  const sz = small ? 12 : 14;
  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 20 20"
      fill="none"
      className={`shrink-0 text-neutral-500 transition-transform ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="M7 5l6 5l-6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
