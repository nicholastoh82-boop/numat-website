import Link from 'next/link';

const TOOLS = [
  {
    href: '/crm/production/qc',
    emoji: '📷',
    title: 'QC Check',
    description: 'Photograph boards, veneers, and slats at any station. Gemini Vision flags defects in seconds and returns a PASS, NEEDS REVIEW, or REJECT verdict with defect type, location, and severity.',
    roles: 'Admin, Ops, Sales',
    cta: 'Open QC Check',
    card: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
  },
  {
    href: '/crm/production/forecast',
    emoji: '📈',
    title: 'Production Forecast',
    description: 'Board output actuals for the last 6 months plus a 3-month forward forecast. Shows implied veneer and slat needs so purchasing can plan material orders in advance.',
    roles: 'Admin, Ops, CEO',
    cta: 'Open Forecast',
    card: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    btn: 'bg-blue-600 hover:bg-blue-700',
  },
];

const STATIONS = [
  ['📦','Slat Receipt'],['🪚','Planing'],['🧴','Gluing'],
  ['🪵','Veneer Sanding'],['🟫','Board Press'],['✅','Final Inspection'],
];

export default function ProductionHubPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Production</h1>
          <p className="text-slate-600 mt-1">Factory tools for quality control and demand planning.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {TOOLS.map((t) => (
            <div key={t.href} className={`border-2 rounded-xl p-5 flex flex-col ${t.card} transition`}>
              <div className="text-4xl mb-3">{t.emoji}</div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">{t.title}</h2>
              <p className="text-sm text-slate-700 flex-1 mb-4">{t.description}</p>
              <div className="text-xs text-slate-500 mb-3">Access: {t.roles}</div>
              <Link href={t.href} className={`${t.btn} text-white text-sm font-semibold px-4 py-2.5 rounded-lg text-center transition`}>
                {t.cta} →
              </Link>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-sm font-semibold text-slate-700 mb-2">QC stations</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-slate-600">
            {STATIONS.map(([emoji, label]) => (
              <div key={label} className="flex items-center gap-2"><span>{emoji}</span><span>{label}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
