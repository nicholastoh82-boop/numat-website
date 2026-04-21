// lib/cron/reports/finance.ts
//
// Weekly Finance Report: pulls MTD and 7-day financial_transactions, builds
// HTML with MTD income/expense/net, week roll-up, category breakdowns, and
// recent transactions. Emails to nick@numat.ph.

import { sendGmail, supabaseGet } from "@/lib/cron/helpers";

type Txn = {
  transaction_date: string;
  type: string;
  category: string | null;
  amount: number | null;
  currency: string | null;
  vendor_client: string | null;
  description: string | null;
  status: string | null;
};

function fmt(amount: number | null, currency?: string | null): string {
  const n = Number(amount ?? 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${currency || "PHP"} ${abs}`;
}

function sumBy(txns: Txn[], filterFn: (t: Txn) => boolean): number {
  return txns.filter(filterFn).reduce((s, t) => s + Number(t.amount ?? 0), 0);
}

function groupByCategory(txns: Txn[], type: string): Array<[string, { total: number; count: number }]> {
  const groups: Record<string, { total: number; count: number }> = {};
  for (const t of txns.filter((x) => x.type === type)) {
    const key = t.category || "Uncategorized";
    if (!groups[key]) groups[key] = { total: 0, count: 0 };
    groups[key].total += Number(t.amount ?? 0);
    groups[key].count += 1;
  }
  return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
}

function catRow(entries: Array<[string, { total: number; count: number }]>, isExpense: boolean): string {
  return entries
    .map(
      ([cat, d]) => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; color:#111827;">${cat}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; color:#6b7280; text-align:right;">${d.count}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; color:${isExpense ? "#b91c1c" : "#047857"}; font-weight:600; text-align:right;">${fmt(d.total, "PHP")}</td>
    </tr>
  `
    )
    .join("");
}

function recentRows(txns: Txn[]): string {
  return txns
    .slice(0, 10)
    .map(
      (t) => `
    <tr>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:13px;">${t.transaction_date || ""}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; color:#111827; font-size:13px;">${t.vendor_client || ""}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; color:#6b7280; font-size:13px;">${t.category || ""}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; color:${t.type === "expense" ? "#b91c1c" : "#047857"}; font-size:13px; text-align:right; font-weight:600;">${t.type === "expense" ? "-" : "+"}${fmt(t.amount, t.currency)}</td>
    </tr>
  `
    )
    .join("");
}

export async function generateFinanceReport() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [mtdTxns, weekTxns] = await Promise.all([
    supabaseGet<Txn[]>("financial_transactions", {
      select: "transaction_date,type,category,amount,currency,vendor_client,description,status",
      transaction_date: `gte.${monthStart}`,
      order: "transaction_date.desc",
    }),
    supabaseGet<Txn[]>("financial_transactions", {
      select: "transaction_date,type,category,amount,currency,vendor_client,description,status",
      transaction_date: `gte.${weekStart}`,
      order: "transaction_date.desc",
    }),
  ]);

  const monthName = today.toLocaleString("en-US", { month: "long" });
  const year = today.getFullYear();

  const mtdIncome = sumBy(mtdTxns, (t) => t.type === "income");
  const mtdExpense = sumBy(mtdTxns, (t) => t.type === "expense");
  const mtdNet = mtdIncome - mtdExpense;

  const weekIncome = sumBy(weekTxns, (t) => t.type === "income");
  const weekExpense = sumBy(weekTxns, (t) => t.type === "expense");
  const weekNet = weekIncome - weekExpense;

  const mtdCatExpense = groupByCategory(mtdTxns, "expense");
  const mtdCatIncome = groupByCategory(mtdTxns, "income");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Weekly Finance Report</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#111827;">
<div style="max-width:720px; margin:0 auto; padding:32px 24px; background-color:#ffffff;">

  <div style="margin-bottom:28px;">
    <div style="font-size:12px; font-weight:600; color:#6b7280; letter-spacing:0.08em; text-transform:uppercase;">NUMAT Sustainable Manufacturing</div>
    <h1 style="font-size:24px; font-weight:700; color:#111827; margin:6px 0 0 0;">Weekly Finance Report</h1>
    <div style="font-size:14px; color:#6b7280; margin-top:4px;">${monthName} ${year} · Week ending ${today.toISOString().slice(0, 10)}</div>
  </div>

  <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:28px;">
    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px;">
      <div style="font-size:11px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">MTD Income</div>
      <div style="font-size:22px; font-weight:700; color:#047857; margin-top:6px;">${fmt(mtdIncome, "PHP")}</div>
    </div>
    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px;">
      <div style="font-size:11px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">MTD Expense</div>
      <div style="font-size:22px; font-weight:700; color:#b91c1c; margin-top:6px;">${fmt(mtdExpense, "PHP")}</div>
    </div>
    <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px;">
      <div style="font-size:11px; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">MTD Net</div>
      <div style="font-size:22px; font-weight:700; color:${mtdNet >= 0 ? "#047857" : "#b91c1c"}; margin-top:6px;">${fmt(mtdNet, "PHP")}</div>
    </div>
  </div>

  <div style="margin-bottom:24px;">
    <h2 style="font-size:16px; font-weight:600; color:#111827; margin:0 0 12px 0;">Past 7 days</h2>
    <div style="font-size:14px; color:#6b7280;">
      Income: <span style="color:#047857; font-weight:600;">${fmt(weekIncome, "PHP")}</span> &nbsp;·&nbsp;
      Expense: <span style="color:#b91c1c; font-weight:600;">${fmt(weekExpense, "PHP")}</span> &nbsp;·&nbsp;
      Net: <span style="color:${weekNet >= 0 ? "#047857" : "#b91c1c"}; font-weight:600;">${fmt(weekNet, "PHP")}</span> &nbsp;·&nbsp;
      Transactions: <span style="color:#111827; font-weight:600;">${weekTxns.length}</span>
    </div>
  </div>

  ${
    mtdCatExpense.length
      ? `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px; font-weight:600; color:#111827; margin:0 0 12px 0;">MTD expenses by category</h2>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Category</th>
            <th style="text-align:right; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Count</th>
            <th style="text-align:right; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>${catRow(mtdCatExpense, true)}</tbody>
      </table>
    </div>
  `
      : ""
  }

  ${
    mtdCatIncome.length
      ? `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px; font-weight:600; color:#111827; margin:0 0 12px 0;">MTD income by category</h2>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Category</th>
            <th style="text-align:right; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Count</th>
            <th style="text-align:right; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>${catRow(mtdCatIncome, false)}</tbody>
      </table>
    </div>
  `
      : ""
  }

  ${
    weekTxns.length
      ? `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:16px; font-weight:600; color:#111827; margin:0 0 12px 0;">Most recent transactions</h2>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Date</th>
            <th style="text-align:left; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Vendor</th>
            <th style="text-align:left; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Category</th>
            <th style="text-align:right; padding:8px 12px; color:#6b7280; font-size:11px; font-weight:600; text-transform:uppercase; border-bottom:1px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>${recentRows(weekTxns)}</tbody>
      </table>
    </div>
  `
      : `
    <div style="padding:16px; background-color:#fef9c3; border-radius:8px; color:#713f12; font-size:13px; margin-bottom:24px;">
      No transactions recorded in the past 7 days. If expected activity occurred, check the Finance Receipt Processor workflow or manual entry flow.
    </div>
  `
  }

  <div style="margin-top:36px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:12px; color:#9ca3af;">
    Generated automatically by NUMAT finance automation. Data source: Supabase financial_transactions table. For anomalies or missing data, check the Finance Receipt Processor workflow.
  </div>

</div>
</body>
</html>
`;

  await sendGmail({
    from: "Nick",
    to: "nick@numat.ph",
    subject: `NUMAT Weekly Finance Report: ${monthName} ${year} (Week ending ${today.toISOString().slice(0, 10)})`,
    html,
  });

  return {
    report: "finance",
    mtd_income_php: Math.round(mtdIncome),
    mtd_expense_php: Math.round(mtdExpense),
    mtd_net_php: Math.round(mtdNet),
    week_transactions: weekTxns.length,
  };
}