import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPPORTED_CURRENCIES = new Set([
  'USD',
  'PHP',
  'SGD',
  'MYR',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'JPY',
  'HKD',
  'CNY',
  'AED',
])

/**
 * GET /api/exchange-rate?currency=MYR&base=PHP
 *
 * `base` defaults to USD so every existing caller keeps its previous behaviour.
 * NuWeave pricing is authored in PHP, so the product surfaces pass base=PHP and
 * convert outward from the PHP list price at the rate of the day.
 */
export async function GET(request: NextRequest) {
  const currency = request.nextUrl.searchParams.get('currency')?.toUpperCase().trim() || 'USD'
  const base = request.nextUrl.searchParams.get('base')?.toUpperCase().trim() || 'USD'

  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return NextResponse.json({ error: `Unsupported currency: ${currency}` }, { status: 400 })
  }

  if (!SUPPORTED_CURRENCIES.has(base)) {
    return NextResponse.json({ error: `Unsupported base currency: ${base}` }, { status: 400 })
  }

  if (currency === base) {
    return NextResponse.json(
      { base, currency, rate: 1, source: 'internal' },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(base)}/${encodeURIComponent(currency)}`,
      { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `Exchange rate provider returned ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()

    const rate =
      typeof data?.rate === 'number' && Number.isFinite(data.rate) && data.rate > 0
        ? data.rate
        : null

    if (!rate) {
      return NextResponse.json(
        { error: 'Invalid exchange rate response from provider.' },
        { status: 502 }
      )
    }

    // Frankfurter v2 reports a date per currency pair, and those dates are not
    // consistent: on 16 July 2026 PHP/MYR came back dated 17 July while PHP/USD
    // came back dated 16 July, and v1/latest reported the true ECB publish date
    // of 15 July. The page renders this as "Converted from PHP at the {date}
    // rate", so a future date tells a customer their price was converted at a
    // rate that does not exist yet.
    //
    // Clamp it. A date we cannot vouch for is dropped rather than shown, and the
    // page already handles a null date by omitting the line.
    const todayUtc = new Date().toISOString().slice(0, 10)
    const upstreamDate = typeof data?.date === 'string' ? data.date : null
    const rateDate = upstreamDate && upstreamDate <= todayUtc ? upstreamDate : null

    return NextResponse.json(
      {
        base,
        currency,
        rate,
        date: rateDate,
        source: 'frankfurter',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('Exchange rate route error:', error)
    return NextResponse.json({ error: 'Failed to fetch exchange rate.' }, { status: 500 })
  }
}
