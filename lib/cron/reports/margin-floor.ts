// lib/cron/reports/margin-floor.ts
//
// Weekly Margin Floor Audit: fetches variant_margin_audit view, classifies
// variants by margin status (critical/warning/healthy), flags variants without
// cost data, and emails Nic with the detail tables.

import { sendGmail, supabaseGet } from "@/lib/cron/helpers";

type MarginRow = {
  product: string;
  sku: string;
  size_label: string | null;
  thickness_mm: number | null;
  base_price_usd: number | null;
  list_price_php: number | null;
  production_cost_php: number | null;
  current_margin_pct: number | null;
  min_sell_price_php: number | null;
  is_active: boolean;
  is_price_on_request: boolean;
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "-";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function criticalRows(list: MarginRow[]): string {
  if (list.length === 0)
    return '<tr><td colspan="6" style="padding:14px;text-align:center;color:#047857;">None. All variants with cost data are above the margin floor.</td></tr>';
  return list
    .map(
      (r) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;"><strong>${r.product}</strong></td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;"><code style="font-size:11px;">${r.sku}</code></td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${fmt(r.list_price_php)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${fmt(r.production_cost_php)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#b91c1c;font-weight:700;">${r.current_margin_pct}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${fmt(r.min_sell_price_php)}</td>
    </tr>`
    )
    .join("");
}

function noCostRows(list: MarginRow[]): string {
  return list
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${r.product}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;"><code style="font-size:11px;">${r.sku}</code></td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${r.size_label || ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${fmt(r.list_price_php)}</td>
    </tr>`
    )
    .join("");
}

export async function generateMarginFloorReport() {
  const rows = await supabaseGet<MarginRow[]>("variant_margin_audit", {
    select: "*",
    is_active: "eq.true",
    order: "product.asc,thickness_mm.asc",
  });

  const todayISO = new Date().toISOString().slice(0, 10);

  const total = rows.length;
  const withCost = rows.filter((r) => r.production_cost_php != null);
  const withoutCost = rows.filter((r) => r.production_cost_php == null && !r.is_price_on_request);
  const onRequest = rows.filter((r) => r.is_price_on_request);

  const critical = withCost.filter((r) => r.current_margin_pct != null && r.current_margin_pct < 25);
  const warning = withCost.filter((r) => r.current_margin_pct != null && r.current_margin_pct >= 25 && r.current_margin_pct < 35);
  const healthy = withCost.filter((r) => r.current_margin_pct != null && r.current_margin_pct >= 35);

  const coreNoCost = withoutCost
    .filter((r) => r.product !== "NuSlat")
    .sort((a, b) => (b.base_price_usd ?? 0) - (a.base_price_usd ?? 0));

  const denom = Math.max(1, total - onRequest.length);
  const coverageNum = (withCost.length / denom) * 100;
  const coverage = coverageNum.toFixed(1);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>NUMAT Weekly Margin Audit</title></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f1f14;line-height:1.5;">
<div style="max-width:780px;margin:0 auto;padding:32px 24px;background:#fff;">

<div style="border-bottom:2px solid #2F5D3A;padding-bottom:16px;margin-bottom:24px;">
  <div style="font-size:11px;font-weight:700;color:#2F5D3A;letter-spacing:0.12em;text-transform:uppercase;">NUMAT Sustainable Manufacturing Inc</div>
  <h1 style="font-size:24px;font-weight:700;margin:6px 0 4px 0;">Weekly Margin Floor Audit</h1>
  <div style="font-size:14px;color:#6b7280;">Monday ${todayISO} · Target margin floor 25 percent · FX 60 PHP per USD</div>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Active variants</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">${total}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Across 5 products</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Cost data coverage</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;color:${coverageNum < 50 ? "#b91c1c" : coverageNum < 90 ? "#b45309" : "#047857"};">${withCost.length} / ${total - onRequest.length}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">${coverage}% of priced SKUs</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Below margin floor</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;color:${critical.length > 0 ? "#b91c1c" : "#047857"};">${critical.length}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Margin below 25%</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Healthy margin</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;color:#047857;">${healthy.length}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">35% or higher</div>
  </div>
</div>

${
  critical.length > 0
    ? `
<div style="background:#fee2e2;border-left:4px solid #dc2626;padding:14px 16px;border-radius:4px;margin-bottom:16px;font-size:13px;color:#7f1d1d;">
  <strong style="display:block;margin-bottom:4px;font-size:14px;">${critical.length} variant${critical.length !== 1 ? "s" : ""} priced below 25 percent margin floor</strong>
  These list prices need to be raised or the Quote Builder will allow loss making quotes. See detail table below.
</div>`
    : ""
}

${
  coreNoCost.length > 0
    ? `
<div style="background:#fef9c3;border-left:4px solid #eab308;padding:14px 16px;border-radius:4px;margin-bottom:20px;font-size:13px;color:#713f12;">
  <strong style="display:block;margin-bottom:4px;font-size:14px;">${coreNoCost.length} core variants still need cost data</strong>
  NuBam, NuDoor, NuFloor, and NuWall variants without production cost cannot be audited. Request cost per SKU from Charlie to populate.
</div>`
    : ""
}

<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;">Variants below margin floor</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#f8faf8;">
      <th style="text-align:left;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Product</th>
      <th style="text-align:left;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">SKU</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">List PHP</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Cost PHP</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Margin</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Min sell at 25%</th>
    </tr>
  </thead>
  <tbody>${criticalRows(critical)}</tbody>
</table>

${
  coreNoCost.length > 0
    ? `
<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:32px 0 12px;">Core variants awaiting cost entry</h2>
<table style="width:100%;border-collapse:collapse;font-size:12px;">
  <thead>
    <tr style="background:#f8faf8;">
      <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Product</th>
      <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">SKU</th>
      <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Spec</th>
      <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">List PHP</th>
    </tr>
  </thead>
  <tbody>${noCostRows(coreNoCost)}</tbody>
</table>`
    : ""
}

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">Source: Supabase variant_margin_audit view. Cost data entered via product_variants.production_cost_php. NuSlat variants excluded from weekly audit, handled separately. Enter production cost per SKU to activate margin enforcement for that variant.</div>

</div></body></html>`;

  await sendGmail({
    from: "Nick",
    to: "nick@numat.ph",
    subject: `NUMAT Weekly Margin Audit: ${critical.length} below floor, ${coverage}% cost coverage`,
    html,
  });

  return {
    report: "margin_floor",
    critical_count: critical.length,
    warning_count: warning.length,
    healthy_count: healthy.length,
    coverage_pct: coverageNum,
  };
}