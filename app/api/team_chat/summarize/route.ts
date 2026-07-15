/*
  app/api/team_chat/summarize/route.ts

  Reads recent messages in a team chat channel, asks Claude for a plain
  summary plus any commitments people made, and stores those commitments
  in team_action_items. Uses the cookie based server client so row level
  security applies: only a member of the channel can summarise it.
*/

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAnthropicMessages } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-haiku-4-5-20251001'

type RawItem = { title?: string; owner?: string; dueHint?: string }

export async function POST(req: NextRequest) {
  try {
    const { channelId } = await req.json()
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { data: messages, error: mErr } = await supabase
      .from('team_messages')
      .select('sender_id, sender_name, sender_email, body, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(300)

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 403 })
    }
    if (!messages || messages.length === 0) {
      return NextResponse.json({ summary: 'No messages yet in this channel.', actionItems: [] })
    }

    const transcript = messages
      .map((m: { sender_name?: string; sender_email?: string; body?: string }) => {
        const who = m.sender_name || m.sender_email || 'Someone'
        return `${who}: ${m.body || '(shared a file)'}`
      })
      .join('\n')

    type Person = { id: string; name: string; email: string }
    const people: Person[] = Array.from(
      new Map(
        (messages as { sender_id?: string; sender_name?: string; sender_email?: string }[])
          .filter((m) => m.sender_id)
          .map((m) => [
            m.sender_id as string,
            { id: m.sender_id as string, name: m.sender_name || '', email: m.sender_email || '' },
          ]),
      ).values(),
    )
    const peopleNames = people.map((p) => p.name).filter(Boolean)

    function findAssignee(owner?: string): { id: string | null; name: string | null } {
      if (!owner) return { id: null, name: null }
      const o = owner.trim().toLowerCase()
      if (!o) return { id: null, name: null }
      let hit = people.find((p) => p.name.trim().toLowerCase() === o)
      if (!hit) hit = people.find((p) => p.email.trim().toLowerCase() === o)
      if (!hit) {
        const cands = people.filter((p) => {
          const n = p.name.trim().toLowerCase()
          if (!n) return false
          const first = n.split(/\s+/)[0]
          return n.startsWith(o) || o.startsWith(first) || n.includes(o)
        })
        if (cands.length === 1) hit = cands[0]
      }
      return hit ? { id: hit.id, name: hit.name } : { id: null, name: owner }
    }

    const prompt = [
      'You are reading a work chat for the NUMAT team.',
      'Do two things and reply ONLY as JSON. No markdown, no backticks, no extra words.',
      'Never use hyphens or dashes in your text. Use commas, full stops, or new sentences instead.',
      '',
      '1. "summary": a short plain summary of what was discussed and decided.',
      '2. "actionItems": an array of things people said they would do.',
      '   Each item is an object with keys "title", "owner", "dueHint".',
      '   "title" is the task in plain words.',
      '   "owner" must be EXACTLY one of these names copied verbatim, or an empty string if you are not sure who owns it:',
      '   ' + (peopleNames.length ? peopleNames.join(', ') : '(no names available)'),
      '   "dueHint" is any timing mentioned such as Friday, or an empty string.',
      '   Only include real commitments, not chit chat. If there are none, return an empty array.',
      '',
      'Reply exactly in this shape:',
      '{"summary":"...","actionItems":[{"title":"...","owner":"...","dueHint":"..."}]}',
      '',
      'Chat:',
      transcript,
    ].join('\n')

    const res = await callAnthropicMessages({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `AI call failed: ${res.status} ${t.slice(0, 200)}` },
        { status: 502 },
      )
    }

    const data = await res.json()
    const text: string = (data?.content?.[0]?.text || '').trim()

    let parsed: { summary?: string; actionItems?: RawItem[] } = {}
    try {
      const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { summary: text || 'Could not read a summary back.', actionItems: [] }
    }

    const items: RawItem[] = Array.isArray(parsed.actionItems)
      ? parsed.actionItems.filter((i) => i && i.title)
      : []

    let inserted: unknown[] = []
    if (items.length > 0) {
      const rows = items.map((i) => {
        const a = findAssignee(i.owner)
        return {
          channel_id: channelId,
          title: String(i.title).slice(0, 500),
          owner: a.name ? String(a.name).slice(0, 120) : null,
          assignee_id: a.id,
          due_hint: i.dueHint ? String(i.dueHint).slice(0, 120) : null,
          created_by: user.id,
          source: 'ai',
        }
      })
      const { data: ins } = await supabase.from('team_action_items').insert(rows).select()
      inserted = ins || []
    }

    return NextResponse.json({
      summary: parsed.summary || 'No summary produced.',
      actionItems: inserted,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
