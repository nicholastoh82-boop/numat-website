"use client";

import { useEffect, useRef, useState } from "react";
import type { Chart as ChartType } from "chart.js";

type DashboardData = {
  snapshot: any;
  impact: any;
  trend: any[];
  derived: any;
};

function fmtUsd(n: number, opts: { decimals?: number; short?: boolean } = {}) {
  const { decimals = 0, short = false } = opts;
  if (short) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(decimals)}k`;
  }
  return `$${n.toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function fmtPct(n: number, decimals = 1) {
  return `${n.toFixed(decimals)}%`;
}

function fmtNumber(n: number, decimals = 0) {
  return n.toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Dashboard({ data }: { data: DashboardData }) {
  const { snapshot, impact, trend, derived } = data;

  // Chart canvases
  const paybackRef = useRef<HTMLCanvasElement>(null);
  const marginRef = useRef<HTMLCanvasElement>(null);
  const trendRef = useRef<HTMLCanvasElement>(null);
  const runwayRef = useRef<HTMLCanvasElement>(null);
  const productRef = useRef<HTMLCanvasElement>(null);

  const charts = useRef<{ runway: ChartType | null }>({ runway: null });

  const [scenarioKey, setScenarioKey] = useState<string>("base");

  // Build all charts on mount
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    (async () => {
      const Chart = (await import("chart.js/auto")).default;
      const created: ChartType[] = [];

      Chart.defaults.font.family = "'Geist', system-ui, sans-serif";
      Chart.defaults.color = "#2A3530";
      Chart.defaults.borderColor = "#E5E2D9";

      // Payback curve
      if (paybackRef.current) {
        const monthlyGp = derived.ltvComputed / (snapshot.ltv_retention_years * 12);
        const months = Array.from({ length: 9 }, (_, i) => i);
        const cumulative = months.map((m) => Math.round(m * monthlyGp));
        created.push(
          new Chart(paybackRef.current, {
            type: "line",
            data: {
              labels: months.map((m) => `M${m}`),
              datasets: [
                {
                  label: "Cumulative gross profit",
                  data: cumulative,
                  borderColor: "#4A5A3F",
                  backgroundColor: "rgba(74,90,63,0.08)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.25,
                  pointRadius: 0,
                  pointHoverRadius: 4,
                },
                {
                  label: "CAC (recovery threshold)",
                  data: months.map(() => snapshot.cac_total),
                  borderColor: "#A84B3A",
                  borderWidth: 1.5,
                  borderDash: [4, 4],
                  fill: false,
                  pointRadius: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  labels: { boxWidth: 10, font: { size: 11 } },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (v) => "$" + (Number(v) / 1000).toFixed(1) + "k",
                    font: { size: 10 },
                  },
                  grid: { color: "#F0EEE7" },
                },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              },
            },
          })
        );
      }

      // Margin bridge
      if (marginRef.current) {
        created.push(
          new Chart(marginRef.current, {
            type: "bar",
            data: {
              labels: [
                "Revenue",
                "COGS",
                "Gross profit",
                "Variable S&D",
                "Contribution",
                "Fixed opex",
                "EBITDA",
              ],
              datasets: [
                {
                  label: "Current",
                  data: [
                    100,
                    -derived.cogsPctOfRevenue,
                    derived.grossMarginPct,
                    -9.7,
                    derived.contributionMarginPct,
                    -((snapshot.monthly_gross_outflow / snapshot.revenue_total) *
                      100),
                    derived.ebitdaMarginPct,
                  ],
                  backgroundColor: [
                    "#4A5A3F",
                    "#A84B3A",
                    "#8A9A77",
                    "#A84B3A",
                    "#8A9A77",
                    "#A84B3A",
                    derived.ebitdaMarginPct >= 0 ? "#4A5A3F" : "#A84B3A",
                  ],
                  borderRadius: 2,
                },
                {
                  label: "At scale (40% util)",
                  data: [100, -47.6, 52.4, -9.6, 42.8, -24.6, 18.2],
                  backgroundColor: [
                    "rgba(74,90,63,0.4)",
                    "rgba(168,75,58,0.4)",
                    "rgba(138,154,119,0.4)",
                    "rgba(168,75,58,0.4)",
                    "rgba(138,154,119,0.4)",
                    "rgba(168,75,58,0.4)",
                    "rgba(74,90,63,0.7)",
                  ],
                  borderRadius: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                  labels: { boxWidth: 10, font: { size: 11 } },
                },
              },
              scales: {
                y: {
                  ticks: { callback: (v) => v + "%", font: { size: 10 } },
                  grid: { color: "#F0EEE7" },
                },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              },
            },
          })
        );
      }

      // Six month trend
      if (trendRef.current && trend.length > 0) {
        created.push(
          new Chart(trendRef.current, {
            type: "bar",
            data: {
              labels: trend.map((t) => t.period_label.slice(0, 3) + " " + t.period_label.slice(-2)),
              datasets: [
                {
                  type: "bar",
                  label: "Revenue",
                  data: trend.map((t) => Number(t.revenue_total)),
                  backgroundColor: "#4A5A3F",
                  borderRadius: 2,
                  yAxisID: "y",
                  order: 2,
                },
                {
                  type: "bar",
                  label: "COGS",
                  data: trend.map((t) => Number(t.cogs_total)),
                  backgroundColor: "#B8763E",
                  borderRadius: 2,
                  yAxisID: "y",
                  order: 2,
                },
                {
                  type: "line",
                  label: "Net burn",
                  data: trend.map((t) => Number(t.monthly_net_burn)),
                  borderColor: "#A84B3A",
                  backgroundColor: "rgba(168,75,58,0.05)",
                  borderWidth: 2,
                  fill: false,
                  tension: 0.25,
                  pointRadius: 3,
                  yAxisID: "y",
                  order: 1,
                } as any,
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                  labels: { boxWidth: 10, font: { size: 11 } },
                },
              },
              scales: {
                y: {
                  ticks: {
                    callback: (v) => "$" + (Number(v) / 1000).toFixed(0) + "k",
                    font: { size: 10 },
                  },
                  grid: { color: "#F0EEE7" },
                },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
              },
            },
          })
        );
      }

      // Runway with scenario switcher
      if (runwayRef.current) {
        const baseScenario =
          snapshot.scenarios?.find((s: any) => s.key === "base") || {
            burn: snapshot.monthly_net_burn,
          };
        const labels: string[] = [];
        const startDate = new Date(snapshot.period_end);
        for (let i = 0; i <= 24; i++) {
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + i);
          labels.push(
            d.toLocaleDateString("en", { month: "short", year: "2-digit" })
          );
        }
        const genCash = (burn: number) => {
          const out = [];
          let cash = derived.totalCash;
          for (let i = 0; i <= 24; i++) {
            out.push(Math.max(0, cash));
            cash -= burn;
          }
          return out;
        };
        const c = new Chart(runwayRef.current, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Cash balance",
                data: genCash(baseScenario.burn),
                borderColor: "#4A5A3F",
                backgroundColor: "rgba(74,90,63,0.08)",
                borderWidth: 2.5,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
              },
              {
                label: "Critical threshold (3 mo runway)",
                data: Array(25).fill(snapshot.monthly_net_burn * 3),
                borderColor: "#A84B3A",
                borderWidth: 1,
                borderDash: [4, 4],
                fill: false,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { boxWidth: 10, font: { size: 11 } },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => "$" + (Number(v) / 1000).toFixed(0) + "k",
                  font: { size: 10 },
                },
                grid: { color: "#F0EEE7" },
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, maxRotation: 0 },
              },
            },
          },
        });
        charts.current.runway = c;
        created.push(c);
      }

      // Product mix donut
      if (productRef.current) {
        created.push(
          new Chart(productRef.current, {
            type: "doughnut",
            data: {
              labels: derived.productMix.map((p: any) => p.name),
              datasets: [
                {
                  data: derived.productMix.map((p: any) => p.value),
                  backgroundColor: derived.productMix.map((p: any) => p.color),
                  borderColor: "#FFFFFF",
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: "65%",
              plugins: { legend: { display: false } },
            },
          })
        );
      }

      cleanup = () => created.forEach((c) => c.destroy());
    })();

    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scenario switcher updates the runway chart
  useEffect(() => {
    if (!charts.current.runway) return;
    const sc =
      snapshot.scenarios?.find((s: any) => s.key === scenarioKey) ||
      snapshot.scenarios?.[0];
    if (!sc) return;
    const genCash = (burn: number) => {
      const out: number[] = [];
      let cash = derived.totalCash;
      for (let i = 0; i <= 24; i++) {
        out.push(Math.max(0, cash));
        cash -= burn;
      }
      return out;
    };
    charts.current.runway.data.datasets[0].data = genCash(sc.burn);
    charts.current.runway.data.datasets[0].borderColor =
      scenarioKey === "downside" ? "#A84B3A" : "#4A5A3F";
    charts.current.runway.data.datasets[0].backgroundColor =
      scenarioKey === "downside"
        ? "rgba(168,75,58,0.06)"
        : "rgba(74,90,63,0.08)";
    charts.current.runway.update();
  }, [scenarioKey, snapshot.scenarios, derived.totalCash]);

  const currentScenario =
    snapshot.scenarios?.find((s: any) => s.key === scenarioKey) ||
    snapshot.scenarios?.[0] || {
      label: "Base",
      assumption: "Current trajectory",
      burn: snapshot.monthly_net_burn,
      funds_out: derived.fundsOutDate,
    };

  // Required revenue scenarios
  const oneHotelRevenue = derived.revenuePerSheet * (snapshot.production_sheets_per_month + 35);
  const threeHotelRevenue = derived.revenuePerSheet * (snapshot.production_sheets_per_month + 105);

  return (
    <div
      className="min-h-screen bg-white text-[#0E1410]"
      style={{
        fontFamily: "'Geist', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        :root {
          --ink: #0E1410; --ink_soft: #2A3530; --paper: #FFFFFF; --cream: #FBFAF6;
          --line: #E5E2D9; --line_soft: #F0EEE7;
          --moss: #4A5A3F; --moss_soft: #8A9A77; --moss_pale: #E8EBD9;
          --signal_amber: #B8763E; --signal_red: #A84B3A; --signal_green: #5A7A4A; --gold: #B8923A;
        }
        .display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.015em; }
        .num { font-family: 'JetBrains Mono', monospace; font-feature-settings: "tnum", "lnum"; }
        .eyebrow { font-family: 'Geist', sans-serif; text-transform: uppercase; letter-spacing: 0.18em; font-size: 11px; font-weight: 500; color: var(--ink_soft); }
        .stat_label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--ink_soft); font-weight: 500; }
        .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 500; border: 1px solid; }
        .pill_pos { color: var(--signal_green); border-color: rgba(90,122,74,0.3); background: rgba(232,235,217,0.4); }
        .pill_neg { color: var(--signal_red); border-color: rgba(168,75,58,0.3); background: rgba(168,75,58,0.05); }
        .pill_neutral { color: var(--ink_soft); border-color: var(--line); background: var(--cream); }
        .pill_warn { color: var(--signal_amber); border-color: rgba(184,118,62,0.3); background: rgba(184,118,62,0.05); }
        .card { background: var(--paper); border: 1px solid var(--line); border-radius: 4px; }
        .card_cream { background: var(--cream); border: 1px solid var(--line); border-radius: 4px; }
        .rule { border-top: 1px solid var(--line); }
        .rule_thick { border-top: 2px solid var(--ink); }
        .scenario_btn { padding: 8px 14px; border: 1px solid var(--line); background: var(--paper); font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; color: var(--ink_soft); }
        .scenario_btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .scenario_btn:hover:not(.active) { background: var(--cream); }
        .progress_track { height: 4px; background: var(--line_soft); border-radius: 2px; overflow: hidden; }
        .progress_fill { height: 100%; background: var(--moss); transition: width 1.2s ease; }
        .progress_fill_amber { background: var(--signal_amber); }
        .delta_arrow_up::before { content: "▲"; font-size: 8px; margin-right: 4px; }
        .delta_arrow_down::before { content: "▼"; font-size: 8px; margin-right: 4px; }
        .section_number { font-family: 'Fraunces', serif; font-size: 10.5px; font-weight: 500; color: var(--moss); letter-spacing: 0.1em; }
        table.compact td, table.compact th { padding: 10px 14px; font-size: 13px; }
        table.compact thead th { border-bottom: 1px solid var(--ink); text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.14em; font-weight: 500; color: var(--ink_soft); text-align: left; }
        table.compact tbody tr { border-bottom: 1px solid var(--line_soft); }
        table.compact tbody tr:last-child { border-bottom: none; }
        ::selection { background: var(--moss_pale); color: var(--ink); }
      `}</style>

      {/* CONFIDENTIALITY BANNER */}
      <div className="border-b" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="max-w-[1400px] mx-auto px-10 py-2 flex items-center justify-between text-[11px]" style={{ letterSpacing: "0.1em" }}>
          <span className="uppercase font-medium">Strictly Confidential · For Investor Eyes Only</span>
          <span className="num opacity-80">Prepared for: Paul Lam · Marie · Wavemaker Impact</span>
        </div>
      </div>

      {/* MASTHEAD */}
      <header className="max-w-[1400px] mx-auto px-10 pt-12 pb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow mb-3">NUMAT Sustainable Manufacturing Inc. · Investor Brief</div>
            <h1 className="display text-[68px] leading-[0.95] font-[400]" style={{ color: "var(--ink)" }}>
              Operating &amp; Capital<br />
              <span className="italic" style={{ color: "var(--moss)" }}>Performance Review</span>
            </h1>
            <p className="mt-5 max-w-xl text-[14px] leading-relaxed" style={{ color: "var(--ink_soft)" }}>
              A consolidated view of unit economics, margin structure, capital efficiency, and the path to operating breakeven for the Philippine manufacturing entity and Singapore holding company.
            </p>
          </div>
          <div className="text-right">
            <div className="display text-[26px] font-[500]">NUMAT</div>
            <div className="eyebrow mt-1" style={{ color: "var(--moss)" }}>est. 2024</div>
            <div className="mt-6 num text-[12px]" style={{ color: "var(--ink_soft)" }}>
              Reporting period<br />
              <span className="text-[14px]" style={{ color: "var(--ink)" }}>{snapshot.period_label}</span>
            </div>
            <div className="mt-3 num text-[11px]" style={{ color: "var(--ink_soft)" }}>
              Last updated: {new Date(snapshot.updated_at).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      {/* TABLE OF CONTENTS */}
      <div className="max-w-[1400px] mx-auto px-10 pb-6">
        <div className="rule_thick"></div>
        <div className="grid grid-cols-12 py-4 text-[11px] uppercase" style={{ letterSpacing: "0.14em", color: "var(--ink_soft)" }}>
          <a href="#snapshot" className="col-span-2">I · Snapshot</a>
                              <a href="#cash" className="col-span-2">IV · Cash &amp; Runway</a>
          <a href="#operations" className="col-span-2">V · Operations</a>
          <a href="#impact" className="col-span-2">VI · Impact &amp; Risks</a>
        </div>
        <div className="rule"></div>
      </div>

      {/* SECTION I · SNAPSHOT */}
      <section id="snapshot" className="max-w-[1400px] mx-auto px-10 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <div className="section_number">CHAPTER I</div>
            <h2 className="display text-[32px] font-[400] leading-tight">Executive Snapshot</h2>
          </div>
          <div className="text-[11px] num" style={{ color: "var(--ink_soft)" }}>
            All figures in USD unless noted · FX {snapshot.fx_rate_php_usd} PHP/USD
          </div>
        </div>

        <div className="grid grid-cols-6 gap-0 border-y" style={{ borderColor: "var(--ink)" }}>
          <div className="p-6 border-r" style={{ borderColor: "var(--line)" }}>
            <div className="stat_label">Cash on Hand</div>
            <div className="num display text-[36px] mt-3 font-[400]">{fmtUsd(derived.totalCash, { short: true })}</div>
            <div className="mt-2"><span className="pill pill_neutral num">PH {fmtUsd(snapshot.cash_ph_usd, { short: true })} · SG {fmtUsd(snapshot.cash_sg_usd, { short: true })}</span></div>
          </div>
          <div className="p-6 border-r" style={{ borderColor: "var(--line)" }}>
            <div className="stat_label">Monthly Net Burn</div>
            <div className="num display text-[36px] mt-3 font-[400]">{fmtUsd(snapshot.monthly_net_burn, { short: true, decimals: 1 })}</div>
            <div className="mt-2"><span className="pill pill_pos num delta_arrow_down">improving</span></div>
          </div>
          <div className="p-6 border-r" style={{ borderColor: "var(--line)" }}>
            <div className="stat_label">Runway</div>
            <div className="num display text-[36px] mt-3 font-[400]">{derived.runwayMonths.toFixed(1)}<span className="text-[18px] opacity-60"> mo</span></div>
            <div className="mt-2"><span className="pill pill_warn num">to {derived.fundsOutDate}</span></div>
          </div>
          <div className="p-6 border-r" style={{ borderColor: "var(--line)" }}>
            <div className="stat_label">Revenue ({snapshot.period_label.split(" ")[0]})</div>
            <div className="num display text-[36px] mt-3 font-[400]">{fmtUsd(snapshot.revenue_total, { short: true, decimals: 1 })}</div>
            <div className="mt-2">
              <span className={`pill num ${derived.revenueMomPct >= 0 ? "pill_pos delta_arrow_up" : "pill_neg delta_arrow_down"}`}>
                {Math.abs(derived.revenueMomPct).toFixed(0)}% MoM
              </span>
            </div>
          </div>
          <div className="p-6 border-r" style={{ borderColor: "var(--line)" }}>
            <div className="stat_label">Gross Margin</div>
            <div className="num display text-[36px] mt-3 font-[400]" style={{color:"var(--ink_soft)"}}>—</div>
            <div className="text-[11px] mt-1" style={{color:"var(--ink_soft)"}}>Pending cost data</div><div className="mt-2"><span className="pill pill_neg num">vs 45% target</span></div>
          </div>
          <div className="p-6">
            <div className="stat_label">Active Customers</div>
            <div className="num display text-[36px] mt-3 font-[400]">{snapshot.active_customers}</div>
            <div className="mt-2"><span className="pill pill_pos num">+{snapshot.new_customers_this_period} this period</span></div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 mt-10">
          <div className="col-span-7">
            <div className="eyebrow mb-3">CEO Commentary</div>
            <p className="display text-[22px] leading-[1.5] font-[400]">{snapshot.ceo_commentary}</p>
            <div className="mt-6 flex items-center gap-3">
              <span className="num text-[12px]" style={{ color: "var(--ink_soft)" }}>{snapshot.ceo_name}, CEO</span>
              <span className="text-[12px]" style={{ color: "var(--moss)" }}>·</span>
              <span className="num text-[12px]" style={{ color: "var(--ink_soft)" }}>{snapshot.period_label}</span>
            </div>
          </div>
          <div className="col-span-5">
            <div className="card_cream p-6">
              <div className="eyebrow mb-4">Investor Watchlist</div>
              <div className="space-y-4">
                {snapshot.watchlist_items?.map((w: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="num text-[11px] mt-[2px]" style={{ color: "var(--moss)" }}>0{i + 1}</div>
                    <div>
                      <div className="text-[13px] font-[500]">{w.title}</div>
                      <div className="text-[12px] mt-1" style={{ color: "var(--ink_soft)" }}>{w.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION II + III hidden until COGS data is captured */}
      {false && (<>
      {/* SECTION II · UNIT ECONOMICS */}
      <section id="unit_econs" className="max-w-[1400px] mx-auto px-10 py-12 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="section_number">CHAPTER II</div>
            <h2 className="display text-[32px] font-[400] leading-tight">Unit Economics</h2>
            <p className="text-[13px] mt-2 max-w-xl" style={{ color: "var(--ink_soft)" }}>
              How a typical customer relationship pays back the cost of acquiring it. Computed on a trailing six month cohort basis with B2B repeat purchase patterns.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-px" style={{ background: "var(--line)" }}>
          <div className="p-7 bg-white">
            <div className="stat_label">Customer Lifetime Value</div>
            <div className="num display text-[44px] font-[400] mt-3">{fmtUsd(derived.ltvComputed)}</div>
            <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>Avg gross profit per customer over {snapshot.ltv_retention_years} year horizon</div>
            <div className="progress_track mt-4"><div className="progress_fill" style={{ width: `${Math.min((derived.ltvComputed / 60000) * 100, 100)}%` }}></div></div>
            <div className="num text-[11px] mt-2" style={{ color: "var(--ink_soft)" }}>vs $60k Y3 target</div>
          </div>
          <div className="p-7 bg-white">
            <div className="stat_label">Customer Acquisition Cost</div>
            <div className="num display text-[44px] font-[400] mt-3">{fmtUsd(snapshot.cac_total)}</div>
            <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>Fully loaded sales and marketing spend per closed customer</div>
            <div className="progress_track mt-4"><div className="progress_fill progress_fill_amber" style={{ width: `${Math.min((snapshot.cac_total / 9000) * 100, 100)}%` }}></div></div>
            <div className="num text-[11px] mt-2" style={{ color: "var(--ink_soft)" }}>vs $9k SEA B2B materials benchmark</div>
          </div>
          <div className="p-7 bg-white">
            <div className="stat_label">LTV : CAC Ratio</div>
            <div className="num display text-[44px] font-[400] mt-3" style={{ color: "var(--moss)" }}>{derived.ltvCacRatio.toFixed(1)}×</div>
            <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>Industry healthy band is 3× to 5×</div>
            <div className="progress_track mt-4"><div className="progress_fill" style={{ width: `${Math.min((derived.ltvCacRatio / 13) * 100, 100)}%` }}></div></div>
            <div className="num text-[11px] mt-2" style={{ color: "var(--moss)" }}>Top quartile vs SaaS and materials peers</div>
          </div>
          <div className="p-7 bg-white">
            <div className="stat_label">CAC Payback Period</div>
            <div className="num display text-[44px] font-[400] mt-3">{derived.paybackMonths.toFixed(1)}<span className="text-[20px] opacity-60"> mo</span></div>
            <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>Months to recover acquisition cost via gross profit</div>
            <div className="progress_track mt-4"><div className="progress_fill" style={{ width: `${Math.min((derived.paybackMonths / 12) * 100, 100)}%` }}></div></div>
            <div className="num text-[11px] mt-2" style={{ color: "var(--ink_soft)" }}>vs 12 mo industry healthy ceiling</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 mt-12">
          <div className="col-span-7">
            <div className="eyebrow mb-3">Per Customer Economics · Decomposition</div>
            <div className="card p-6">
              <table className="compact w-full">
                <thead>
                  <tr><th>Component</th><th className="text-right">Per Customer</th><th className="text-right">% of LTV</th></tr>
                </thead>
                <tbody>
                  <tr><td>Average order value (gross)</td><td className="text-right num">{fmtUsd(snapshot.ltv_avg_order_value)}</td><td className="text-right num" style={{ color: "var(--ink_soft)" }}>·</td></tr>
                  <tr><td>Annual orders per customer</td><td className="text-right num">{snapshot.ltv_orders_per_year}</td><td className="text-right num" style={{ color: "var(--ink_soft)" }}>·</td></tr>
                  <tr><td>Annual gross revenue per customer</td><td className="text-right num">{fmtUsd(derived.annualGrossRevPerCustomer)}</td><td className="text-right num" style={{ color: "var(--ink_soft)" }}>·</td></tr>
                  <tr><td>Estimated retention horizon</td><td className="text-right num">{snapshot.ltv_retention_years} yr</td><td className="text-right num" style={{ color: "var(--ink_soft)" }}>·</td></tr>
                  <tr style={{ background: "var(--cream)" }}>
                    <td className="font-[600]">Lifetime gross revenue</td>
                    <td className="text-right num font-[600]">{fmtUsd(derived.lifetimeGrossRev)}</td>
                    <td className="text-right num font-[600]">100%</td>
                  </tr>
                  <tr><td>Less: cost of goods sold ({fmtPct(derived.cogsPctOfRevenue)})</td><td className="text-right num" style={{ color: "var(--signal_red)" }}>({fmtUsd(derived.lifetimeCogs)})</td><td className="text-right num" style={{ color: "var(--ink_soft)" }}>{fmtPct(derived.cogsPctOfRevenue)}</td></tr>
                  <tr style={{ background: "var(--moss_pale)" }}>
                    <td className="font-[600]" style={{ color: "var(--moss)" }}>Lifetime gross profit (LTV)</td>
                    <td className="text-right num font-[600]" style={{ color: "var(--moss)" }}>{fmtUsd(derived.ltvComputed)}</td>
                    <td className="text-right num font-[600]" style={{ color: "var(--moss)" }}>{fmtPct(100 - derived.cogsPctOfRevenue)}</td>
                  </tr>
                  <tr><td>Less: customer acquisition cost</td><td className="text-right num" style={{ color: "var(--signal_red)" }}>({fmtUsd(snapshot.cac_total)})</td><td className="text-right num" style={{ color: "var(--ink_soft)" }}>{((snapshot.cac_total / derived.lifetimeGrossRev) * 100).toFixed(1)}%</td></tr>
                  <tr><td className="font-[600]">Net contribution per customer</td><td className="text-right num font-[600]">{fmtUsd(derived.ltvComputed - snapshot.cac_total)}</td><td className="text-right num font-[600]">{(((derived.ltvComputed - snapshot.cac_total) / derived.lifetimeGrossRev) * 100).toFixed(1)}%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-span-5">
            <div className="eyebrow mb-3">CAC Payback Curve</div>
            <div className="card p-6">
              <div style={{ height: 280, position: "relative" }}>
                <canvas ref={paybackRef}></canvas>
              </div>
              <div className="rule mt-4 mb-4"></div>
              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div>
                  <div className="stat_label">Month 1 GP</div>
                  <div className="num text-[16px] mt-1">{fmtUsd(derived.ltvComputed / (snapshot.ltv_retention_years * 12))}</div>
                </div>
                <div>
                  <div className="stat_label">CAC recovered at</div>
                  <div className="num text-[16px] mt-1" style={{ color: "var(--moss)" }}>Month {derived.paybackMonths.toFixed(1)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION III · MARGIN STRUCTURE */}
      <section id="margins" className="max-w-[1400px] mx-auto px-10 py-12 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="section_number">CHAPTER III</div>
            <h2 className="display text-[32px] font-[400] leading-tight">Margin Structure</h2>
            <p className="text-[13px] mt-2 max-w-xl" style={{ color: "var(--ink_soft)" }}>
              Layered profitability from gross through contribution to EBITDA, both at current utilization and at modeled scale.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-7">
            <div className="eyebrow mb-3">Margin Bridge · Current vs Scaled (40% utilization)</div>
            <div className="card p-6">
              <div style={{ height: 360, position: "relative" }}><canvas ref={marginRef}></canvas></div>
            </div>
          </div>
          <div className="col-span-5">
            <div className="eyebrow mb-3">Margin Layers</div>
            <div className="card mb-3"><div className="p-5 flex items-center justify-between">
              <div>
                <div className="stat_label">Gross Margin</div>
                <div className="num display text-[28px] font-[400] mt-1">{fmtPct(derived.grossMarginPct)}</div>
                <div className="text-[11px] mt-1" style={{ color: "var(--ink_soft)" }}>Revenue less direct materials and factory labor</div>
              </div>
              <div className="text-right">
                <div className="num text-[12px]" style={{ color: "var(--ink_soft)" }}>at scale</div>
                <div className="num text-[18px]" style={{ color: "var(--moss)" }}>52.4%</div>
              </div>
            </div></div>
            <div className="card mb-3"><div className="p-5 flex items-center justify-between">
              <div>
                <div className="stat_label">Contribution Margin</div>
                <div className="num display text-[28px] font-[400] mt-1">{fmtPct(derived.contributionMarginPct)}</div>
                <div className="text-[11px] mt-1" style={{ color: "var(--ink_soft)" }}>Gross profit less variable selling and distribution</div>
              </div>
              <div className="text-right">
                <div className="num text-[12px]" style={{ color: "var(--ink_soft)" }}>at scale</div>
                <div className="num text-[18px]" style={{ color: "var(--moss)" }}>42.8%</div>
              </div>
            </div></div>
            <div className="card mb-3"><div className="p-5 flex items-center justify-between">
              <div>
                <div className="stat_label">EBITDA Margin</div>
                <div className="num display text-[28px] font-[400] mt-1" style={{ color: derived.ebitdaMarginPct < 0 ? "var(--signal_red)" : "var(--moss)" }}>
                  {derived.ebitdaMarginPct < 0 ? `(${Math.abs(derived.ebitdaMarginPct).toFixed(0)}%)` : `+${derived.ebitdaMarginPct.toFixed(1)}%`}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "var(--ink_soft)" }}>Negative; absorbing fixed cost base at low volume</div>
              </div>
              <div className="text-right">
                <div className="num text-[12px]" style={{ color: "var(--ink_soft)" }}>at scale</div>
                <div className="num text-[18px]" style={{ color: "var(--moss)" }}>+18.2%</div>
              </div>
            </div></div>
            <div className="card_cream"><div className="p-5">
              <div className="stat_label" style={{ color: "var(--moss)" }}>Operating Leverage</div>
              <div className="text-[13px] mt-2 leading-relaxed">Each incremental percentage point of utilization adds approximately <span className="num font-[600]">$2,840</span> of EBITDA per month. The fixed cost base is largely covered today; further volume converts directly to operating cash flow.</div>
            </div></div>
          </div>
        </div>

        <div className="mt-12">
          <div className="eyebrow mb-3">Six Month Revenue, COGS &amp; Net Burn</div>
          <div className="card p-6">
            <div style={{ height: 320, position: "relative" }}><canvas ref={trendRef}></canvas></div>
          </div>
        </div>
      </section>

      </>)}
      {/* SECTION IV · CASH & RUNWAY */}
      <section id="cash" className="max-w-[1400px] mx-auto px-10 py-12 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="section_number">CHAPTER IV</div>
            <h2 className="display text-[32px] font-[400] leading-tight">Cash &amp; Runway</h2>
            <p className="text-[13px] mt-2 max-w-xl" style={{ color: "var(--ink_soft)" }}>
              Three scenarios anchored on the current {fmtUsd(derived.totalCash, { short: true })} cash position, isolating the levers that extend or shorten time to next raise.
            </p>
          </div>
          <div className="flex gap-0">
            {(snapshot.scenarios || []).map((s: any) => (
              <button key={s.key} className={`scenario_btn ${scenarioKey === s.key ? "active" : ""}`} onClick={() => setScenarioKey(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="card p-6">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <div className="eyebrow">Cash Trajectory</div>
                  <div className="display text-[22px] mt-1">{currentScenario.label} · {currentScenario.assumption}</div>
                </div>
                <div className="text-right">
                  <div className="stat_label">Funds Out</div>
                  <div className="num text-[18px] mt-1">{currentScenario.funds_out}</div>
                </div>
              </div>
              <div style={{ height: 320, position: "relative" }}><canvas ref={runwayRef}></canvas></div>
            </div>
          </div>
          <div className="col-span-4">
            <div className="eyebrow mb-3">Monthly Operating Outflow</div>
            <div className="card p-6">
              <table className="compact w-full">
                <thead><tr><th>Bucket</th><th className="text-right">USD</th></tr></thead>
                <tbody>
                  {derived.opexBreakdown.map((o: any) => (
                    <tr key={o.label}><td>{o.label}</td><td className="text-right num">{fmtUsd(o.value)}</td></tr>
                  ))}
                  <tr style={{ background: "var(--cream)" }}>
                    <td className="font-[600]">Gross monthly outflow</td>
                    <td className="text-right num font-[600]">{fmtUsd(snapshot.monthly_gross_outflow)}</td>
                  </tr>
                  <tr><td style={{ color: "var(--moss)" }}>Less: collections</td><td className="text-right num" style={{ color: "var(--moss)" }}>({fmtUsd(snapshot.monthly_collections)})</td></tr>
                  <tr style={{ background: "var(--moss_pale)" }}>
                    <td className="font-[600]" style={{ color: "var(--moss)" }}>Net monthly burn</td>
                    <td className="text-right num font-[600]" style={{ color: "var(--moss)" }}>{fmtUsd(snapshot.monthly_net_burn)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card_cream mt-4 p-5">
              <div className="stat_label" style={{ color: "var(--moss)" }}>Capital Efficiency</div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="text-[11px]" style={{ color: "var(--ink_soft)" }}>Cumulative raised</div>
                  <div className="num text-[18px] mt-1">{fmtUsd(snapshot.cumulative_raised, { short: true, decimals: 1 })}</div>
                </div>
                <div>
                  <div className="text-[11px]" style={{ color: "var(--ink_soft)" }}>Burn multiple</div>
                  <div className="num text-[18px] mt-1">{derived.burnMultiple > 0 ? derived.burnMultiple.toFixed(1) + "×" : "n/a"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="eyebrow mb-3">Scenario Summary</div>
          <div className="card">
            <table className="compact w-full">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Assumption</th>
                  <th className="text-right">Net Burn / mo</th>
                  <th className="text-right">Runway</th>
                  <th className="text-right">Funds Out</th>
                  <th className="text-right">Implied Series A</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot.scenarios || []).map((s: any) => {
                  const cls = s.key === "base" ? "pill_neutral" : s.key === "optimised" ? "pill_pos" : "pill_warn";
                  return (
                    <tr key={s.key}>
                      <td><span className={`pill ${cls}`}>{s.label}</span></td>
                      <td>{s.assumption}</td>
                      <td className="text-right num">{fmtUsd(s.burn)}</td>
                      <td className="text-right num">{s.runway_months} mo</td>
                      <td className="text-right num">{s.funds_out}</td>
                      <td className="text-right num">{s.raise_implication}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION V · OPERATIONS */}
      <section id="operations" className="max-w-[1400px] mx-auto px-10 py-12 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="section_number">CHAPTER V</div>
            <h2 className="display text-[32px] font-[400] leading-tight">Operations &amp; Pipeline</h2>
            <p className="text-[13px] mt-2 max-w-xl" style={{ color: "var(--ink_soft)" }}>
              Production capacity, breakeven analysis, revenue mix, and the qualified sales pipeline that closes the gap.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-4">
            <div className="eyebrow mb-3">Capacity Utilization</div>
            <div className="card p-6 flex flex-col items-center">
              <svg width="240" height="200" viewBox="0 0 240 200">
                <path d="M 30 170 A 90 90 0 0 1 210 170" fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" />
                {(() => {
                  // Compute end angle for current util as fraction of 0..100 along the half circle
                  const pct = snapshot.capacity_utilization_pct / 100;
                  const angle = Math.PI * (1 - pct); // start at PI (left), end at 0 (right)
                  const cx = 120, cy = 170, r = 90;
                  const x = cx + r * Math.cos(angle);
                  const y = cy - r * Math.sin(angle);
                  const largeArc = pct > 0.5 ? 1 : 0;
                  return <path d={`M 30 170 A 90 90 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)}`} fill="none" stroke="var(--moss)" strokeWidth="14" strokeLinecap="round" />;
                })()}
                <text x="120" y="135" textAnchor="middle" fontFamily="Fraunces" fontSize="44" fontWeight="400" fill="var(--ink)">{fmtPct(snapshot.capacity_utilization_pct)}</text>
                <text x="120" y="160" textAnchor="middle" fontFamily="Geist" fontSize="11" fill="var(--ink_soft)" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>of nameplate</text>
                <text x="20" y="190" fontFamily="JetBrains Mono" fontSize="10" fill="var(--ink_soft)">0%</text>
                <text x="200" y="190" fontFamily="JetBrains Mono" fontSize="10" fill="var(--ink_soft)">100%</text>
                {(() => {
                  const pct = snapshot.breakeven_utilization_pct / 100;
                  const angle = Math.PI * (1 - pct);
                  const cx = 120, cy = 170, r = 90;
                  const x = cx + r * Math.cos(angle);
                  const y = cy - r * Math.sin(angle);
                  return (
                    <>
                      <line x1={x.toFixed(2)} y1={(y - 8).toFixed(2)} x2={(x + 6).toFixed(2)} y2={(y - 16).toFixed(2)} stroke="var(--ink)" strokeWidth="1" />
                      <text x={(x + 10).toFixed(2)} y={(y - 18).toFixed(2)} fontFamily="JetBrains Mono" fontSize="10" fill="var(--ink)">{fmtPct(snapshot.breakeven_utilization_pct, 1)} breakeven</text>
                    </>
                  );
                })()}
              </svg>
              <div className="rule w-full my-4"></div>
              <div className="grid grid-cols-3 w-full text-center gap-2">
                <div>
                  <div className="stat_label">Nameplate</div>
                  <div className="num text-[14px] mt-1">{fmtNumber(snapshot.capacity_sheets_per_month)} sheets</div>
                </div>
                <div>
                  <div className="stat_label">Producing</div>
                  <div className="num text-[14px] mt-1" style={{ color: "var(--moss)" }}>{fmtNumber(snapshot.production_sheets_per_month)} sheets</div>
                </div>
                <div>
                  <div className="stat_label">Breakeven</div>
                  <div className="num text-[14px] mt-1">{fmtNumber(derived.breakevenSheets)} sheets</div>
                </div>
              </div>
            </div>
            <div className="card_cream mt-4 p-5">
              <div className="stat_label" style={{ color: "var(--moss)" }}>Gap to Breakeven</div>
              <div className="num display text-[22px] mt-2 font-[400]">+{fmtNumber(derived.breakevenSheets - snapshot.production_sheets_per_month)} sheets/mo</div>
              <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>Equivalent to roughly <span className="num font-[500]">{Math.round((derived.breakevenSheets - snapshot.production_sheets_per_month) / 35)} hotel projects</span> at average specification.</div>
            </div>
          </div>

          <div className="col-span-4">
            <div className="eyebrow mb-3">Revenue by Product Line · {snapshot.period_label}</div>
            <div className="card p-6">
              <div style={{ height: 240, position: "relative" }}><canvas ref={productRef}></canvas></div>
              <div className="rule mt-4 mb-3"></div>
              <table className="compact w-full">
                <tbody>
                  {derived.productMix.map((p: any) => (
                    <tr key={p.name}>
                      <td><span className="inline-block w-2 h-2 rounded-sm mr-2" style={{ background: p.color }}></span>{p.name}</td>
                      <td className="text-right num">{fmtUsd(p.value)}</td>
                      <td className="text-right num text-[11px]" style={{ color: "var(--ink_soft)" }}>{derived.productTotal > 0 ? fmtPct((p.value / derived.productTotal) * 100, 0) : "0%"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="col-span-4">
            <div className="eyebrow mb-3">Sales Pipeline Funnel</div>
            <div className="card p-6">
              <div className="space-y-4">
                {derived.pipeline.map((p: any) => (
                  <div key={p.label}>
                    <div className="flex justify-between text-[12px] mb-1.5">
                      <span>{p.label}</span>
                      <span className="num">{fmtNumber(p.value)}</span>
                    </div>
                    <div className="progress_track" style={{ height: 22 }}>
                      <div className="progress_fill" style={{ width: `${Math.max((p.value / derived.pipelineMax) * 100, 0.5)}%`, background: p.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rule mt-5 mb-3"></div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="stat_label">Weighted pipeline</div>
                  <div className="num text-[16px] mt-1">{fmtUsd(snapshot.pipeline_weighted_value, { short: true })}</div>
                </div>
                <div>
                  <div className="stat_label">Avg sales cycle</div>
                  <div className="num text-[16px] mt-1">{snapshot.pipeline_avg_cycle_days} days</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Path to breakeven */}
        <div className="mt-10">
          <div className="eyebrow mb-3">Path to Operating Breakeven · Required Monthly Revenue</div>
          <div className="card p-6">
            <div className="space-y-5">
              {[
                { label: `Today (${fmtPct(snapshot.capacity_utilization_pct)} utilization)`, rev: snapshot.revenue_total, color: "var(--signal_red)" },
                { label: "+1 average hotel project / mo", rev: oneHotelRevenue, color: "var(--signal_amber)" },
                { label: "+3 hotel projects / mo", rev: threeHotelRevenue, color: "var(--gold)" },
                { label: `Operating breakeven (${fmtPct(snapshot.breakeven_utilization_pct)} utilization)`, rev: derived.breakevenRevenue, color: "var(--moss)", isTarget: true },
              ].map((row, i) => {
                const pct = (row.rev / derived.breakevenRevenue) * 100;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-[12px] mb-2">
                      <span style={{ color: row.isTarget ? "var(--moss)" : undefined, fontWeight: row.isTarget ? 500 : undefined }}>{row.label}</span>
                      <span className="num"><span style={{ color: row.color, fontWeight: row.isTarget ? 600 : undefined }}>{fmtUsd(row.rev, { short: true, decimals: 1 })}</span> · {pct.toFixed(0)}% of breakeven</span>
                    </div>
                    <div style={{ position: "relative", height: 24 }}>
                      <div style={{ position: "absolute", inset: 0, background: "var(--line_soft)", borderRadius: 2 }}></div>
                      <div style={{ position: "absolute", insetBlock: 0, left: 0, width: `${Math.min(pct, 100)}%`, background: row.color, opacity: row.isTarget ? 1 : 0.7, borderRadius: 2 }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION VI · IMPACT & RISKS */}
      <section id="impact" className="max-w-[1400px] mx-auto px-10 py-12 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="section_number">CHAPTER VI</div>
            <h2 className="display text-[32px] font-[400] leading-tight">Impact &amp; Material Risks</h2>
            <p className="text-[13px] mt-2 max-w-xl" style={{ color: "var(--ink_soft)" }}>
              Climate impact metrics aligned with the Wavemaker Impact thesis, alongside a candid view of the risks the board is actively managing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-7">
            <div className="eyebrow mb-3">Climate Impact Ledger</div>
            {impact ? (
              <>
                <div className="grid grid-cols-2 gap-px" style={{ background: "var(--line)" }}>
                  <div className="bg-white p-6">
                    <div className="stat_label" style={{ color: "var(--moss)" }}>CO₂ avoided ({impact.period_label.split(" ")[0]})</div>
                    <div className="num display text-[32px] mt-3 font-[400]">{impact.co2_avoided_period_tonnes} t</div>
                    <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>vs equivalent volume of tropical hardwood plywood</div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="stat_label" style={{ color: "var(--moss)" }}>CO₂ avoided (cumulative)</div>
                    <div className="num display text-[32px] mt-3 font-[400]">{impact.co2_avoided_cumulative_tonnes} t</div>
                    <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>since first commercial dispatch</div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="stat_label" style={{ color: "var(--moss)" }}>Bamboo sourced</div>
                    <div className="num display text-[32px] mt-3 font-[400]">{impact.bamboo_sourced_hectares} ha</div>
                    <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>cumulative, all from rotational community plantations</div>
                  </div>
                  <div className="bg-white p-6">
                    <div className="stat_label" style={{ color: "var(--moss)" }}>Direct rural employment</div>
                    <div className="num display text-[32px] mt-3 font-[400]">{impact.direct_employment_count}</div>
                    <div className="text-[12px] mt-2" style={{ color: "var(--ink_soft)" }}>factory and supply chain, Bukidnon and surrounding provinces</div>
                  </div>
                </div>
                {impact.methodology_note && (
                  <div className="card_cream mt-6 p-6">
                    <div className="eyebrow mb-3" style={{ color: "var(--moss)" }}>Note on Methodology</div>
                    <p className="text-[13px] leading-relaxed">{impact.methodology_note}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-6 text-[13px]" style={{ color: "var(--ink_soft)" }}>Impact metrics for this period are pending publication.</div>
            )}
          </div>

          <div className="col-span-5">
            <div className="eyebrow mb-3">Risk Register · Top Five</div>
            <div className="space-y-3">
              {(snapshot.risk_register || []).map((r: any) => {
                const pillCls = r.severity === "high" ? "pill_warn" : "pill_neutral";
                const sevLabel = r.severity.charAt(0).toUpperCase() + r.severity.slice(1);
                return (
                  <div key={r.rank} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="num text-[11px] mt-1" style={{ color: "var(--moss)" }}>0{r.rank}</span>
                        <div>
                          <div className="text-[13px] font-[500]">{r.title}</div>
                          <div className="text-[12px] mt-1" style={{ color: "var(--ink_soft)" }}>{r.detail}</div>
                        </div>
                      </div>
                      <span className={`pill ${pillCls}`}>{sevLabel}</span>
                    </div>
                    <div className="mt-3 text-[12px]" style={{ color: "var(--ink_soft)" }}>
                      <span style={{ color: "var(--moss)", fontWeight: 500 }}>Mitigation:</span> {r.mitigation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* APPENDIX */}
      <section className="max-w-[1400px] mx-auto px-10 py-12 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-4">
            <div className="section_number">APPENDIX</div>
            <h2 className="display text-[28px] font-[400] mt-1">Methodology &amp; Sources</h2>
          </div>
          <div className="col-span-8">
            <div className="space-y-5 text-[13px] leading-relaxed" style={{ color: "var(--ink_soft)" }}>
              <p><span className="font-[600]" style={{ color: "var(--ink)" }}>Source hierarchy.</span> All financial figures derive from (in priority order) audited management accounts, Philippine and Singapore bank transaction data, source documents (invoices, purchase orders, contracts), and the Supabase operational database. Where transcripts or anecdotal commentary conflict with documents, the document position is reported.</p>
              <p><span className="font-[600]" style={{ color: "var(--ink)" }}>LTV.</span> Computed as average annual gross profit per customer multiplied by an estimated {snapshot.ltv_retention_years} year retention horizon. The retention assumption is provisional and will be replaced with cohort actuals as the customer base matures.</p>
              <p><span className="font-[600]" style={{ color: "var(--ink)" }}>CAC.</span> Fully loaded sales and marketing spend (people, software, paid acquisition, travel, sample units) divided by closed customers in the trailing six month window.</p>
              <p><span className="font-[600]" style={{ color: "var(--ink)" }}>Capacity utilization.</span> Sheet equivalents produced divided by demonstrated sustained nameplate capacity of {fmtNumber(snapshot.capacity_sheets_per_month)} sheets per month at single shift.</p>
              <p><span className="font-[600]" style={{ color: "var(--ink)" }}>FX.</span> A {snapshot.fx_rate_php_usd} PHP/USD ceiling rate is used throughout for cross entity consolidation, consistent with the pricing book.</p>
            </div>
            <div className="rule my-8"></div>
            <div className="grid grid-cols-3 gap-6 text-[12px]">
              <div><div className="stat_label">Prepared by</div><div className="mt-2">{snapshot.prepared_by}<br /><span style={{ color: "var(--ink_soft)" }}>Business Administrator</span></div></div>
              <div><div className="stat_label">Reviewed by</div><div className="mt-2">{snapshot.reviewed_by}<br /><span style={{ color: "var(--ink_soft)" }}>Chief Executive Officer</span></div></div>
              <div><div className="stat_label">Distribution</div><div className="mt-2">Paul Lam, Marie<br /><span style={{ color: "var(--ink_soft)" }}>Wavemaker Impact</span></div></div>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-[1400px] mx-auto px-10 py-8 border-t" style={{ borderColor: "var(--ink)" }}>
        <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--ink_soft)" }}>
          <div className="num">NUMAT Sustainable Manufacturing Inc. · Singapore Holding · numat.ph</div>
          <div className="num">Confidential · {snapshot.period_label} · Updated {new Date(snapshot.updated_at).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
      </footer>
    </div>
  );
}
