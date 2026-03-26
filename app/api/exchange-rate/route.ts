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

export async function GET(request: NextRequest) {
  const currency = request.nextUrl.searchParams.get('currency')?.toUpperCase().trim() || 'USD'

  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currency}` },
      { status: 400 }
    )
  }

  if (currency === 'USD') {
    return NextResponse.json(
      {
        base: 'USD',
        currency: 'USD',
        rate: 1,
        source: 'internal',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/USD/${encodeURIComponent(currency)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      }
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

    return NextResponse.json(
      {
        base: 'USD',
        currency,
        rate,
        date: data?.date ?? null,
        source: 'frankfurter',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('Exchange rate route error:', error)

    return NextResponse.json(
      { error: 'Failed to fetch exchange rate.' },
      { status: 500 }
    )
  }
}