/*
  app/api/portal/documents/open/route.ts
  Returns a short lived signed URL for a document. Any signed in staff member
  can open it, since this is a shared library.
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
  const { data: row } = await a.from('documents').select('file_path').eq('id', id).maybeSingle()
  if (!row?.file_path) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const signed = await a.storage.from('documents').createSignedUrl(row.file_path, 120)
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ error: 'Could not open' }, { status: 500 })
  }
  return NextResponse.json({ url: signed.data.signedUrl })
}
