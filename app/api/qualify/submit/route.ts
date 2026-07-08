import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!

const NUMAT_CLIENT_ID = '33a5efd3-37c1-4c03-b403-dba953b3e4bc'
const FORM_VERSION = 'sead_qualification_v1'

interface Payload {
  full_name?: string
  company?: string
  title?: string
  email?: string
  phone?: string
  preferred_contact?: string
  project_name?: string
  project_types?: string[]
  project_stages?: string[]
  support_types?: string[]
  project_description?: string
  timeline?: string
  budget?: string
  site_constraints?: string
  sustainability?: string
  decision_makers?: string
  follow_up?: string
  honeypot?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload

    // Bot trap
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Required validation (server side mirror of client)
    const required: Array<[string, any]> = [
      ['full_name', body.full_name?.trim()],
      ['company', body.company?.trim()],
      ['title', body.title?.trim()],
      ['email', body.email?.trim()],
      ['phone', body.phone?.trim()],
      ['preferred_contact', body.preferred_contact],
      ['project_description', body.project_description?.trim()],
      ['timeline', body.timeline],
      ['budget', body.budget],
      ['sustainability', body.sustainability],
      ['follow_up', body.follow_up],
    ]
    for (const [k, v] of required) {
      if (!v) return NextResponse.json({ error: `Missing required field: ${k}` }, { status: 400 })
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (!body.project_types || body.project_types.length === 0) return NextResponse.json({ error: 'Project type required' }, { status: 400 })
    if (!body.project_stages || body.project_stages.length === 0) return NextResponse.json({ error: 'Project stage required' }, { status: 400 })
    if (!body.support_types || body.support_types.length === 0) return NextResponse.json({ error: 'Support type required' }, { status: 400 })

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Build source_payload with all qualification answers
    const sourcePayload = {
      form_version: FORM_VERSION,
      submitted_at: new Date().toISOString(),
      preferred_contact_method: body.preferred_contact,
      project_name: body.project_name || null,
      project_types: body.project_types,
      project_stages: body.project_stages,
      support_types: body.support_types,
      project_description: body.project_description,
      timeline: body.timeline,
      budget_range: body.budget,
      site_constraints: body.site_constraints || null,
      sustainability_importance: body.sustainability,
      decision_makers: body.decision_makers || null,
      follow_up_consultation: body.follow_up,
    }

    // Derive segment from primary project type
    const primarySegment = (body.project_types || [])[0]?.toLowerCase().includes('hotel')
      ? 'hospitality'
      : (body.project_types || [])[0]?.toLowerCase().includes('resort')
      ? 'hospitality'
      : (body.project_types || [])[0]?.toLowerCase().includes('residential')
      ? 'residential'
      : 'commercial'

    // Insert into master_leads
    const { data: lead, error: leadErr } = await sb
      .from('master_leads')
      .insert({
        client_id: NUMAT_CLIENT_ID,
        full_name: body.full_name!.trim(),
        email: body.email!.trim().toLowerCase(),
        title: body.title!.trim(),
        company: body.company!.trim(),
        phone: body.phone!.trim(),
        country: 'Malaysia',
        segment: primarySegment,
        sub_segment: (body.project_types || []).join(', '),
        source: FORM_VERSION,
        source_type: 'inbound_form',
        lead_source: 'sead_collaboration',
        rep_assigned: 'Erica',
        rep_email: 'erica@numat.ph',
        status: 'new',
        pipeline_stage: 'inquiry',
        source_payload: sourcePayload,
        notes: body.project_description!.trim(),
      })
      .select('id')
      .single()

    if (leadErr) {
      console.error('master_leads insert failed:', leadErr)
      return NextResponse.json({ error: `Save failed: ${leadErr.message}` }, { status: 500 })
    }

    // Create a personal_task so it shows in Nick's /list
    const taskText =
      `New SEAD form submission: ${body.full_name} from ${body.company} (${body.timeline}, ${body.budget})\n` +
      `[lead:${lead.id}]`
    await sb.from('personal_tasks').insert({
      task_text: taskText,
      status: 'pending',
      source: 'qualification_form',
    })

    // Telegram alert
    const wantsConsult = body.follow_up === 'Yes' ? '🟢 Yes' : body.follow_up
    const tgText =
      `*New SEAD Qualification Form*\n\n` +
      `*${body.full_name}* — ${body.title}\n` +
      `${body.company}\n\n` +
      `*Project*: ${body.project_name || '(unnamed)'}\n` +
      `Type: ${(body.project_types || []).join(', ')}\n` +
      `Stage: ${(body.project_stages || []).join(', ')}\n` +
      `Support: ${(body.support_types || []).join(', ')}\n` +
      `Timeline: ${body.timeline}\n` +
      `Budget: ${body.budget}\n` +
      `Sustainability: ${body.sustainability}\n` +
      `Wants consultation: ${wantsConsult}\n\n` +
      `*Contact*\n` +
      `Email: ${body.email}\n` +
      `Phone: ${body.phone}\n` +
      `Preferred: ${body.preferred_contact}\n\n` +
      `Assigned: Mohan\nLead ID: ${lead.id}`

    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: tgText, parse_mode: 'Markdown' }),
      })
    } catch (e) {
      console.error('Telegram alert failed:', e)
    }

    return NextResponse.json({ ok: true, lead_id: lead.id })
  } catch (err: any) {
    console.error('qualify submit failed:', err)
    return NextResponse.json({ error: err?.message ?? 'Submission failed' }, { status: 500 })
  }
}
