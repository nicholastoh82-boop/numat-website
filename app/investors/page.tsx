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
  const rows = months.map((ym) => {
    const php = pa.find((r) => r.month === ym && r.currency === "PHP");
    const usd = pa.find((r) => r.month === ym && r.currency === "USD");
    const sgd = pa.find((r) => r.month === ym && r.currency === "SGD");
    const bookedPhp = php?.booked_revenue || 0;
    const earnedPhp = php?.earned_revenue || 0;
    const collectedPhp = php?.cash_collected || 0;
    const cashOutPhp = (php?.cash_out || 0) + ((usd?.cash_out || 0) + (sgd?.cash_out || 0)) * FX_RATE;
    const netPhp = collectedPhp - cashOutPhp;
    return { month: ym, bookedPhp, bookedUsd: bookedPhp / FX_RATE, earnedPhp, earnedUsd: earnedPhp / FX_RATE, collectedPhp, collectedUsd: collectedPhp / FX_RATE, cashOutPhp, cashOutUsd: cashOutPhp / FX_RATE, netPhp, netUsd: netPhp / FX_RATE };
  });
  return { months: rows, pipeline: (pipeRes.data || []) as { stage: string; leads: number }[], deals: (dealsRes.data || []) as Record<string, unknown>[] };
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

  if (!snapshot) {
    return <BoardDashboard months={board.months} pipeline={board.pipeline} deals={board.deals} fxRate={60} />;
  }

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
