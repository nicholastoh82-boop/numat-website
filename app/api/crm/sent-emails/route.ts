// app/api/crm/sent-emails/route.ts
//
// Lists the individual emails a rep sent on a given day, so a rep (for example
// Erica) can review what went out on a specific date. This is separate from the
// aggregate Email Counter: it returns the actual email rows, not counts.
//
// Access follows the portal model:
//   admin (Nick) and ceo (Mark): may see every rep, and may narrow to one rep
//     with the optional rep parameter.
//   anyone else with the productivity feature (for example Erica): scoped to
//     their own sent emails only.
// Rows come straight from crm_emails where direction is sent. The sequence
// based tracking is not involved.
//
// GET /api/crm/sent-emails?date=YYYY-MM-DD[&rep=someone@numat.ph]
//   date is read as a Malaysia time day (UTC+8), where the team works.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const adminClient = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// Owner email that always has full access, matching lib/portal/roles.
const ALWAYS_ADMIN = ['nick@numat.ph']
// Roles that may look across every rep. Everyone else sees only their own.
const SEE_ALL_ROLES = ['admin', 'ceo']
// Non admin, non ceo people who still see every rep's sends, for example the
// Head of Marketing who oversees the sales reps.
const SEE_ALL_EMAILS = ['erica@numat.ph']
// Feature that guards the productivity page and this view.
const REQUIRED_FEATURE = 'productivity'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isNumat(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith('@numat.ph')
}

async function authorize(): Promise<
  { email: string; roles: string[]; features: string[]; isAdmin: boolean } | null
> {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )
    const {
      data: { user },
    } = await authClient.auth.getUser()
    if (!user?.email) return null

    const [{ data: roleRows }, { data: featRows }] = await Promise.all([
      adminClient.from('user_roles').select('role').eq('user_id', user.id),
      adminClient.from('portal_access').select('feature').eq('user_id', user.id),
    ])
    const roles = ((roleRows ?? []) as Array<{ role: string }>).map((r) => r.role)
    const features = ((featRows ?? []) as Array<{ feature: string }>).map((f) => f.feature)
    const email = user.email.toLowerCase()
    const isAdmin = roles.includes('admin') || ALWAYS_ADMIN.includes(email)
    return { email, roles, features, isAdmin }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const user = await authorize()
  if (!user || !isNumat(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const allowed = user.isAdmin || user.features.includes(REQUIRED_FEATURE)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const seeAll =
    user.isAdmin || user.roles.some((r) => SEE_ALL_ROLES.includes(r)) || SEE_ALL_EMAILS.includes(user.email)

  // Detail branch: return the full content of one sent email by id. Non
  // elevated users can only open their own emails; elevated users can open any.
  const idParam = url.searchParams.get('id')
  if (idParam) {
    if (!UUID_RE.test(idParam)) {
      return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
    }
    let detailQuery = adminClient
      .from('crm_emails')
      .select(
        'id, rep_email, subject, from_email, to_email, cc, sent_at, has_attachments, attachment_meta, body_text, body_html, gmail_thread_id',
      )
      .eq('id', idParam)
      .eq('direction', 'sent')
      .limit(1)
    if (!seeAll) detailQuery = detailQuery.eq('rep_email', user.email)
    const { data: one, error: oneError } = await detailQuery.maybeSingle()
    if (oneError) {
      return NextResponse.json({ error: oneError.message }, { status: 500 })
    }
    if (!one) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }
    return NextResponse.json({ email: one })
  }

  const dateParam = url.searchParams.get('date') || ''
  if (!DATE_RE.test(dateParam)) {
    return NextResponse.json({ error: 'Invalid or missing date. Use YYYY-MM-DD.' }, { status: 400 })
  }

  // Read the date as a Malaysia time day and convert to a UTC range so the
  // timestamp filter lines up with how the team thinks about a day.
  const start = new Date(`${dateParam}T00:00:00+08:00`)
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  // Elevated users may narrow to one rep. Everyone else is pinned to their own
  // email regardless of any rep parameter.
  const repParam = (url.searchParams.get('rep') || '').toLowerCase()
  let repFilter: string | null = null
  if (seeAll) {
    if (repParam && isNumat(repParam)) repFilter = repParam
  } else {
    repFilter = user.email
  }

  let query = adminClient
    .from('crm_emails')
    .select('id, rep_email, subject, to_email, snippet, has_attachments, sent_at, lead_id')
    .eq('direction', 'sent')
    .gte('sent_at', start.toISOString())
    .lt('sent_at', end.toISOString())
    .order('sent_at', { ascending: false })
    .limit(1000)
  if (repFilter) query = query.eq('rep_email', repFilter)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    date: dateParam,
    scope: seeAll ? 'all' : 'self',
    rep: repFilter,
    count: data?.length ?? 0,
    emails: data ?? [],
  })
}
