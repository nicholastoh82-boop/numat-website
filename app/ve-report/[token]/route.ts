import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params

  if (!token || token.length < 8) {
    return new NextResponse('Invalid report token', { status: 400 })
  }

  const { data, error } = await supabase
    .from('ve_reports')
    .select('resort_name, rooms, sqm, saving_vs_hard_lo, saving_vs_hard_hi, numat_total_lo, numat_total_hi, view_count, first_viewed_at, rooms_source')
    .eq('token', token)
    .single()

  if (error || !data || !data.resort_name) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Report Not Found</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f7f6}
      .box{text-align:center;padding:48px}
      .h1{font-size:48px;color:#0D1B2A;margin-bottom:8px}
      p{color:#6B8A7A;font-size:16px;line-height:1.6}</style></head>
      <body><div class="box"><div class="h1">404</div>
      <p>Report not found.<br>The link may be incorrect or expired.</p>
      <br><a href="https://numatbamboo.com" style="color:#1D9E75;font-weight:600">Back to NUMAT</a>
      </div></body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Non-hotel entity — no report to show
  if (data.rooms_source && data.rooms_source.startsWith('non_hotel')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Fire-and-forget view tracking
  const now = new Date().toISOString()
  supabase
    .from('ve_reports')
    .update({
      view_count: (data.view_count || 0) + 1,
      last_viewed_at: now,
      ...(data.first_viewed_at ? {} : { first_viewed_at: now }),
    })
    .eq('token', token)
    .then()

  // Build redirect URL with live Supabase data — VEReportClient renders dynamically
  const params = new URLSearchParams({
    for:        data.resort_name,
    rooms:      String(data.rooms || 50),
    sqm:        String(data.sqm || (data.rooms || 50) * 35),
    save_lo:    String(data.saving_vs_hard_lo || 0),
    save_hi:    String(data.saving_vs_hard_hi || 0),
    numat_lo:   String(data.numat_total_lo || 0),
    numat_hi:   String(data.numat_total_hi || 0),
  })

  return NextResponse.redirect(new URL(`/ve-report?${params.toString()}`, request.url))
}
