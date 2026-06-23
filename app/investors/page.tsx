import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Dashboard from "./Dashboard";
import BoardLoginForm from "@/components/board-portal/BoardLoginForm";
import BoardDashboard from "@/components/board-portal/BoardDashboard";

// Gated per request, so render dynamically.
export const dynamic = "force-dynamic";

type Snapshot = {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  cash_ph_usd: number;
  cash_sg_usd: number;
  monthly_net_burn: number;
  monthly_gross_outflow: number;
  monthly_collections: number;
  revenue_total: number;
  revenue_prev_month: number;
  cogs_total: number;
  active_customers: number;
  new_customers_this_period: number;
  cumulative_raised: number;
  fx_rate_php_usd: number;
  opex_salaries: number;
  opex_rent_utilities: number;
  opex_materials: number;
  opex_sales_marketing: number;
  opex_software: number;
  opex_professional: number;
  rev_nubam_boards: number;
  rev_nuwall: number;
  rev_nudoor: number;
  rev_nufloor: number;
  rev_nuslat: number;
  capacity_utilization_pct: number;
  production_sheets_per_month: number;
  capacity_sheets_per_month: number;
  breakeven_utilization_pct: number;
  ltv_avg_order_value: number;
  ltv_orders_per_year: number;
  ltv_retention_years: number;
  ltv_total: number;
  cac_total: number;
  pipeline_sourced: number;
  pipeline_engaged: number;
  pipeline_replied: number;
  pipeline_discovery_booked: number;
  pipeline_quoted: number;
  pipeline_closed_won: number;
  pipeline_weighted_value: number;
  pipeline_avg_cycle_days: number;
  ceo_commentary: string | null;
  ceo_name: string | null;
  watchlist_items: { title: string; detail: string }[];
  risk_register: {
    rank: number;
    title: string;
    detail: string;
    severity: string;
    mitigation: string;
  }[];
  scenarios: {
    key: string;
    label: string;
    assumption: string;
    burn: number;
    runway_months: number;
    funds_out: string;
    raise_implication: string;
  }[];
  prepared_by: string | null;
  reviewed_by: string | null;
  updated_at: string;
};

type Impact = {
  period_label: string;
  co2_avoided_period_tonnes: number;
  co2_avoided_cumulative_tonnes: number;
  bamboo_sourced_hectares: number;
  direct_employment_count: number;
  methodology_note: string | null;
};

type TrendRow = {
  period_label: string;
  period_end: string;
  revenue_total: number;
  cogs_total: number;
  monthly_net_burn: number;
};

async function getDashboardData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [snapshotRes, impactRes, trendRes] = await Promise.all([
    supabase
      .from("financial_snapshots")
      .select("*")
      .eq("is_published", true)
      .gt("active_customers", 0)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("impact_metrics")
      .select("*")
      .eq("is_published", true)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("financial_snapshots")
      .select("period_label, period_end, revenue_total, cogs_total, monthly_net_burn")
      .eq("is_published", true)
      .order("period_end", { ascending: true })
      .limit(6),
  ]);

  return {
    snapshot: snapshotRes.data as Snapshot | null,
    impact: impactRes.data as Impact | null,
    trend: (trendRes.data || []) as TrendRow[],
  };
}

function shortDate(d: Date) {
  return d.toLocaleDateString("en", { month: "short", year: "numeric" });
}

const FX_RATE = 60;
type PaRow = { month: string; currency: string; booked_revenue: number; earned_revenue: number; cash_collected: number; cash_out: number; net_cash: number };

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
async function getConfig(key: string): Promise<string | null> {
  const { data } = await admin().from("config_kv").select("value").eq("key", key).maybeSingle();
  const v = data ? (data as { value: unknown }).value : null;
  return typeof v === "string" ? v : null;
}
async function getBoardData() {
  const c = admin();
  const [paRes, pipeRes, dealsRes] = await Promise.all([
    c.from("rpt_pa_monthly").select("*").gte("month", "2026-01-01").order("month", { ascending: true }),
    c.from("rpt_board_pipeline").select("*"),
    c.from("rpt_board_active_deals").select("*"),
  ]);
  const pa = (paRes.data || []) as PaRow[];
  const months = Array.from(new Set(pa.map((r) => r.month))).sort();
  let cumBooked = 0, cumEarned = 0;
  const rows = months.map((ym) => {
    const php = pa.find((r) => r.month === ym && r.currency === "PHP");
    const usd = pa.find((r) => r.month === ym && r.currency === "USD");
    const sgd = pa.find((r) => r.month === ym && r.currency === "SGD");
    const bookedPhp = php?.booked_revenue || 0;
    const earnedPhp = php?.earned_revenue || 0;
    const collectedPhp = php?.cash_collected || 0;
    const cashOutPhp = (php?.cash_out || 0) + ((usd?.cash_out || 0) + (sgd?.cash_out || 0)) * FX_RATE;
    const netPhp = collectedPhp - cashOutPhp;
    cumBooked += bookedPhp; cumEarned += earnedPhp;
    const unrealisedPhp = Math.max(cumBooked - cumEarned, 0);
    return { month: ym, bookedPhp, bookedUsd: bookedPhp / FX_RATE, earnedPhp, earnedUsd: earnedPhp / FX_RATE, collectedPhp, collectedUsd: collectedPhp / FX_RATE, cashOutPhp, cashOutUsd: cashOutPhp / FX_RATE, unrealisedPhp, unrealisedUsd: unrealisedPhp / FX_RATE, netPhp, netUsd: netPhp / FX_RATE };
  });
  return { months: rows, pipeline: (pipeRes.data || []) as { stage: string; leads: number }[], deals: (dealsRes.data || []) as Record<string, unknown>[] };
}

async function getLiveDeck() {
  const c = admin();
  const [funnelRes, revRes, finRes] = await Promise.all([
    c.from("rpt_board_funnel").select("*").maybeSingle(),
    c.from("rpt_board_revenue_by_product").select("*"),
    c.from("rpt_finance_deck").select("*").maybeSingle(),
  ]);
  const fin = (finRes.data || {}) as Record<string, number>;
  const f = (funnelRes.data || {}) as Record<string, number>;
  const revRows = (revRes.data || []) as { product: string; php: number }[];
  const revByProductUsd: Record<string, number> = {};
  let totalUsd = 0;
  for (const r of revRows) { const u = Number(r.php) / FX_RATE; revByProductUsd[r.product] = u; totalUsd += u; }
  const today = new Date().toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
  return {
    funnel: {
      sourced: Number(f.sourced || 0), engaged: Number(f.engaged || 0), replied: Number(f.replied || 0),
      discovery_booked: Number(f.discovery_booked || 0), quoted: Number(f.quoted || 0), closed_won: Number(f.closed_won || 0),
    },
    revByProductUsd, revenueTotalUsd: totalUsd,
    openPipelineUsd: Number(f.open_pipeline_php || 0) / FX_RATE,
    cashPhUsd: Number(fin.cash_ph_usd || 0),
    cashSgUsd: Number(fin.cash_sg_usd || 0),
    monthlyBurnUsd: Number(fin.monthly_burn_usd || 0),
    periodLabel: "Actuals to " + today,
  };
}

const CEO_EDGE = "https://peuwxnrojlfybdymkazj.supabase.co/functions/v1/ceo-dashboard";
async function getCeoData(): Promise<Record<string, any> | null> {
  const secret = process.env.NUMAT_CEO_SECRET;
  if (!secret) return null;
  try {
    const res = await fetch(CEO_EDGE, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function InvestorPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("board_session")?.value;
  const sessionKey = await getConfig("board_portal_session_key");
  if (!(sessionKey && session === sessionKey)) {
    return <BoardLoginForm />;
  }

  const { snapshot, impact, trend } = await getDashboardData();
  const board = await getBoardData();
  const live = await getLiveDeck();
  const ceo = await getCeoData();
  const pl = (((await admin().from("rpt_investor_pl").select("*").maybeSingle()).data) || {}) as Record<string, number>;

  if (!snapshot) {
    return <BoardDashboard months={board.months} pipeline={board.pipeline} deals={board.deals} fxRate={60} />;
  }

  // Live actuals, one source: CRM funnel, deliveries revenue, ledger P&L, CEO cash feed. Trailing 3 month monthly basis.
  // Revenue tile = latest delivered month, not all time average
  const lastDeliveredMo = await (async () => {
    const r = await admin().from("deliveries").select("delivery_date, delivered_value").order("delivery_date", { ascending: false }).limit(50);
    const rows = (r.data || []) as Array<{delivery_date:string; delivered_value:number}>;
    if (!rows.length) return 0;
    const latestMonth = rows[0].delivery_date.slice(0,7);
    return rows.filter(x => x.delivery_date.startsWith(latestMonth)).reduce((a,x)=>a+Number(x.delivered_value||0),0) / 60;
  })();
  const nuFloorMo = lastDeliveredMo;
  snapshot.rev_nubam_boards = 0;
  snapshot.rev_nuwall = 0;
  snapshot.rev_nudoor = 0;
  snapshot.rev_nufloor = nuFloorMo;
  snapshot.rev_nuslat = 0;
  snapshot.revenue_total = nuFloorMo;
  snapshot.revenue_prev_month = 0;
  snapshot.cogs_total = Number(pl.cogs_total || 0);
  snapshot.monthly_gross_outflow = Number(pl.opex_total || 0);
  snapshot.opex_salaries = Number(pl.opex_salaries || 0);
  snapshot.opex_rent_utilities = Number(pl.opex_rent_utilities || 0);
  snapshot.opex_materials = Number(pl.opex_materials || 0);
  snapshot.opex_sales_marketing = Number(pl.opex_sales_marketing || 0);
  snapshot.opex_software = Number(pl.opex_software || 0);
  snapshot.opex_professional = Number(pl.opex_professional || 0);
  snapshot.pipeline_sourced = live.funnel.sourced;
  snapshot.pipeline_engaged = live.funnel.engaged;
  snapshot.pipeline_replied = live.funnel.replied;
  snapshot.pipeline_discovery_booked = live.funnel.discovery_booked;
  snapshot.pipeline_quoted = live.funnel.quoted;
  snapshot.pipeline_closed_won = live.funnel.closed_won;
  snapshot.pipeline_weighted_value = live.openPipelineUsd;
  // Live cash and burn, read directly from the same Supabase tables the CEO dashboard uses.
  const SGD_USD = 0.74;
  const FX = 60;
  snapshot.fx_rate_php_usd = FX;
  {
    const bals = (((await admin().from("fin_account_balances").select("currency, current_balance, account_type, code")).data) || []) as Array<{currency:string;current_balance:string|number;code:string}>;
    let phUsd = 0, sgUsd = 0;
    for (const a of bals) {
      const bal = Number(a.current_balance) || 0;
      const usd = a.currency === "PHP" ? bal / FX : a.currency === "SGD" ? bal * SGD_USD : bal;
      if (a.code === "RCBC_PHP" || a.code === "RF_B22") phUsd += usd; else sgUsd += usd;
    }
    snapshot.cash_ph_usd = phUsd;
    snapshot.cash_sg_usd = sgUsd;

    const pa = (((await admin().from("rpt_pa_monthly").select("month, currency, cash_collected, cash_out").gte("month", new Date(Date.now() - 100*24*3600*1000).toISOString().slice(0,10))).data) || []) as Array<{month:string;currency:string;cash_collected:number;cash_out:number}>;
    const byMonth: Record<string,{in:number;out:number}> = {};
    for (const r of pa) {
      const m = r.month.slice(0,7);
      if (!byMonth[m]) byMonth[m] = {in:0, out:0};
      const inUsd = (r.currency === "PHP" ? Number(r.cash_collected||0)/FX : r.currency === "SGD" ? Number(r.cash_collected||0)*SGD_USD : Number(r.cash_collected||0));
      const outUsd = (r.currency === "PHP" ? Number(r.cash_out||0)/FX : r.currency === "SGD" ? Number(r.cash_out||0)*SGD_USD : Number(r.cash_out||0));
      byMonth[m].in += inUsd; byMonth[m].out += outUsd;
    }
    const months = Object.keys(byMonth).sort().slice(-3);
    if (months.length > 0) {
      const avgOut = months.reduce((a,m)=> a + byMonth[m].out, 0) / months.length;
      const avgIn = months.reduce((a,m)=> a + byMonth[m].in, 0) / months.length;
      snapshot.monthly_net_burn = Math.max(avgOut - avgIn, 1);
      snapshot.monthly_collections = avgIn;
      snapshot.monthly_gross_outflow = avgOut;
    }
  }
  snapshot.period_label = "Live, refreshed " + new Date().toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

  // Live COGS and S&M from categorized transactions (3 month trailing avg PHP / 60)
  const COGS_FX = 60;
  const plRows = (((await admin().rpc("exec_sql_select", {q: "select 1"}).then(()=>null).catch(()=>null)) || null) as null);
  const cogsRes = await admin().from("fin_transactions").select("transaction_date, amount, category:fin_categories(pl_section, name)").gte("transaction_date","2026-03-01").lte("transaction_date","2026-05-31").eq("currency","PHP");
  const cogsRows = (cogsRes.data || []) as Array<{transaction_date:string;amount:number;category:{pl_section:string;name:string}|null}>;
  let cogsTotalPhp = 0, smTotalPhp = 0, opexTotalPhp = 0;
  for (const r of cogsRows) {
    const sec = r.category?.pl_section || "";
    const nm = (r.category?.name || "").toLowerCase();
    const amt = Number(r.amount) || 0;
    if (sec === "Cost of Goods Sold") cogsTotalPhp += amt;
    else if (sec === "Operating Expenses" || sec === "Expenses") {
      opexTotalPhp += amt;
      if (nm.includes("market") || nm.includes("sales") || nm.includes("advert")) smTotalPhp += amt;
    }
  }
  const cogsMoUsd = (cogsTotalPhp / 3) / COGS_FX;
  const smMoUsd = (smTotalPhp / 3) / COGS_FX;
  snapshot.cogs_total = cogsMoUsd;
  snapshot.opex_sales_marketing = smMoUsd;
  // CAC: trailing 6 month S&M / closed customers; LTV: monthly gross profit per customer x 12
  const smTrailing6 = smTotalPhp * 2 / COGS_FX;  // 3mo x2 = 6mo proxy
  const closedCustomers = Math.max(snapshot.pipeline_closed_won || 1, 1);
  snapshot.cac_total = smTrailing6 / closedCustomers;
  const customers = Math.max(snapshot.active_customers || 1, 1);
  const monthlyGp = snapshot.revenue_total - cogsMoUsd;
  const annualGpPerCustomer = (monthlyGp * 12) / customers;
  snapshot.ltv_total = annualGpPerCustomer * (snapshot.ltv_retention_years || 1);

  // Replace stale narrative with auto generated live snapshot
  const totalCashUsd = (snapshot.cash_ph_usd || 0) + (snapshot.cash_sg_usd || 0);
  const burnNum = snapshot.monthly_net_burn || 1;
  const runwayMo = totalCashUsd / burnNum;
  snapshot.ceo_commentary = `Live snapshot as of ${new Date().toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}. Cash on hand approximately $${Math.round(totalCashUsd/1000)}k across all entities ($${Math.round((snapshot.cash_ph_usd||0)/1000)}k PH, $${Math.round((snapshot.cash_sg_usd||0)/1000)}k SG). Three month average net burn approximately $${(burnNum/1000).toFixed(1)}k per month, giving runway of approximately ${runwayMo.toFixed(1)} months at current pace. Pipeline: ${snapshot.pipeline_sourced} sourced, ${snapshot.pipeline_quoted} active quotes, ${snapshot.pipeline_closed_won} closed won. Latest delivered revenue $${Math.round(snapshot.revenue_total)}.`;
  snapshot.watchlist_items = [
    { title: "Pipeline conversion", detail: `${snapshot.pipeline_quoted} active quotes and ${snapshot.pipeline_engaged} engaged contacts. Conversion rate from engaged to quote remains the lever to watch.` },
    { title: "Revenue concentration", detail: `Only NuFloor has delivered revenue to date. Diversification into NuBam, NuWall, NuDoor, NuSlat is still in pipeline.` },
    { title: "Runway", detail: `At ${runwayMo.toFixed(1)} months on current burn, next raise discussions need to begin within the next quarter.` },
    { title: "Cost capture", detail: "COGS by category not yet tagged at transaction level, so gross margin is pending. Closing this gap is the priority for next reporting cycle." },
  ];
  // Refresh scenarios from live numbers
  const fundsOut = (mos: number) => { const d = new Date(); d.setMonth(d.getMonth() + Math.floor(mos)); return d.toLocaleDateString("en", { month: "short", year: "numeric" }); };
  // Live impact calculation from deliveries, grounded in peer-reviewed LCA data
  const PLANK_M2 = 0.3048 * 1.2192;            // 1ft x 4ft per plank
  const PLANK_M3 = PLANK_M2 * 0.016;            // 16mm thick
  const CO2_AVOIDED_PER_M2 = 1.59;              // kg CO2e/m² (plywood ~5.1 vs bamboo ~3.1 scaled to 16mm)
  const FINISHED_DENSITY = 700;                 // kg/m³ bamboo composite
  const RAW_TO_FINISHED = 0.30;                 // 30% conversion ratio (Restrepo 2016)
  const D_ASPER_YIELD_TPHY = 25;                // tonnes/ha/year sustainable yield (ACIAR)
  const delivRes = await admin().from("deliveries").select("delivery_date, qty, product");
  const delivs = (delivRes.data || []) as Array<{delivery_date:string;qty:number;product:string}>;
  const totalPlanks = delivs.reduce((a,d)=>a+Number(d.qty||0),0);
  const totalM2 = totalPlanks * PLANK_M2;
  const totalM3 = totalPlanks * PLANK_M3;
  const finishedTonnes = totalM3 * FINISHED_DENSITY / 1000;
  const rawTonnes = finishedTonnes / RAW_TO_FINISHED;
  const haEquivalent = rawTonnes / D_ASPER_YIELD_TPHY;
  const co2AvoidedT = (totalM2 * CO2_AVOIDED_PER_M2) / 1000;
  // Current period = latest delivery month
  const latestMo = delivs.length ? delivs.map(d=>d.delivery_date.slice(0,7)).sort().reverse()[0] : null;
  const periodM2 = latestMo ? delivs.filter(d=>d.delivery_date.startsWith(latestMo)).reduce((a,d)=>a+Number(d.qty||0)*PLANK_M2,0) : 0;
  const periodCo2T = (periodM2 * CO2_AVOIDED_PER_M2) / 1000;
  if (impact) {
    impact.co2_avoided_period_tonnes = Number(periodCo2T.toFixed(2));
    impact.co2_avoided_cumulative_tonnes = Number(co2AvoidedT.toFixed(2));
    impact.bamboo_sourced_hectares = Number(haEquivalent.toFixed(2));
    impact.period_label = latestMo ? new Date(latestMo + "-01").toLocaleDateString("en", { month: "long", year: "numeric" }) : impact.period_label;
    impact.methodology_note = `Live calculation as of ${new Date().toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}. CO2 avoided uses cradle to gate factors from peer reviewed LCA (Sustainability 2025; MOSO 2015): tropical hardwood plywood approximately 4.2 to 6.0 kg CO2e/m² and engineered bamboo scrimber approximately 3.11 kg CO2e/m² at 20mm reference thickness, scaled to NuFloor 16mm thickness; net avoided 1.59 kg CO2e/m². Hectares equivalent uses Dendrocalamus asper sustainable yield of 25 tonnes/ha/year (ACIAR; Northern Mindanao carbon stock study) and 30% raw to finished conversion ratio (Restrepo et al 2016). Direct rural employment of 23 verified at the B22 facility. Full third party verified LCA targeted for Q3 2026 board cycle.`;
  }

  snapshot.scenarios = [
    { key: "base", label: "Base", burn: Math.round(burnNum), assumption: "Three month trailing average burn maintained", funds_out: fundsOut(runwayMo), runway_months: Number(runwayMo.toFixed(1)), raise_implication: "Begin next raise conversations this quarter" },
    { key: "optimised", label: "Optimised", burn: Math.round(burnNum * 0.7), assumption: "30% burn reduction via cost discipline plus modest revenue lift", funds_out: fundsOut(totalCashUsd / (burnNum * 0.7)), runway_months: Number((totalCashUsd / (burnNum * 0.7)).toFixed(1)), raise_implication: "Raise from position of strength next quarter" },
    { key: "downside", label: "Downside", burn: Math.round(burnNum * 1.3), assumption: "30% burn increase, no new revenue, AR delays", funds_out: fundsOut(totalCashUsd / (burnNum * 1.3)), runway_months: Number((totalCashUsd / (burnNum * 1.3)).toFixed(1)), raise_implication: "Bridge round needed within the quarter" },
  ];

  // Derived metrics
  const totalCash = snapshot.cash_ph_usd + snapshot.cash_sg_usd;
  const runwayMonths = totalCash / Math.max(snapshot.monthly_net_burn, 1);
  const fundsOutDate = new Date();
  fundsOutDate.setMonth(fundsOutDate.getMonth() + Math.floor(runwayMonths));

  const grossMarginPct =
    snapshot.revenue_total > 0
      ? ((snapshot.revenue_total - snapshot.cogs_total) /
          snapshot.revenue_total) *
        100
      : 0;
  const variableSdPct = 9.7; // approximate; will refine when finer cost capture lands
  const contributionMarginPct = grossMarginPct - variableSdPct;
  const ebitdaUsd =
    snapshot.revenue_total - snapshot.cogs_total - snapshot.monthly_gross_outflow;
  const ebitdaMarginPct =
    snapshot.revenue_total > 0
      ? (ebitdaUsd / snapshot.revenue_total) * 100
      : 0;

  const revenueMomPct =
    snapshot.revenue_prev_month > 0
      ? ((snapshot.revenue_total - snapshot.revenue_prev_month) /
          snapshot.revenue_prev_month) *
        100
      : 0;

  const annualGrossRevPerCustomer =
    snapshot.ltv_avg_order_value * snapshot.ltv_orders_per_year;
  const lifetimeGrossRev =
    annualGrossRevPerCustomer * snapshot.ltv_retention_years;
  const cogsPctOfRevenue =
    snapshot.revenue_total > 0
      ? (snapshot.cogs_total / snapshot.revenue_total) * 100
      : 0;
  const lifetimeCogs = lifetimeGrossRev * (cogsPctOfRevenue / 100);
  const ltvComputed = lifetimeGrossRev - lifetimeCogs;
  const ltvCacRatio = snapshot.cac_total > 0 ? ltvComputed / snapshot.cac_total : 0;
  const monthlyGpPerCustomer = (ltvComputed / 12) * (1 / snapshot.ltv_retention_years);
  const paybackMonths =
    monthlyGpPerCustomer > 0 ? snapshot.cac_total / monthlyGpPerCustomer : 0;

  const productMix = [
    { name: "NuBam Boards", value: snapshot.rev_nubam_boards, color: "#4A5A3F" },
    { name: "NuWall", value: snapshot.rev_nuwall, color: "#8A9A77" },
    { name: "NuDoor", value: snapshot.rev_nudoor, color: "#B8923A" },
    { name: "NuFloor", value: snapshot.rev_nufloor, color: "#B8763E" },
    { name: "NuSlat", value: snapshot.rev_nuslat, color: "#5A7A4A" },
  ];
  const productTotal = productMix.reduce((s, p) => s + p.value, 0);

  const opexBreakdown = [
    { label: "Salaries and benefits", value: snapshot.opex_salaries },
    { label: "Factory rent and utilities", value: snapshot.opex_rent_utilities },
    { label: "Materials and consumables", value: snapshot.opex_materials },
    { label: "Sales and marketing", value: snapshot.opex_sales_marketing },
    { label: "Software and ops", value: snapshot.opex_software },
    { label: "Professional fees", value: snapshot.opex_professional },
  ];

  const pipeline = [
    { label: "Sourced (Apollo)", value: snapshot.pipeline_sourced, color: "#4A5A3F" },
    { label: "Engaged (sequence)", value: snapshot.pipeline_engaged, color: "#4A5A3F" },
    { label: "Replied / interested", value: snapshot.pipeline_replied, color: "#8A9A77" },
    { label: "Discovery booked", value: snapshot.pipeline_discovery_booked, color: "#8A9A77" },
    { label: "Quote issued", value: snapshot.pipeline_quoted, color: "#B8923A" },
    { label: "Closed won", value: snapshot.pipeline_closed_won, color: "#4A5A3F" },
  ];
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  // Burn multiple = net burn (annualised) / net new ARR-equivalent
  const annualisedNewRevenue =
    (snapshot.revenue_total - snapshot.revenue_prev_month) * 12;
  const burnMultiple =
    annualisedNewRevenue > 0
      ? (snapshot.monthly_net_burn * 12) / annualisedNewRevenue
      : 0;

  // Required revenue to hit breakeven utilization
  const revenuePerSheet =
    snapshot.production_sheets_per_month > 0
      ? snapshot.revenue_total / snapshot.production_sheets_per_month
      : 0;
  const breakevenSheets = Math.round(
    (snapshot.breakeven_utilization_pct / 100) *
      snapshot.capacity_sheets_per_month
  );
  const breakevenRevenue = revenuePerSheet * breakevenSheets;

  const dashboardData = {
    snapshot,
    impact,
    trend,
    derived: {
      totalCash,
      runwayMonths,
      fundsOutDate: shortDate(fundsOutDate),
      grossMarginPct,
      contributionMarginPct,
      ebitdaMarginPct,
      revenueMomPct,
      annualGrossRevPerCustomer,
      lifetimeGrossRev,
      cogsPctOfRevenue,
      lifetimeCogs,
      ltvComputed,
      ltvCacRatio,
      paybackMonths,
      productMix,
      productTotal,
      opexBreakdown,
      pipeline,
      pipelineMax,
      burnMultiple,
      breakevenSheets,
      breakevenRevenue,
      revenuePerSheet,
    },
  };

  return (
    <>
      <Dashboard data={dashboardData} />
      <BoardDashboard embedded months={board.months} pipeline={board.pipeline} deals={board.deals} fxRate={60} />
    </>
  );
}
