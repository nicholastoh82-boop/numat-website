/*
  app/api/integrations/readai/route.ts

  Receives Read.ai meeting webhooks. When a meeting ends, Read posts the
  summary, action items, participants and transcript here. We attribute each
  action item to a participant using the transcript, match that participant to
  their numat.ph account by email, and store the tasks in the General chat so
  only the right person can tick each one.

  Security: Read signs each request with X-Read-Signature, an HMAC SHA256 of
  the raw body using a signing key. We keep the signing key in app_config and
  verify every request once the key is set.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import crypto from 'crypto'
import { callAnthropicMessages } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-haiku-4-5-20251001'
const GENERAL_CHANNEL_ID = '9aa95a76-d125-479a-af67-f887b9da137e'

function admin() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

type Participant = { name?: string; email?: string | null }
type ActionItem = { text?: string }
type SpeakerBlock = { speaker?: { name?: string }; words?: string }

export async function GET() {
  return NextResponse.json({ ok: true, service: 'readai webhook' })
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const db = admin()

    // 1. Verify the signature when a signing key is stored.
    let secret: string | null = null
    try {
      const { data } = await db
        .from('app_config')
        .select('value')
        .eq('key', 'readai_webhook_secret')
        .maybeSingle()
      secret = data?.value || null
    } catch {
      secret = null
    }
    if (secret) {
      const sig = (req.headers.get('x-read-signature') || '').toLowerCase()
      const keyBytes = Buffer.from(secret, 'base64')
      const digest = crypto.createHmac('sha256', keyBytes).update(raw, 'utf8').digest('hex')
      const ok =
        sig.length === digest.length &&
        crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig))
      if (!ok) {
        return NextResponse.json({ error: 'bad signature' }, { status: 401 })
      }
    }

    // 2. Parse the body.
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'bad json' }, { status: 400 })
    }

    const requestId = String(
      (payload.request_id as string) || (payload.session_id as string) || crypto.randomUUID(),
    )

    // 3. Skip if we already handled this delivery.
    const { data: seen } = await db
      .from('readai_events')
      .select('request_id')
      .eq('request_id', requestId)
      .maybeSingle()
    if (seen) {
      return NextResponse.json({ ok: true, note: 'already processed' })
    }

    const actionItems: ActionItem[] = Array.isArray(payload.action_items)
      ? (payload.action_items as ActionItem[])
      : []
    const participants: Participant[] = Array.isArray(payload.participants)
      ? (payload.participants as Participant[])
      : []
    const owner: Participant = (payload.owner as Participant) || {}
    const title = String((payload.title as string) || 'Meeting')

    // Only act when a numat.ph person was in the meeting.
    const numatInvolved =
      (owner.email || '').toLowerCase().endsWith('@numat.ph') ||
      participants.some((p) => (p.email || '').toLowerCase().endsWith('@numat.ph'))
    if (!numatInvolved) {
      await db.from('readai_events').insert({ request_id: requestId, session_id: String(payload.session_id || '') || null })
      return NextResponse.json({ ok: true, note: 'no numat participant, skipped' })
    }

    if (actionItems.length === 0) {
      await db.from('readai_events').insert({ request_id: requestId, session_id: String(payload.session_id || '') || null })
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    // 4. Build a trimmed transcript for context.
    const transcriptObj = payload.transcript as { speaker_blocks?: SpeakerBlock[] } | undefined
    const blocks: SpeakerBlock[] = Array.isArray(transcriptObj?.speaker_blocks)
      ? (transcriptObj!.speaker_blocks as SpeakerBlock[])
      : []
    let transcript = blocks
      .map((b) => `${b.speaker?.name || 'Speaker'}: ${b.words || ''}`)
      .join('\n')
    if (transcript.length > 12000) transcript = transcript.slice(-12000)

    const participantNames = participants.map((p) => p.name || '').filter(Boolean)
    const itemsText = actionItems.map((a, i) => `${i + 1}. ${a.text || ''}`).join('\n')

    // 5. Ask the model who owns each action item.
    const prompt = [
      'You are processing the notes from a NUMAT team meeting.',
      'Reply ONLY as JSON. No markdown, no backticks, no extra words.',
      'Never use hyphens or dashes in your text. Use commas, full stops, or new sentences instead.',
      '',
      'For each action item below, decide who owns it based on the transcript.',
      '"owner" must be EXACTLY one of these participant names copied verbatim, or an empty string if you cannot tell:',
      '  ' + (participantNames.length ? participantNames.join(', ') : '(none)'),
      '"dueHint" is any timing mentioned such as Friday, or an empty string.',
      'Keep the task wording clear and short in "title".',
      '',
      'Reply exactly in this shape:',
      '{"tasks":[{"title":"...","owner":"...","dueHint":"..."}]}',
      '',
      'Action items:',
      itemsText,
      '',
      'Transcript:',
      transcript || '(no transcript provided)',
    ].join('\n')

    let tasks: { title?: string; owner?: string; dueHint?: string }[] = []
    try {
      const res = await callAnthropicMessages({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      })
      if (res.ok) {
        const data = await res.json()
        const text: string = (data?.content?.[0]?.text || '').trim()
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (Array.isArray(parsed.tasks)) tasks = parsed.tasks
      }
    } catch {
      tasks = []
    }
    if (tasks.length === 0) {
      tasks = actionItems.map((a) => ({ title: a.text || '', owner: '', dueHint: '' }))
    }

    // 6. Map participants to numat.ph accounts by email.
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const dir = new Map<string, { id: string; name: string }>()
    for (const u of list?.users || []) {
      const email = (u.email || '').toLowerCase()
      if (!email.endsWith('@numat.ph')) continue
      const meta = (u.user_metadata || {}) as Record<string, unknown>
      const name = (meta.full_name as string) || (meta.name as string) || u.email || 'Member'
      dir.set(email, { id: u.id, name })
    }
    const nameToEmail = new Map<string, string>()
    for (const p of participants) {
      if (p.name && p.email) nameToEmail.set(p.name.trim().toLowerCase(), p.email.toLowerCase())
    }

    function resolveAssignee(ownerName?: string): { id: string | null; name: string | null } {
      if (!ownerName) return { id: null, name: null }
      const key = ownerName.trim().toLowerCase()
      const email = nameToEmail.get(key)
      if (email && dir.has(email)) {
        const d = dir.get(email)!
        return { id: d.id, name: d.name }
      }
      if (dir.has(key)) {
        const d = dir.get(key)!
        return { id: d.id, name: d.name }
      }
      return { id: null, name: ownerName }
    }

    const ownerEmail = (owner.email || '').toLowerCase()
    const createdBy = ownerEmail && dir.has(ownerEmail) ? dir.get(ownerEmail)!.id : null

    const rows = tasks
      .filter((t) => t.title && String(t.title).trim())
      .map((t) => {
        const a = resolveAssignee(t.owner)
        return {
          channel_id: GENERAL_CHANNEL_ID,
          title: `${String(t.title).slice(0, 460)} (from ${title.slice(0, 30)})`.slice(0, 500),
          owner: a.name ? String(a.name).slice(0, 120) : null,
          assignee_id: a.id,
          due_hint: t.dueHint ? String(t.dueHint).slice(0, 120) : null,
          source: 'readai',
          created_by: createdBy,
        }
      })

    let inserted = 0
    if (rows.length) {
      const { data: ins, error: insErr } = await db
        .from('team_action_items')
        .insert(rows)
        .select('id')
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
      inserted = ins?.length || 0
    }

    // Record the delivery so it is not processed again.
    await db.from('readai_events').insert({
      request_id: requestId,
      session_id: String(payload.session_id || '') || null,
      inserted_count: inserted,
    })

    return NextResponse.json({ ok: true, inserted })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
