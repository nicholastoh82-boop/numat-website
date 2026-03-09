import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://api.frankfurter.app/latest'

export async function GET(request: NextRequest) {
  try {
    const currency = request.nextUrl.searchParams.get('currency') || 'USD'

    if (currency === 'USD') {
      return NextResponse.json({
        base: 'USD',
        currency: 'USD',
        rate: 1,
      })
    }

    const res = await fetch(`${API_URL}?from=USD&to=${currency}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch exchange rate.' },
        { status: 500 }
      )
    }

    const data = await res.json()
    const rate = data?.rates?.[currency]

    if (typeof rate !== 'number') {
      return NextResponse.json(
        { error: 'Invalid exchange rate response.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      base: 'USD',
      currency,
      rate,
    })
  } catch (error) {
    console.error('Exchange rate route error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}