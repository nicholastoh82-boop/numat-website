import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const {
    event_date, variant_id, sku_snapshot, ply_count,
    veneers_consumed, boards_produced, boards_passed, defects,
    downtime_min, downtime_reason, notes, shift_operator,
    adhesive_batch_id, platen_temp_c, pressure_bar, press_time_min, close_time_sec,
    defect_delamination, defect_surface, defect_dimensional, defect_glue_bleed, defect_other,
    amakan_layers, amakan_sheets_consumed,
  } = body
  if (!event_date || !variant_id || !sku_snapshot || !ply_count) return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  const v = Number(veneers_consumed), bp = Number(boards_produced), bpa = Number(boards_passed), d = Number(defects || 0), dt = Number(downtime_min || 0)
  if (v < 0 || bp < 0 || bpa < 0 || d < 0 || bpa + d > bp) return NextResponse.json({ error: 'invalid quantities' }, { status: 400 })

  const num = (x: any) => x === null || x === undefined || x === '' ? null : Number(x)
  const intOr0 = (x: any) => Math.max(0, Math.floor(Number(x) || 0))

  const sc = adminClient()
  const { data, error } = await sc.from('prod_board_runs').insert({
    event_date, variant_id, sku_snapshot, ply_count: Number(ply_count),
    veneers_consumed: v, boards_produced: bp, boards_passed: bpa, defects: d,
    downtime_min: dt, downtime_reason: downtime_reason || null, notes: notes || null,
    submitted_by: auth.email, shift_operator: shift_operator || null,
    adhesive_batch_id: adhesive_batch_id || null,
    platen_temp_c: num(platen_temp_c), pressure_bar: num(pressure_bar),
    press_time_min: num(press_time_min), close_time_sec: close_time_sec ? Math.floor(Number(close_time_sec)) : null,
    defect_delamination: intOr0(defect_delamination), defect_surface: intOr0(defect_surface),
    defect_dimensional: intOr0(defect_dimensional), defect_glue_bleed: intOr0(defect_glue_bleed),
    defect_other: intOr0(defect_other),
    amakan_layers: amakan_layers === '' || amakan_layers === null || amakan_layers === undefined ? null : Math.floor(Number(amakan_layers)),
    amakan_sheets_consumed: num(amakan_sheets_consumed),
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
