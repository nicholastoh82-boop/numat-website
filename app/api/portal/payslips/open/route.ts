/*
  app/api/portal/payslips/open/route.ts
  Returns a short lived signed URL for one payslip, but only if it belongs to
  the signed in person or they are an admin.
*/

import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/roles'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function adminClient() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const me = await getPortalUser()
  if (!me) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const a = adminClient()
  const { data: row } = await a
    .from('payslips')
    .select('user_id, file_path')
    .eq('id', id)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.user_id !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const signed = await a.storage.from('payslips').createSignedUrl(row.file_path, 120)
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: 'Could not open' }, { status: 500 })
  }
  return NextResponse.json({ url: signed.data.signedUrl })
}
