// app/finance/reports/page.tsx
// Reports landing page. Add more report types here as you build them.

import Link from "next/link";

export default function ReportsIndexPage() {
  const reports = [
    {
      href: "/finance/reports/pl",
      title: "Profit and Loss Statement",
      description:
        "Assembly Works style income statement, grouped by Income, Cost of Sales, Other Income, Expenses, and Other Expenses. Shows PHP and USD side by side using the Bangko Sentral ng Pilipinas monthly average exchange rate for the selected period.",
    },
    {
      href: "/finance",
      title: "Dashboard and Running Balances",
      description:
        "Current bank account balances, running balance chart over time, outstanding salary advances, and recent transactions.",
    },
    {
      href: "/finance/transactions",
      title: "Transaction Ledger",
      description:
        "Full list of every transaction with filters by date, entry type, and status. Click any row to edit or correct mistakes.",
    },
  ];

  return (
    <div className="p-6 bg-white max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Financial Reports</h1>
      <div className="space-y-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-400 hover:shadow-sm transition"
          >
            <h2 className="text-lg font-medium text-gray-900 mb-1">{r.title}</h2>
            <p className="text-sm text-gray-600">{r.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}