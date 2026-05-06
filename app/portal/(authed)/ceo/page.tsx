/* app/portal/(authed)/ceo/page.tsx
   Server component. Auth via Supabase + role check (admin or ceo only).
   Reads period from query params and forwards to the edge function. */

import { requireRole } from '@/lib/portal/roles'
import CeoDashboard from './_components/CeoDashboard'

export const metadata = {
  title: 'CEO Dashboard | NUMAT Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EDGE_URL =
  'https://peuwxnrojlfybdymkazj.supabase.co/functions/v1/ceo-dashboard'

type SearchParams = {
  period?: string
  from?: string
  to?: string
}

async function loadCeoData(params: SearchParams): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const secret = process.env.NUMAT_CEO_SECRET
  if (!secret) {
    return { ok: false, error: 'Server configuration missing: NUMAT_CEO_SECRET not set in environment.' }
  }
  const qs = new URLSearchParams()
  if (params.period) qs.set('period', params.period)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  const url = qs.toString() ? `${EDGE_URL}?${qs}` : EDGE_URL

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Edge function returned ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json()
    return { ok: true, data }
  } catch (e: any) {
    return { ok: false, error: `Failed to fetch dashboard data: ${e?.message || 'unknown error'}` }
  }
}

export default async function CeoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireRole(['admin', 'ceo'])
  const params = await searchParams
  const result = await loadCeoData(params)

  if (!result.ok) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900 mb-2">Could not load CEO dashboard</h1>
        <p className="text-sm text-red-800 whitespace-pre-wrap">{result.error}</p>
      </div>
    )
  }

  return <CeoDashboard data={result.data} />
}
