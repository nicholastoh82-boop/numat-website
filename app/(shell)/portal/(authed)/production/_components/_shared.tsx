'use client'

export const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-900'

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// Defect bin counter: small +/- counter UI used across forms.
type Bin = { key: string; label: string; value: number }

export function DefectBins({ bins, onChange, helperText }: { bins: Bin[]; onChange: (key: string, value: number) => void; helperText?: string }) {
  const total = bins.reduce((s, b) => s + b.value, 0)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-gray-700">Defect breakdown</label>
        <span className="text-xs text-gray-500">Total: <strong className="text-gray-900">{total}</strong></span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {bins.map(b => (
          <div key={b.key} className="flex items-center justify-between gap-2 border border-gray-200 rounded px-2 py-1.5">
            <span className="text-xs text-gray-700 capitalize">{b.label}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onChange(b.key, Math.max(0, b.value - 1))}
                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold leading-none"
                aria-label={`decrement ${b.label}`}>
                −
              </button>
              <input type="number" inputMode="numeric" value={b.value || ''}
                onChange={e => onChange(b.key, Math.max(0, parseInt(e.target.value) || 0))}
                className="w-12 text-center text-sm tabular-nums border-0 focus:outline-none" placeholder="0" />
              <button type="button" onClick={() => onChange(b.key, b.value + 1)}
                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold leading-none"
                aria-label={`increment ${b.label}`}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {helperText && <p className="text-[11px] text-gray-400 mt-1">{helperText}</p>}
    </div>
  )
}

// Shift operator field. Same dropdown set across stations.
const SHIFT_OPS = ['Boyet', 'Francisco', 'Charlie', 'Jesilla', 'Analie', 'Other']
export function ShiftOperator({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Shift operator" hint="Who actually ran the station this shift (may differ from who's typing)">
      <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
        <option value="">Select.</option>
        {SHIFT_OPS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )
}

export const todayISO = () => new Date().toISOString().slice(0, 10)
