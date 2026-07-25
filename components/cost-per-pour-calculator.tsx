'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RotateCcw } from 'lucide-react'

/**
 * Cost per pour calculator.
 *
 * Formula is taken from NUMAT's own cost per pour sheet:
 *   cost per pour = (board price + propping cost) / reuse cycles
 * Cross checked against that sheet: conventional (450+700)/3 = 383 ~ "PHP 360+",
 * and the NuForm pilot (2500+500)/10 = 300 = "PHP 300". It reconciles.
 *
 * Every assumption below is a user input rather than a baked in constant,
 * because NuWev's reuse cycle count has not been established by test. The
 * defaults are conservative and labelled as assumptions in the UI.
 */

const BOARD_AREA_SQM = (2440 / 1000) * (1220 / 1000) // 2.9768

const PHP = (n: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(n)

type NumFieldProps = {
  label: string
  value: number
  onChange: (n: number) => void
  suffix?: string
  hint?: string
  min?: number
  step?: number
}

function NumField({ label, value, onChange, suffix, hint, min = 0, step = 1 }: NumFieldProps) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </span>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 focus-within:border-emerald-700">
        <input
          type="number"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full bg-transparent py-2.5 text-sm font-semibold text-stone-900 outline-none"
        />
        {suffix && <span className="shrink-0 text-xs text-stone-400">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[11px] leading-4 text-stone-400">{hint}</span>}
    </label>
  )
}

const DEFAULTS = {
  area: 500,
  convPrice: 550,
  convProp: 850,
  convReuse: 3.5,
  nuPrice: 3500,
  nuProp: 500,
  nuReuse: 10,
}

export default function CostPerPourCalculator() {
  const [area, setArea] = useState(DEFAULTS.area)
  const [convPrice, setConvPrice] = useState(DEFAULTS.convPrice)
  const [convProp, setConvProp] = useState(DEFAULTS.convProp)
  const [convReuse, setConvReuse] = useState(DEFAULTS.convReuse)
  const [nuPrice, setNuPrice] = useState(DEFAULTS.nuPrice)
  const [nuProp, setNuProp] = useState(DEFAULTS.nuProp)
  const [nuReuse, setNuReuse] = useState(DEFAULTS.nuReuse)

  const r = useMemo(() => {
    const safe = (n: number, fb = 0) => (Number.isFinite(n) && n > 0 ? n : fb)
    const a = safe(area, 0)
    const boards = a > 0 ? Math.ceil(a / BOARD_AREA_SQM) : 0

    const convPerPour = (safe(convPrice) + safe(convProp)) / safe(convReuse, 1)
    const nuPerPour = (safe(nuPrice) + safe(nuProp)) / safe(nuReuse, 1)

    const convTotal = convPerPour * boards
    const nuTotal = nuPerPour * boards
    const diffPerPour = convPerPour - nuPerPour
    const diffTotal = convTotal - nuTotal

    // Reuse cycles NuWev must reach to match the conventional cost per pour.
    const breakeven =
      convPerPour > 0 ? (safe(nuPrice) + safe(nuProp)) / convPerPour : 0

    return { boards, convPerPour, nuPerPour, convTotal, nuTotal, diffPerPour, diffTotal, breakeven }
  }, [area, convPrice, convProp, convReuse, nuPrice, nuProp, nuReuse])

  const nuWins = r.diffPerPour > 0

  const reset = () => {
    setArea(DEFAULTS.area); setConvPrice(DEFAULTS.convPrice); setConvProp(DEFAULTS.convProp)
    setConvReuse(DEFAULTS.convReuse); setNuPrice(DEFAULTS.nuPrice); setNuProp(DEFAULTS.nuProp)
    setNuReuse(DEFAULTS.nuReuse)
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 bg-stone-50 px-6 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Work out your own number
          </p>
          <h3 className="mt-1 text-xl font-semibold text-stone-950">Cost per pour calculator</h3>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <NumField
            label="Formwork area"
            value={area}
            onChange={setArea}
            suffix="m²"
            hint={`${r.boards} boards at ${BOARD_AREA_SQM.toFixed(2)} m² per 2440 x 1220 sheet`}
          />

          <fieldset className="rounded-2xl border border-stone-200 p-4">
            <legend className="px-1.5 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
              What you use now
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumField label="Board price" value={convPrice} onChange={setConvPrice} suffix="PHP" />
              <NumField label="Propping" value={convProp} onChange={setConvProp} suffix="PHP" />
              <NumField label="Pours" value={convReuse} onChange={setConvReuse} step={0.5} min={0.5} />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <legend className="px-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
              NuWev
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumField label="Board price" value={nuPrice} onChange={setNuPrice} suffix="PHP" />
              <NumField label="Propping" value={nuProp} onChange={setNuProp} suffix="PHP" />
              <NumField label="Pours" value={nuReuse} onChange={setNuReuse} step={0.5} min={0.5} />
            </div>
            <p className="mt-3 text-[11px] leading-4 text-stone-500">
              Pour counts are your assumptions, not a tested figure. Change them to match what you
              see on site.
            </p>
          </fieldset>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                Your board
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{PHP(r.convPerPour)}</p>
              <p className="text-xs text-stone-500">per pour, per board</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                NuWev
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{PHP(r.nuPerPour)}</p>
              <p className="text-xs text-stone-500">per pour, per board</p>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              nuWins ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">
              {nuWins ? 'Saving across this job' : 'On these numbers, NuWev costs more'}
            </p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">
              {PHP(Math.abs(r.diffTotal))}
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              {nuWins
                ? `Across ${r.boards} boards at ${PHP(Math.abs(r.diffPerPour))} saved per pour.`
                : `NuWev needs ${r.breakeven.toFixed(1)} pours to match your current cost per pour. You have assumed ${nuReuse}.`}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 p-5">
            <p className="text-sm leading-6 text-stone-600">
              The honest way to settle this is a board on your own site. NuWev is{' '}
              <span className="font-semibold text-stone-900">PHP 3,500 with no minimum order</span>,
              so you can buy one and count the pours yourself.
            </p>
            <Link
              href="/request-samples"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-900"
            >
              Request a sample board
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
