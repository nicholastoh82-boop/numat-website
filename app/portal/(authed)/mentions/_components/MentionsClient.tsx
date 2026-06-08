/*
  app/portal/(authed)/mentions/_components/MentionsClient.tsx
  Lists every time the current person was tagged in Team Chat, newest first.
  Opening this screen marks the tags as read, which clears the red dot.
*/

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type ChannelRef = { name: string } | { name: string }[] | null

type Row = {
  id: string
  channel_id: string
  author_name: string | null
  body_preview: string | null
  created_at: string
  read_at: string | null
  team_channels: ChannelRef
}

function channelName(ref: ChannelRef): string {
  if (!ref) return ''
  if (Array.isArray(ref)) return ref[0]?.name || ''
  return ref.name || ''
}

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function MentionsClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('team_mentions')
        .select('id, channel_id, author_name, body_preview, created_at, read_at, team_channels(name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (cancelled) return
      setRows((data || []) as Row[])
      setLoading(false)

      // Mark anything still unread as read so the red dot clears.
      await supabase
        .from('team_mentions')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null)
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">Mentions</h1>
      <p className="text-sm text-gray-600 mt-1">
        When someone types @ and your name in Team Chat, it shows up here.
      </p>

      {loading ? (
        <div className="text-sm text-gray-500 py-10">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-500 py-10">No mentions yet.</div>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 border border-gray-200 rounded">
          {rows.map((r) => {
            const room = channelName(r.team_channels)
            const wasUnread = !r.read_at
            return (
              <li key={r.id} className={wasUnread ? 'bg-amber-50' : 'bg-white'}>
                <Link href="/portal/chat" className="block px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-900">
                      {wasUnread && (
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 align-middle" aria-hidden />
                      )}
                      <span className="font-medium">{r.author_name || 'Someone'}</span> mentioned you
                      {room ? <span className="text-gray-500"> in {room}</span> : null}
                    </span>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{when(r.created_at)}</span>
                  </div>
                  {r.body_preview ? (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.body_preview}</p>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
