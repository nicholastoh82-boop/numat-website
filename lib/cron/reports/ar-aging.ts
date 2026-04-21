// lib/cron/reports/ar-aging.ts
//
// Weekly AR Aging Report: fetches accounts_receivable, builds HTML with aging
// buckets, customer rollup, and invoice-level detail. Emails to nick@numat.ph.

import { sendGmail, supabaseGet } from "@/lib/cron/helpers";

type ArRow = {
  invoice_number: string;
  customer: string;
  invoice_date: string | null;
  due_date: string;
  invoice_value: number | null;
  paid_amount: number | null;
  outstanding_amount: number | null;
  currency: string | null;
  status: string | null;
  notes: string | null;
};

type ArOpenRow = ArRow & { overdueDays: number; interest: number };

type Bucket = { label: string; total: number; count: number; rows: ArOpenRow[] };

function fmt(n: number | null | undefined): string {
  const x = Number(n ?? 0);
  return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

function bucketRows(bucket: Bucket, color: string): string {
  if (bucket.rows.length === 0) return "";
  return bucket.rows
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6;">${r.invoice_number}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6;">${r.customer}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; color:#6b7280;">${r.due_date}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; text-align:right; color:${color}; font-weight:600;">${fmt(r.outstanding_amount)}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; text-align:right;">${r.overdueDays > 0 ? r.overdueDays + "d" : "current"}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; text-align:right; color:#b45309;">${fmt(r.interest)}</td>
    </tr>`
    )
    .join("");
}

export async function generateArAgingReport() {
  const rows = await supabaseGet<ArRow[]>("accounts_receivable", {
    select: "invoice_number,customer,invoice_date,due_date,invoice_value,paid_amount,outstanding_amount,currency,status,notes",
    order: "due_date.asc",
  });

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const monthName = today.toLocaleString("en-US", { month: "long" });
  const year = today.getFullYear();

  const buckets: Record<string, Bucket> = {
    current: { label: "Not yet due", total: 0, count: 0, rows: [] },
    d1_30: { label: "1 to 30 days overdue", total: 0, count: 0, rows: [] },
    d31_60: { label: "31 to 60 days overdue", total: 0, count: 0, rows: [] },
    d61_90: { label: "61 to 90 days overdue", total: 0, count: 0, rows: [] },
    d90plus: { label: "90+ days overdue", total: 0, count: 0, rows: [] },
  };

  let totalInvoiced = 0,
    totalReceived = 0,
    totalOutstanding = 0,
    totalInterest = 0;
  const openInvoices: ArOpenRow[] = [];

  for (const r of rows) {
    const outstanding = Number(r.outstanding_amount ?? 0);
    totalInvoiced += Number(r.invoice_value ?? 0);
    totalReceived += Number(r.paid_amount ?? 0);
    if (outstanding <= 0) continue;
    totalOutstanding += outstanding;
    const overdueDays = daysBetween(todayISO, r.due_date);
    const interest = overdueDays > 0 ? Math.round(((outstanding * 0.02 * overdueDays) / 30) * 100) / 100 : 0;
    totalInterest += interest;
    const rec: ArOpenRow = { ...r, overdueDays, interest };
    openInvoices.push(rec);
    if (overdueDays <= 0) {
      buckets.current.total += outstanding;
      buckets.current.count++;
      buckets.current.rows.push(rec);
    } else if (overdueDays <= 30) {
      buckets.d1_30.total += outstanding;
      buckets.d1_30.count++;
      buckets.d1_30.rows.push(rec);
    } else if (overdueDays <= 60) {
      buckets.d31_60.total += outstanding;
      buckets.d31_60.count++;
      buckets.d31_60.rows.push(rec);
    } else if (overdueDays <= 90) {
      buckets.d61_90.total += outstanding;
      buckets.d61_90.count++;
      buckets.d61_90.rows.push(rec);
    } else {
      buckets.d90plus.total += outstanding;
      buckets.d90plus.count++;
      buckets.d90plus.rows.push(rec);
    }
  }

  const byCustomer: Record<string, { total: number; count: number; maxDays: number }> = {};
  for (const inv of openInvoices) {
    if (!byCustomer[inv.customer]) byCustomer[inv.customer] = { total: 0, count: 0, maxDays: 0 };
    byCustomer[inv.customer].total += Number(inv.outstanding_amount ?? 0);
    byCustomer[inv.customer].count++;
    if (inv.overdueDays > byCustomer[inv.customer].maxDays) byCustomer[inv.customer].maxDays = inv.overdueDays;
  }

  const custRows = Object.entries(byCustomer)
    .sort((a, b) => b[1].total - a[1].total)
    .map(
      ([c, d]) => `
  <tr>
    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${c}</td>
    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:700; color:${d.maxDays > 30 ? "#b91c1c" : "#b45309"};">PHP ${fmt(d.total)}</td>
    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">${d.count}</td>
    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">${d.maxDays} days</td>
  </tr>`
    )
    .join("");

  const collectionRate = totalInvoiced > 0 ? ((totalReceived / totalInvoiced) * 100).toFixed(1) : "0.0";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>NUMAT Weekly AR Aging</title></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f1f14;line-height:1.5;">
<div style="max-width:780px;margin:0 auto;padding:32px 24px;background:#fff;">

<div style="border-bottom:2px solid #2F5D3A;padding-bottom:16px;margin-bottom:28px;">
  <div style="font-size:11px;font-weight:700;color:#2F5D3A;letter-spacing:0.12em;text-transform:uppercase;">NUMAT Sustainable Manufacturing Inc</div>
  <h1 style="font-size:24px;font-weight:700;margin:6px 0 4px 0;color:#0f1f14;">Weekly AR Aging Report</h1>
  <div style="font-size:14px;color:#6b7280;">Monday ${todayISO} · ${monthName} ${year}</div>
</div>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Total Outstanding</div>
    <div style="font-size:20px;font-weight:700;color:#b91c1c;margin-top:4px;">PHP ${fmt(totalOutstanding)}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">${openInvoices.length} open invoice${openInvoices.length !== 1 ? "s" : ""}</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Interest Accrued</div>
    <div style="font-size:20px;font-weight:700;color:#b45309;margin-top:4px;">PHP ${fmt(totalInterest)}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">2% per month</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Total Invoiced</div>
    <div style="font-size:20px;font-weight:700;color:#0f1f14;margin-top:4px;">PHP ${fmt(totalInvoiced)}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">All time</div>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Total Received</div>
    <div style="font-size:20px;font-weight:700;color:#047857;margin-top:4px;">PHP ${fmt(totalReceived)}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">${collectionRate}% collection rate</div>
  </div>
</div>

<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;">Aging Buckets</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#f8faf8;">
      <th style="text-align:left;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Bucket</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Invoices</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Amount (PHP)</th>
    </tr>
  </thead>
  <tbody>
    ${Object.entries(buckets)
      .map(([k, b]) => {
        const color = k === "current" ? "#047857" : k === "d1_30" ? "#b45309" : k === "d31_60" ? "#dc2626" : "#7f1d1d";
        return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:${color};font-weight:600;">${b.label}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${b.count}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700;color:${color};">${fmt(b.total)}</td>
      </tr>`;
      })
      .join("")}
  </tbody>
</table>

<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;">By Customer</h2>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#f8faf8;">
      <th style="text-align:left;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Customer</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Outstanding</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Invoices</th>
      <th style="text-align:right;padding:10px 12px;color:#2F5D3A;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Oldest</th>
    </tr>
  </thead>
  <tbody>${custRows || '<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;">No outstanding invoices</td></tr>'}</tbody>
</table>

${
  openInvoices.length > 0
    ? `
<h2 style="font-size:16px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:24px 0 12px;">Invoice Detail</h2>
<table style="width:100%;border-collapse:collapse;font-size:12px;">
  <thead>
    <tr style="background:#f8faf8;">
      <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Inv #</th>
      <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Customer</th>
      <th style="text-align:left;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Due</th>
      <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Outstanding</th>
      <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Overdue</th>
      <th style="text-align:right;padding:8px 12px;color:#2F5D3A;font-size:10px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #2F5D3A;">Interest</th>
    </tr>
  </thead>
  <tbody>
    ${bucketRows(buckets.d90plus, "#7f1d1d")}
    ${bucketRows(buckets.d61_90, "#dc2626")}
    ${bucketRows(buckets.d31_60, "#dc2626")}
    ${bucketRows(buckets.d1_30, "#b45309")}
    ${bucketRows(buckets.current, "#047857")}
  </tbody>
</table>`
    : ""
}

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">Source: Supabase accounts_receivable table. Interest at 2 percent per month on overdue balances, proportional to days past due. Send collection emails via CRM for any balance above PHP 100,000 aged more than 14 days.</div>

</div></body></html>`;

  await sendGmail({
    from: "Nick",
    to: "nick@numat.ph",
    subject: `NUMAT Weekly AR Aging: ${openInvoices.length} open invoices, PHP ${fmt(totalOutstanding)} outstanding`,
    html,
  });

  return { report: "ar_aging", open_invoices: openInvoices.length, outstanding_php: Math.round(totalOutstanding) };
}