'use client';

// app/crm/production/forecast/page.tsx
//
// Production demand and raw material forecast dashboard.
// Shows last 6 months actuals plus a 3-month forward forecast for boards,
// and the implied veneer and slat consumption based on recent ratios.

import { useEffect, useState } from 'react';

type MonthlyRow = {
  month: string;
  sku_family: string;
  runs: number;
  boards_passed: number;
  boards_produced: number;
  veneers_consumed: number;
  defects: number;
  pass_rate_pct: number | null;
};

type SlatMonthlyRow = {
  month: string;
  supplier: string;
  receipts: number;
  slats_received: number;
  slats_borax_pass: number | null;
};

type BoardForecastRow = {
  forecast_month: string;
  forecast_boards: number;
  moving_avg_3mo: number;
  linear_trend: number;
  slope_boards_per_month: number;
};

type MaterialForecastRow = {
  forecast_month: string;
  forecast_boards: number;
  veneers_per_board: number;
  veneers_needed: number;
  slats_needed_estimate: number;
};

type ApiResponse = {
  monthly: MonthlyRow[];
  slat_monthly: SlatMonthlyRow[];
  board_forecast: BoardForecastRow[];
  material_forecast: MaterialForecastRow[];
  notes: string[];
};

function fmtMonth(d: string): string {
  return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short' });
}

export default function ProductionForecastPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/production/forecast', { credentials: 'include' });
      if (res.status === 403) throw new Error('Sign in to a CRM account to view this page.');
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const monthlyTotals: { month: string; boards: number; defects: number }[] = (() => {
    if (!data) return [];
    const map = new Map<string, { boards: number; defects: number }>();
    for (const row of data.monthly) {
      const cur = map.get(row.month) ?? { boards: 0, defects: 0 };
      cur.boards += row.boards_passed || 0;
      cur.defects += row.defects || 0;
      map.set(row.month, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, ...v }));
  })();

  const sparseData = monthlyTotals.length < 3;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Production Forecast</h1>
          <p className="text-sm text-slate-600">
            Board output and raw material needs for the next 3 months.
          </p>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-500">Loading...</div>
        ) : data ? (
          <>
            {sparseData && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded">
                <div className="font-semibold text-amber-900">Not enough data yet</div>
                <div className="text-sm text-amber-800 mt-1">
                  The forecast needs at least 3 months of board production data to produce useful
                  projections. Right now there are {monthlyTotals.length} month(s) of data. Keep
                  logging production runs and the forecast will populate automatically.
                </div>
              </div>
            )}

            {/* Actuals */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Last 6 months actuals
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="text-left p-2 border-b">Month</th>
                      <th className="text-right p-2 border-b">Boards passed</th>
                      <th className="text-right p-2 border-b">Defects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTotals.map((m) => (
                      <tr key={m.month} className="border-b">
                        <td className="p-2">{fmtMonth(m.month)}</td>
                        <td className="p-2 text-right font-medium">{m.boards.toLocaleString()}</td>
                        <td className="p-2 text-right text-slate-600">
                          {m.defects.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {monthlyTotals.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-slate-500 text-center">
                          No production logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Board forecast */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Board output forecast (next 3 months)
              </h2>
              {data.board_forecast.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm">
                  No forecast yet. The system needs at least 1 month of actuals before it can
                  project forward.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="text-left p-2 border-b">Month</th>
                        <th className="text-right p-2 border-b">Forecast boards</th>
                        <th className="text-right p-2 border-b">3-mo avg</th>
                        <th className="text-right p-2 border-b">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.board_forecast.map((f) => (
                        <tr key={f.forecast_month} className="border-b">
                          <td className="p-2 font-medium">{fmtMonth(f.forecast_month)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-700">
                            {f.forecast_boards.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-slate-600">
                            {f.moving_avg_3mo.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-slate-600">
                            {f.linear_trend.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-slate-500 mt-2">
                    Trend slope: {data.board_forecast[0]?.slope_boards_per_month ?? 0} boards / month.
                  </div>
                </div>
              )}
            </section>

            {/* Material forecast */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Raw material needs (implied by forecast)
              </h2>
              {data.material_forecast.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm">
                  No material forecast yet (needs board forecast + veneer-per-board ratio).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="text-left p-2 border-b">Month</th>
                        <th className="text-right p-2 border-b">Boards</th>
                        <th className="text-right p-2 border-b">Veneers needed</th>
                        <th className="text-right p-2 border-b">Slats needed (est.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.material_forecast.map((m) => (
                        <tr key={m.forecast_month} className="border-b">
                          <td className="p-2 font-medium">{fmtMonth(m.forecast_month)}</td>
                          <td className="p-2 text-right">{m.forecast_boards.toLocaleString()}</td>
                          <td className="p-2 text-right text-blue-700 font-semibold">
                            {m.veneers_needed.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-blue-700">
                            {m.slats_needed_estimate.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-slate-500 mt-2">
                    Ratio used: {data.material_forecast[0]?.veneers_per_board?.toFixed(2) ?? '?'} veneers/board, ~12 slats per veneer (factory rule of thumb).
                  </div>
                </div>
              )}
            </section>

            {/* Slat receipts actuals */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Slat receipts (actuals)</h2>
              {data.slat_monthly.length === 0 ? (
                <div className="text-slate-500 text-sm">No slat receipts logged yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="text-left p-2 border-b">Month</th>
                        <th className="text-left p-2 border-b">Supplier</th>
                        <th className="text-right p-2 border-b">Receipts</th>
                        <th className="text-right p-2 border-b">Slats received</th>
                        <th className="text-right p-2 border-b">Borax pass</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slat_monthly.slice(-12).map((r, i) => (
                        <tr key={`${r.month}-${r.supplier}-${i}`} className="border-b">
                          <td className="p-2">{fmtMonth(r.month)}</td>
                          <td className="p-2">{r.supplier}</td>
                          <td className="p-2 text-right">{r.receipts}</td>
                          <td className="p-2 text-right">{r.slats_received?.toLocaleString()}</td>
                          <td className="p-2 text-right text-emerald-700">
                            {r.slats_borax_pass?.toLocaleString() ?? '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="text-xs text-slate-500">
              <div className="font-semibold mb-1">Methodology</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {data.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
