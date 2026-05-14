import { NextRequest, NextResponse } from 'next/server'
import { requireProductionUser, adminClient } from '../_lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireProductionUser()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const sc = adminClient()

  const [slats, planing, gluing, sanding, boards, borax] = await Promise.all([
    sc.from('prod_slat_receipts').select('*').gte('event_date', since).eq('voided', false),
    sc.from('prod_planing_runs').select('*').gte('event_date', since).eq('voided', false),
    sc.from('prod_gluing_runs').select('*').gte('event_date', since).eq('voided', false),
    sc.from('prod_veneer_sanding').select('*').gte('event_date', since).eq('voided', false),
    sc.from('prod_board_runs').select('*').gte('event_date', since).eq('voided', false),
    sc.from('prod_borax_tests').select('*').gte('event_date', since).eq('voided', false),
  ])

  const slatRows = slats.data || []
  const planeRows = planing.data || []
  const glueRows = gluing.data || []
  const sandRows = sanding.data || []
  const boardRows = boards.data || []

  const slatsReceived = slatRows.reduce((s, r: any) => s + (r.slats_received || 0), 0)
  const slatsPassed = slatRows.reduce((s, r: any) => s + (r.slats_passed || 0), 0)
  const slatsRejected = slatRows.reduce((s, r: any) => s + (r.slats_rejected || 0), 0)
  const veneersProduced = glueRows.reduce((s, r: any) => s + (r.veneers_produced || 0), 0)
  const veneersSandedPassed = sandRows.reduce((s, r: any) => s + (r.veneers_passed || 0), 0)
  const boardsProduced = boardRows.reduce((s, r: any) => s + (r.boards_produced || 0), 0)
  const boardsPassed = boardRows.reduce((s, r: any) => s + (r.boards_passed || 0), 0)

  const qaPassRate = slatsReceived > 0 ? (slatsPassed / slatsReceived) * 100 : 0
  const slatToVeneerRate = slatsPassed > 0 ? (veneersProduced / slatsPassed) : 0
  const veneerSandRate = veneersProduced > 0 ? (veneersSandedPassed / veneersProduced) * 100 : 0
  const boardYield = boardsProduced > 0 ? (boardsPassed / boardsProduced) * 100 : 0
  const overallYield = slatsReceived > 0 ? (boardsPassed / slatsReceived) * 100 : 0

  const downtimeByStation = {
    rough_planing: planeRows.filter((r: any) => r.station === 'rough').reduce((s, r: any) => s + (r.downtime_min || 0), 0),
    fine_planing: planeRows.filter((r: any) => r.station === 'fine').reduce((s, r: any) => s + (r.downtime_min || 0), 0),
    gluing: glueRows.reduce((s, r: any) => s + (r.downtime_min || 0), 0),
    boards: boardRows.reduce((s, r: any) => s + (r.downtime_min || 0), 0),
  }

  const defectsByCategory: Record<string, number> = {}
  const addDefect = (c: string, n: number) => { defectsByCategory[c] = (defectsByCategory[c] || 0) + n }
  slatRows.forEach((r: any) => {
    addDefect('Cracks', r.reject_cracks || 0); addDefect('Blue stain', r.reject_blue_stain || 0)
    addDefect('Insect', r.reject_insect || 0); addDefect('Undersized', r.reject_undersized || 0)
    addDefect('Moisture', r.reject_moisture || 0); addDefect('Other', r.reject_other || 0)
  })
  planeRows.forEach((r: any) => {
    addDefect('Cracks', r.defect_cracks || 0); addDefect('Blue stain', r.defect_blue_stain || 0)
    addDefect('Dimensional', r.defect_dimensional || 0); addDefect('Other', r.defect_other || 0)
  })
  glueRows.forEach((r: any) => {
    addDefect('Bond failure', r.defect_bond_fail || 0); addDefect('Blowout', r.defect_blowout || 0)
    addDefect('Other', r.defect_other || 0)
  })
  sandRows.forEach((r: any) => {
    addDefect('Surface', r.defect_surface || 0); addDefect('Dimensional', r.defect_dimensional || 0)
    addDefect('Glue bleed', r.defect_glue_bleed || 0); addDefect('Other', r.defect_other || 0)
  })
  boardRows.forEach((r: any) => {
    addDefect('Delamination', r.defect_delamination || 0); addDefect('Surface', r.defect_surface || 0)
    addDefect('Dimensional', r.defect_dimensional || 0); addDefect('Glue bleed', r.defect_glue_bleed || 0)
    addDefect('Other', r.defect_other || 0)
  })

  const slatsWithMc = slatRows.filter((r: any) => r.mc_avg !== null && r.mc_avg !== undefined)
  const avgIncomingMc = slatsWithMc.length > 0 ? slatsWithMc.reduce((s, r: any) => s + Number(r.mc_avg), 0) / slatsWithMc.length : null
  const glueWithMc = glueRows.filter((r: any) => r.pre_press_mc_avg !== null && r.pre_press_mc_avg !== undefined)
  const avgPrePressMc = glueWithMc.length > 0 ? glueWithMc.reduce((s, r: any) => s + Number(r.pre_press_mc_avg), 0) / glueWithMc.length : null

  const boardsWithTemp = boardRows.filter((r: any) => r.platen_temp_c !== null)
  const avgPlatenTemp = boardsWithTemp.length > 0 ? boardsWithTemp.reduce((s, r: any) => s + Number(r.platen_temp_c), 0) / boardsWithTemp.length : null
  const boardsWithPressure = boardRows.filter((r: any) => r.pressure_bar !== null)
  const avgPressure = boardsWithPressure.length > 0 ? boardsWithPressure.reduce((s, r: any) => s + Number(r.pressure_bar), 0) / boardsWithPressure.length : null
  const boardsWithTime = boardRows.filter((r: any) => r.press_time_min !== null)
  const avgPressTime = boardsWithTime.length > 0 ? boardsWithTime.reduce((s, r: any) => s + Number(r.press_time_min), 0) / boardsWithTime.length : null

  const dailyBoards: Record<string, number> = {}
  boardRows.forEach((r: any) => { dailyBoards[r.event_date] = (dailyBoards[r.event_date] || 0) + (r.boards_passed || 0) })
  const dailyTrend = Object.entries(dailyBoards).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, boards: count }))

  const boardsBySku: Record<string, { produced: number; passed: number; defects: number }> = {}
  boardRows.forEach((r: any) => {
    const k = r.sku_snapshot || 'unknown'
    if (!boardsBySku[k]) boardsBySku[k] = { produced: 0, passed: 0, defects: 0 }
    boardsBySku[k].produced += r.boards_produced || 0
    boardsBySku[k].passed += r.boards_passed || 0
    boardsBySku[k].defects += r.defects || 0
  })

  // Borax test stats
  const boraxRows = borax.data || []
  const boraxSlatsPass = boraxRows.reduce((s, r: any) => s + (r.slats_pass || 0), 0)
  const boraxSlatsFail = boraxRows.reduce((s, r: any) => s + (r.slats_fail || 0), 0)
  const boraxBatchesTested = new Set(boraxRows.map((r: any) => r.slat_receipt_id)).size
  const boraxBatchesFlagged = slatRows.filter((r: any) => r.borax_test_status === 'flagged_for_review').length

  return NextResponse.json({
    period_days: days, since,
    borax: {
      batches_tested: boraxBatchesTested,
      batches_flagged_for_review: boraxBatchesFlagged,
      slats_pass: boraxSlatsPass,
      slats_fail: boraxSlatsFail,
    },
    totals: { slats_received: slatsReceived, slats_passed: slatsPassed, slats_rejected: slatsRejected,
      veneers_produced: veneersProduced, veneers_sanded_passed: veneersSandedPassed,
      boards_produced: boardsProduced, boards_passed: boardsPassed },
    yield: { qa_pass_rate_pct: qaPassRate, slats_per_veneer: slatToVeneerRate,
      veneer_sand_pass_rate_pct: veneerSandRate, board_pass_rate_pct: boardYield,
      overall_yield_pct: overallYield },
    downtime_minutes: downtimeByStation,
    defects: defectsByCategory,
    moisture: { avg_incoming_pct: avgIncomingMc, avg_pre_press_pct: avgPrePressMc },
    press_avg: { platen_temp_c: avgPlatenTemp, pressure_bar: avgPressure, press_time_min: avgPressTime },
    daily_trend: dailyTrend,
    boards_by_sku: boardsBySku,
  })
}
