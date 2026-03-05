import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const supabase = await createClient()

  // 1. Admin Auth Check (Fixed for schema: id is the FK)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id) // FIXED
    .single()

  if (!adminProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Query Quotes
  let query = supabase
    .from('quotes')
    .select(`
      *,
      customers (*),
      quote_items (*)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: quotes, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(quotes)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // 1. Admin Auth Check
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id) // FIXED
    .single()

  if (!adminProfile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse Body
  const body = await request.json()
  // Front-end sends 'id' and 'status' (AdminQuotesPage.tsx line 38)
  // Or 'quoteId' if utilizing older logic. Let's handle both.
  const quoteId = body.id || body.quoteId
  const { status, notes } = body // 'admin_notes' does not exist in your schema, utilizing 'notes' if needed.

  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (status) {
    updateData.status = status
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', quoteId)
    .select(`
      *,
      customers (*),
      quote_items (*)
    `)
    .single()

  if (error) {
    console.error("Quote update error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(quote)
}