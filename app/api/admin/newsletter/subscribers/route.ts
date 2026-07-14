import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listSubscribers, setSubscriberCategories, NEWSLETTER_CATEGORIES } from '@/lib/newsletter'

const ALLOWED = new Set(['admin', 'marketing'])

async function role(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('admin_profiles').select('role').eq('id', user.id).maybeSingle()
  return data?.role ?? null
}

export async function GET() {
  const supabase = await createClient()
  const r = await role(supabase)
  if (!r || !ALLOWED.has(r)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subs = await listSubscribers()
  const active = subs.filter((s) => s.status === 'subscribed')
  const counts: Record<string, number> = {}
  for (const c of NEWSLETTER_CATEGORIES) counts[c] = 0
  for (const s of active) for (const c of s.categories || []) counts[c] = (counts[c] || 0) + 1

  return NextResponse.json({
    categories: NEWSLETTER_CATEGORIES,
    total: active.length,
    unsubscribed: subs.length - active.length,
    counts,
    subscribers: subs,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const r = await role(supabase)
  if (!r || !ALLOWED.has(r)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const email = String(body.email || '').trim().toLowerCase()
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c: any) => NEWSLETTER_CATEGORIES.includes(c))
    : []
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  try {
    await setSubscriberCategories(email, categories.length ? categories : ['General'])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update' }, { status: 500 })
  }
}
