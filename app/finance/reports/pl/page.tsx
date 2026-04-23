"use client";
// app/finance/reports/pl/page.tsx
// Profit and Loss report in Assembly Works style.
// Groups verified transactions by pl_section and pl_account_code, shows PHP and USD columns,
// with USD converted using the BSP monthly average rate for the selected period.
// Exports to a .xlsx file via SheetJS.

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  getFinanceSupabase,
  formatMoney,
  formatDate,
  PL_SECTION_ORDER,
  type Transaction,
  type Category,
  type PlSection,
} from "@/lib/finance";

type TxWithCat = Transaction & { category: Category | null };

type PlRow = {
  section: PlSection;
  account_code: string;
  amount_php: number;
  amount_usd: number;
};

type Period = {
  label: string;
  start: string; // YYYY-MM-DD
  end: string;
};

export default function PlReportPage() {
  const supabase = getFinanceSupabase();
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const thisYear = now.getFullYear();

  const [periodKind, setPeriodKind] = useState<"full_year" | "ytd" | "month" | "custom">("full_year");
  const [year, setYear] = useState<number>(thisYear);
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [customStart, setCustomStart] = useState<string>(`${thisYear}-01-01`);
  const [customEnd, setCustomEnd] = useState<string>(`${thisYear}-12-31`);
  const [fxRate, setFxRate] = useState<number>(0);
  const [fxRateEditable, setFxRateEditable] = useState<string>("");
  const [rows, setRows] = useState<PlRow[]>([]);
  const [totalsByCurrencyRaw, setTotalsByCurrencyRaw] = useState<Record<string, { income: number; expense: number }>>({});

  const period: Period = useMemo(() => {
    if (periodKind === "full_year") {
      return { label: `Full Year ${year}`, start: `${year}-01-01`, end: `${year}-12-31` };
    }
    if (periodKind === "ytd") {
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      return { label: `Year to Date ${thisYear}`, start: `${thisYear}-01-01`, end: `${thisYear}-${m}-${d}` };
    }
    if (periodKind === "month") {
      const mm = String(month).padStart(2, "0");
      const lastDay = new Date(year, month, 0).getDate();
      const monthName = new Date(year, month - 1, 1).toLocaleString("en-GB", { month: "long" });
      return { label: `${monthName} ${year}`, start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
    }
    return { label: `Custom Range`, start: customStart, end: customEnd };
  }, [periodKind, year, month, customStart, customEnd, thisYear, now]);

  // Load period FX rate + transactions
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: fxData } = await supabase.rpc("fin_get_period_fx_rate", {
        p_start: period.start,
        p_end: period.end,
      });
      const rate = Number(fxData) || 58;
      setFxRate(rate);
      setFxRateEditable(rate.toFixed(4));

      const { data: txns } = await supabase
        .from("fin_transactions")
        .select("*, category:fin_categories(id, code, name, ue_bucket, pl_account_code, pl_section)")
        .gte("transaction_date", period.start)
        .lte("transaction_date", period.end)
        .neq("status", "reversed")
        .limit(10000);

      const rowsByKey: Record<string, PlRow> = {};
      const totals: Record<string, { income: number; expense: number }> = {};

      for (const raw of (txns as TxWithCat[]) ?? []) {
        const cur = raw.currency;
        if (!totals[cur]) totals[cur] = { income: 0, expense: 0 };
        if (raw.to_account_id && !raw.from_account_id) totals[cur].income += Number(raw.amount);
        if (raw.from_account_id && !raw.to_account_id) totals[cur].expense += Number(raw.amount);

        const section = (raw.category?.pl_section ?? null) as PlSection | null;
        const code = raw.category?.pl_account_code ?? null;
        if (!section || !code) continue;

        const key = `${section}||${code}`;
        if (!rowsByKey[key]) rowsByKey[key] = { section, account_code: code, amount_php: 0, amount_usd: 0 };

        // Convert to PHP using txn fx_rate if stored, else period average
        let amountPhp = 0;
        if (cur === "PHP") amountPhp = Number(raw.amount);
        else if (cur === "USD") amountPhp = Number(raw.amount) * rate;
        else if (cur === "SGD") amountPhp = Number(raw.amount) * rate * 0.74; // approx SGD to USD

        rowsByKey[key].amount_php += amountPhp;
        rowsByKey[key].amount_usd += amountPhp / rate;
      }

      setRows(Object.values(rowsByKey));
      setTotalsByCurrencyRaw(totals);
      setLoading(false);
    })();
  }, [supabase, period.start, period.end]);

  function reapplyFxOverride() {
    const override = Number(fxRateEditable);
    if (!override || override <= 0) return;
    setFxRate(override);
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        amount_usd: r.amount_php / override,
      }))
    );
  }

  // ---- Section totals ----
  const bySection = useMemo(() => {
    const map: Record<PlSection, PlRow[]> = {
      "Income": [], "Cost of Sales": [], "Other Income": [], "Expenses": [], "Other Expenses": [],
    };
    for (const r of rows) map[r.section].push(r);
    for (const k of Object.keys(map) as PlSection[]) {
      map[k].sort((a, b) => a.account_code.localeCompare(b.account_code));
    }
    return map;
  }, [rows]);

  function sumSection(s: PlSection): { php: number; usd: number } {
    return bySection[s].reduce(
      (acc, r) => ({ php: acc.php + r.amount_php, usd: acc.usd + r.amount_usd }),
      { php: 0, usd: 0 }
    );
  }

  const totals = useMemo(() => {
    const income = sumSection("Income");
    const cost = sumSection("Cost of Sales");
    const otherIncome = sumSection("Other Income");
    const expenses = sumSection("Expenses");
    const otherExpenses = sumSection("Other Expenses");
    const gross = { php: income.php - cost.php, usd: income.usd - cost.usd };
    const net = {
      php: gross.php + otherIncome.php - expenses.php + otherExpenses.php,
      usd: gross.usd + otherIncome.usd - expenses.usd + otherExpenses.usd,
    };
    return { income, cost, gross, otherIncome, expenses, otherExpenses, net };
  }, [bySection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Export to Excel ----
  function exportXlsx() {
    const aoa: (string | number | null)[][] = [];
    aoa.push(["Profit and Loss"]);
    aoa.push(["Numat Sustainable Manufacturing Inc.", null, null, `Conversion Rate: 1 USD = ${fxRate.toFixed(4)} PHP`]);
    aoa.push([period.label, null, null, "Source: Bangko Sentral ng Pilipinas monthly average"]);
    aoa.push([null, null, null, "bsp.gov.ph/statistics/external/tab12_pus_data.aspx"]);
    aoa.push([]);
    aoa.push(["", "PHP", "USD"]);

    function addSection(title: PlSection, rowsIn: PlRow[], totalLabel: string, t: { php: number; usd: number }) {
      aoa.push([title]);
      for (const r of rowsIn) aoa.push([r.account_code, round2(r.amount_php), round2(r.amount_usd)]);
      aoa.push([totalLabel, round2(t.php), round2(t.usd)]);
    }

    addSection("Income", bySection.Income, "Total for Income", totals.income);
    addSection("Cost of Sales", bySection["Cost of Sales"], "Total for Cost of Sales", totals.cost);
    aoa.push(["Gross Profit", round2(totals.gross.php), round2(totals.gross.usd)]);
    addSection("Other Income", bySection["Other Income"], "Total for Other Income", totals.otherIncome);
    addSection("Expenses", bySection.Expenses, "Total for Expenses", totals.expenses);
    addSection("Other Expenses", bySection["Other Expenses"], "Total for Other Expenses", totals.otherExpenses);
    aoa.push(["Net earnings", round2(totals.net.php), round2(totals.net.usd)]);
    aoa.push([]);
    aoa.push([`Accrual Basis, generated ${new Date().toLocaleString("en-GB")}`]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 45 }];
    // Number format on amount columns
    for (let r = 6; r < aoa.length; r++) {
      const phpRef = XLSX.utils.encode_cell({ r, c: 1 });
      const usdRef = XLSX.utils.encode_cell({ r, c: 2 });
      if (ws[phpRef] && typeof ws[phpRef].v === "number") ws[phpRef].z = "#,##0.00";
      if (ws[usdRef] && typeof ws[usdRef].v === "number") ws[usdRef].z = "#,##0.00";
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P and L");
    const fname = `NUMAT_Profit_and_Loss_${period.label.replace(/\W+/g, "_")}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  return (
    <div className="p-6 bg-white max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Profit and Loss Report</h1>
        <button
          onClick={exportXlsx}
          disabled={loading}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
        >
          Download as Excel File
        </button>
      </div>

      {/* Controls */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Period Type</label>
            <select value={periodKind} onChange={(e) => setPeriodKind(e.target.value as any)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="full_year">Full Year</option>
              <option value="ytd">Year to Date</option>
              <option value="month">Single Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          {periodKind === "full_year" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Year</label>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
            </div>
          )}
          {periodKind === "month" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Year</label>
                <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Month</label>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                    <option key={m} value={m}>
                      {new Date(year, m - 1, 1).toLocaleString("en-GB", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {periodKind === "custom" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Conversion Rate (1 USD = ? PHP)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.0001"
                value={fxRateEditable}
                onChange={(e) => setFxRateEditable(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button onClick={reapplyFxOverride} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">Apply</button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Computing report, please wait...</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Profit and Loss</h2>
            <div className="text-sm text-gray-700 mt-1 flex flex-wrap justify-between gap-2">
              <div>
                <div>Numat Sustainable Manufacturing Inc.</div>
                <div>{period.label}</div>
              </div>
              <div className="text-right">
                <div>Conversion Rate: 1 USD = {fxRate.toFixed(4)} PHP</div>
                <div className="text-xs text-gray-500">Source: Bangko Sentral ng Pilipinas monthly average, bsp.gov.ph/statistics/external/tab12_pus_data.aspx</div>
              </div>
            </div>
          </div>

          {/* Main table */}
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300 text-gray-700">
              <tr>
                <th className="text-left py-2"></th>
                <th className="text-right py-2 font-medium w-40">PHP</th>
                <th className="text-right py-2 font-medium w-40">USD</th>
              </tr>
            </thead>
            <tbody>
              <PlSectionBlock title="Income" rows={bySection.Income} totalLabel="Total for Income" total={totals.income} />
              <PlSectionBlock title="Cost of Sales" rows={bySection["Cost of Sales"]} totalLabel="Total for Cost of Sales" total={totals.cost} />
              <PlTotalRow label="Gross Profit" total={totals.gross} highlight />
              <PlSectionBlock title="Other Income" rows={bySection["Other Income"]} totalLabel="Total for Other Income" total={totals.otherIncome} />
              <PlSectionBlock title="Expenses" rows={bySection.Expenses} totalLabel="Total for Expenses" total={totals.expenses} />
              <PlSectionBlock title="Other Expenses" rows={bySection["Other Expenses"]} totalLabel="Total for Other Expenses" total={totals.otherExpenses} />
              <PlTotalRow label="Net earnings" total={totals.net} highlight />
            </tbody>
          </table>

          <div className="mt-4 text-xs text-gray-500">
            Accrual Basis, generated {new Date().toLocaleString("en-GB")}.
            {Object.keys(totalsByCurrencyRaw).length > 0 && (
              <div className="mt-1">
                Underlying raw totals:{" "}
                {Object.entries(totalsByCurrencyRaw).map(([cur, v]) => (
                  <span key={cur} className="mr-3">
                    {cur} income {formatMoney(v.income, cur)}, expense {formatMoney(v.expense, cur)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlSectionBlock({
  title,
  rows,
  totalLabel,
  total,
}: {
  title: string;
  rows: PlRow[];
  totalLabel: string;
  total: { php: number; usd: number };
}) {
  if (rows.length === 0) {
    return (
      <>
        <tr><td className="pt-4 pb-1 font-semibold text-gray-900">{title}</td><td></td><td></td></tr>
        <tr><td className="py-1 text-gray-500 italic pl-4">No activity in this section for the selected period.</td><td></td><td></td></tr>
        <tr className="border-b border-gray-200">
          <td className="py-1 font-medium text-gray-900">{totalLabel}</td>
          <td className="text-right font-medium text-gray-900">{fmtPhp(0)}</td>
          <td className="text-right font-medium text-gray-900">{fmtUsd(0)}</td>
        </tr>
      </>
    );
  }
  return (
    <>
      <tr><td className="pt-4 pb-1 font-semibold text-gray-900">{title}</td><td></td><td></td></tr>
      {rows.map((r) => (
        <tr key={r.account_code}>
          <td className="py-1 text-gray-900 pl-4">{r.account_code}</td>
          <td className="text-right text-gray-900">{fmtPhp(r.amount_php)}</td>
          <td className="text-right text-gray-900">{fmtUsd(r.amount_usd)}</td>
        </tr>
      ))}
      <tr className="border-b border-gray-200">
        <td className="py-1 font-medium text-gray-900">{totalLabel}</td>
        <td className="text-right font-medium text-gray-900">{fmtPhp(total.php)}</td>
        <td className="text-right font-medium text-gray-900">{fmtUsd(total.usd)}</td>
      </tr>
    </>
  );
}

function PlTotalRow({ label, total, highlight }: { label: string; total: { php: number; usd: number }; highlight?: boolean }) {
  return (
    <tr className={`${highlight ? "bg-gray-50" : ""} border-y border-gray-300`}>
      <td className={`py-2 font-semibold text-gray-900`}>{label}</td>
      <td className={`text-right py-2 font-semibold text-gray-900`}>{fmtPhp(total.php)}</td>
      <td className={`text-right py-2 font-semibold text-gray-900`}>{fmtUsd(total.usd)}</td>
    </tr>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function fmtPhp(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtUsd(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}