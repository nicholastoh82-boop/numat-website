'use client'

import { useState } from 'react'

const metrics = [
  {
    id: 'mor',
    label: 'Bending Strength (MOR)',
    title: 'Modulus of Rupture — Bending Strength',
    explainer:
      'MOR measures how much load a board can take before breaking. Higher = stronger floors, shelves, and structural panels. The metric most specifiers use to qualify structural materials.',
    winner: 'numat',
    bars: [
      { name: 'NUMAT', pct: 100, label: '69.44 MPa peak', range: '22–69 MPa', color: 'bg-emerald-600' },
      { name: 'Plywood', pct: 87, label: '~60 MPa', range: '30–60 MPa', color: 'bg-stone-400' },
      { name: 'Hardwood', pct: 72, label: '~50 MPa', range: '40–80 MPa', color: 'bg-amber-500' },
    ],
    note: 'Upper-end NUMAT boards exceed typical plywood bending strength. Mid-range configurations are fully competitive with commercial plywood grades.',
  },
  {
    id: 'moe',
    label: 'Stiffness (MOE)',
    title: 'Modulus of Elasticity — Stiffness',
    explainer:
      'MOE measures how much a board flexes under load without breaking. Higher MOE means less sag and bounce underfoot — critical for flooring, shelving, and long spans.',
    winner: 'numat',
    bars: [
      { name: 'NUMAT', pct: 100, label: '10,256 MPa peak', range: '2,211–10,256 MPa', color: 'bg-emerald-600' },
      { name: 'Plywood', pct: 88, label: '~9,000 MPa', range: '4,000–9,000 MPa', color: 'bg-stone-400' },
      { name: 'Hardwood', pct: 90, label: '~9,500 MPa', range: '7,000–12,000 MPa', color: 'bg-amber-500' },
    ],
    note: 'Upper-end NUMAT results outperform typical plywood references. Stiffness varies by ply configuration and board thickness.',
  },
  {
    id: 'comp',
    label: 'Compression',
    title: 'Compression Strength',
    explainer:
      'How much vertical load a board can bear before crushing. Critical for load-bearing walls, columns, and structural flooring applications.',
    winner: 'comparable',
    bars: [
      { name: 'NUMAT', pct: 87, label: '30.46 MPa peak', range: '25–30 MPa', color: 'bg-emerald-600' },
      { name: 'Plywood', pct: 100, label: '~35 MPa', range: '20–35 MPa', color: 'bg-stone-400' },
      { name: 'Hardwood', pct: 80, label: '~28 MPa', range: '20–50 MPa', color: 'bg-amber-500' },
    ],
    note: 'NUMAT compressive performance sits within the range expected for commercial plywood — fully qualified for structural applications.',
  },
  {
    id: 'hard',
    label: 'Hardness',
    title: 'Surface Hardness',
    explainer:
      'Resistance to surface denting and scratching, measured in Newtons. Higher = more durable surfaces for flooring, worktops, and high-traffic areas.',
    winner: 'numat',
    bars: [
      { name: 'NUMAT', pct: 100, label: '7,377 N peak', range: '3,918–7,377 N', color: 'bg-emerald-600' },
      { name: 'Plywood', pct: 43, label: '~3,200 N', range: 'Typically lower', color: 'bg-stone-400' },
      { name: 'Hardwood', pct: 67, label: '~5,000 N', range: '3,000–6,000 N', color: 'bg-amber-500' },
    ],
    note: 'NUMAT surface hardness significantly exceeds typical plywood and is competitive with hardwood — making it ideal for flooring and exposed surfaces.',
  },
]

export default function TestingCharts() {
  const [activeId, setActiveId] = useState('mor')
  const active = metrics.find((m) => m.id === activeId)!

  return (
    <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm lg:p-8">

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveId(m.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeId === m.id
                ? 'bg-emerald-700 text-white'
                : 'border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-5 text-sm text-stone-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-600" />
          NUMAT Bamboo
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-stone-400" />
          Typical Plywood
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-amber-500" />
          Hardwood (reference)
        </span>
      </div>

      {/* Explainer */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-semibold text-emerald-900">{active.title}</p>
        <p className="mt-1 text-sm leading-7 text-emerald-800">{active.explainer}</p>
      </div>

      {/* Metric title + badge */}
      <div className="mb-5 flex items-center gap-3">
        <p className="text-sm font-semibold text-stone-800">Performance comparison</p>
        {active.winner === 'numat' ? (
          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
            NUMAT leads
          </span>
        ) : (
          <span className="rounded-full bg-stone-100 px-3 py-0.5 text-xs font-semibold text-stone-600">
            Comparable
          </span>
        )}
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {active.bars.map((bar) => (
          <div key={bar.name}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">{bar.name}</span>
              <span className="text-xs text-stone-400">{bar.range}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 overflow-hidden rounded-full bg-stone-100" style={{ height: 28 }}>
                <div
                  className={`flex h-full items-center rounded-full px-3 text-xs font-semibold text-white transition-all duration-700 ${bar.color}`}
                  style={{ width: `${bar.pct}%` }}
                >
                  {bar.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 px-5 py-4">
        <p className="text-sm leading-7 text-stone-500">{active.note}</p>
      </div>

    </div>
  )
}