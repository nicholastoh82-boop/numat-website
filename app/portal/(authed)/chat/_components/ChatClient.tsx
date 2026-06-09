/*
  app/portal/(authed)/chat/_components/ChatClient.tsx

  Team chat for the NUMAT portal. Channels work like WhatsApp groups.
  Messages update live through Supabase realtime. Files attach to a message
  and live in the private team_files bucket. A Summarise button asks Claude
  to recap the channel and pull out what people said they would do.

  Private chats: pick one teammate for a direct message, or several for a
  private group. A private channel is visible only to its members.

  Tables used: team_channels, team_channel_members, team_messages,
  team_message_files, team_action_items. All carry a team_ prefix so they
  never collide with the AI sales chat tables.
*/

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Channel = {
  id: string
  name: string
  description: string | null
  is_private: boolean
  created_at: string
  created_by: string | null
}

type Attachment = {
  id: string
  file_path: string
  file_name: string
  file_type: string | null
  file_size: number | null
}

type Message = {
  id: string
  channel_id: string
  sender_id: string | null
  sender_name: string | null
  sender_email: string | null
  body: string | null
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  reply_to: string | null
  forwarded: boolean
  team_message_files?: Attachment[]
}

type ActionItem = {
  id: string
  title: string
  owner: string | null
  due_hint: string | null
  status: string
  created_at: string
  due_at: string | null
  reminded_at: string | null
  assignee_id: string | null
}

type Member = { id: string; name: string; email: string }

const BUCKET = 'team_files'
const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '👀']

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Turns chat text into safe formatted HTML. Everything is escaped first, so the
// only tags in the output are the ones added here. Code and links are pulled out
// before styling so their contents are never treated as formatting.
function formatMessage(raw: string, mine: boolean): string {
  const codeClass = mine
    ? 'rounded px-1 py-0.5 text-[0.85em] font-mono bg-white/20'
    : 'rounded px-1 py-0.5 text-[0.85em] font-mono bg-black/10'
  const blockClass = mine
    ? 'block rounded p-2 my-1 text-[0.85em] font-mono whitespace-pre-wrap overflow-x-auto bg-white/15'
    : 'block rounded p-2 my-1 text-[0.85em] font-mono whitespace-pre-wrap overflow-x-auto bg-black/5'

  let s = escapeHtml(raw)

  const blocks: string[] = []
  s = s.replace(/```([\s\S]*?)```/g, (_m, code: string) => {
    blocks.push(code.replace(/^\n/, '').replace(/\n$/, ''))
    return `\u0000CB${blocks.length - 1}\u0000`
  })

  const inlines: string[] = []
  s = s.replace(/`([^`\n]+?)`/g, (_m, code: string) => {
    inlines.push(code)
    return `\u0000IC${inlines.length - 1}\u0000`
  })

  const links: string[] = []
  s = s.replace(/(https?:\/\/[^\s<]+)/g, (url: string) => {
    links.push(
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline">${url}</a>`,
    )
    return `\u0000LK${links.length - 1}\u0000`
  })

  s = s.replace(/(^|[\s(])\*(\S(?:.*?\S)?)\*(?=[\s).,!?:;]|$)/g, '$1<strong>$2</strong>')
  s = s.replace(/(^|[\s(])_(\S(?:.*?\S)?)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
  s = s.replace(/(^|[\s(])~(\S(?:.*?\S)?)~(?=[\s).,!?:;]|$)/g, '$1<del>$2</del>')

  // Group lines into bullet and numbered lists; join the rest with line breaks.
  const lines = s.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    if (/^\s*[-*]\s+/.test(lines[i])) {
      const items: string[] = []
      while (i < lines.length) {
        const m2 = lines[i].match(/^\s*[-*]\s+(.*)$/)
        if (!m2) break
        items.push(`<li>${m2[1]}</li>`)
        i++
      }
      out.push(`<ul class="list-disc pl-5 my-1">${items.join('')}</ul>`)
    } else if (/^\s*\d+\.\s+/.test(lines[i])) {
      const items: string[] = []
      while (i < lines.length) {
        const m2 = lines[i].match(/^\s*\d+\.\s+(.*)$/)
        if (!m2) break
        items.push(`<li>${m2[1]}</li>`)
        i++
      }
      out.push(`<ol class="list-decimal pl-5 my-1">${items.join('')}</ol>`)
    } else {
      const para: string[] = []
      while (
        i < lines.length &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        para.push(lines[i])
        i++
      }
      out.push(para.join('<br>'))
    }
  }
  s = out.join('')

  s = s.replace(
    /\u0000IC(\d+)\u0000/g,
    (_m, i2: string) => `<code class="${codeClass}">${inlines[Number(i2)]}</code>`,
  )
  s = s.replace(
    /\u0000CB(\d+)\u0000/g,
    (_m, i2: string) => `<code class="${blockClass}">${blocks[Number(i2)]}</code>`,
  )
  s = s.replace(/\u0000LK(\d+)\u0000/g, (_m, i2: string) => links[Number(i2)])

  return s
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ChatClient() {
  const [supabase] = useState(() => createClient())

  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')

  const [channels, setChannels] = useState<Channel[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])

  const [text, setText] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)

  const [summary, setSummary] = useState<string>('')
  const [summarising, setSummarising] = useState(false)
  const [notice, setNotice] = useState<string>('')

  const [tasksOpen, setTasksOpen] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')

  const [showPrivate, setShowPrivate] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [creatingPrivate, setCreatingPrivate] = useState(false)

  const [showAddPeople, setShowAddPeople] = useState(false)
  const [addSelectedIds, setAddSelectedIds] = useState<string[]>([])
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([])
  const [addingPeople, setAddingPeople] = useState(false)

  const [menuMsg, setMenuMsg] = useState<Message | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  const [reactions, setReactions] = useState<
    { message_id: string; user_id: string; emoji: string }[]
  >([])
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [forwardTargets, setForwardTargets] = useState<string[]>([])
  const [forwarding, setForwarding] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [savingRename, setSavingRename] = useState(false)
  const [reads, setReads] = useState<{ user_id: string; last_read_at: string }[]>([])
  const [memberCount, setMemberCount] = useState(0)

  const [loading, setLoading] = useState(true)

  const endRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const loadChannels = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from('team_channel_members')
        .select('team_channels(id, name, description, is_private, created_at, created_by)')
        .eq('user_id', uid)
      const rows = (data || []) as Array<{ team_channels: Channel | null }>
      const list = rows
        .map((r) => r.team_channels)
        .filter((c): c is Channel => !!c)
        .sort((a, b) => {
          if (a.name === 'General') return -1
          if (b.name === 'General') return 1
          return a.created_at.localeCompare(b.created_at)
        })
      setChannels(list)
      setActiveId((prev) => prev || (list[0] ? list[0].id : ''))
    },
    [supabase],
  )

  const loadMessages = useCallback(
    async (channelId: string) => {
      const { data } = await supabase
        .from('team_messages')
        .select(
          'id, channel_id, sender_id, sender_name, sender_email, body, created_at, edited_at, deleted_at, reply_to, forwarded, team_message_files(id, file_path, file_name, file_type, file_size)',
        )
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(300)
      setMessages((data || []) as Message[])
    },
    [supabase],
  )

  const loadActionItems = useCallback(
    async (channelId: string) => {
      const { data } = await supabase
        .from('team_action_items')
        .select('id, title, owner, due_hint, status, created_at, due_at, reminded_at, assignee_id')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
      setActionItems((data || []) as ActionItem[])
    },
    [supabase],
  )

  const loadReactions = useCallback(
    async (channelId: string) => {
      const { data } = await supabase
        .from('team_message_reactions')
        .select('message_id, user_id, emoji')
        .eq('channel_id', channelId)
      setReactions(
        (data || []) as { message_id: string; user_id: string; emoji: string }[],
      )
    },
    [supabase],
  )

  const loadReads = useCallback(
    async (channelId: string) => {
      const [{ data: r }, { count }] = await Promise.all([
        supabase
          .from('team_channel_reads')
          .select('user_id, last_read_at')
          .eq('channel_id', channelId),
        supabase
          .from('team_channel_members')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channelId),
      ])
      setReads((r || []) as { user_id: string; last_read_at: string }[])
      setMemberCount(count || 0)
    },
    [supabase],
  )

  const markRead = useCallback(
    async (channelId: string) => {
      if (!channelId || !userId) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      await supabase.from('team_channel_reads').upsert(
        { channel_id: channelId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: 'channel_id,user_id' },
      )
    },
    [supabase, userId],
  )

  // Load the signed in user, auto join the public channels, then list channels.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) {
        setLoading(false)
        return
      }
      const meta = (user.user_metadata || {}) as Record<string, unknown>
      const name =
        (meta.full_name as string) || (meta.name as string) || user.email || 'Me'
      setUserId(user.id)
      setUserName(name)
      setUserEmail(user.email || '')

      const { data: pub } = await supabase
        .from('team_channels')
        .select('id')
        .eq('is_private', false)
      const ids = ((pub || []) as { id: string }[]).map((c) => c.id)
      if (ids.length > 0) {
        await supabase
          .from('team_channel_members')
          .upsert(
            ids.map((channel_id) => ({ channel_id, user_id: user.id })),
            { onConflict: 'channel_id,user_id', ignoreDuplicates: true },
          )
      }

      await loadChannels(user.id)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, loadChannels])

  // Refresh the channel list live when someone adds me to a new room.
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`team_member_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_channel_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadChannels(userId)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [userId, supabase, loadChannels])

  // When the active channel changes, load its data and subscribe to updates.
  useEffect(() => {
    if (!activeId) return
    setSummary('')
    setNotice('')
    loadMessages(activeId)
    loadActionItems(activeId)
    loadReactions(activeId)
    loadReads(activeId)
    markRead(activeId)

    const ch = supabase
      .channel(`team_chat_${activeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_messages',
          filter: `channel_id=eq.${activeId}`,
        },
        () => {
          loadMessages(activeId)
          markRead(activeId)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_channel_reads',
          filter: `channel_id=eq.${activeId}`,
        },
        () => {
          loadReads(activeId)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_message_reactions',
          filter: `channel_id=eq.${activeId}`,
        },
        () => {
          loadReactions(activeId)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_action_items',
          filter: `channel_id=eq.${activeId}`,
        },
        () => {
          loadActionItems(activeId)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [activeId, supabase, loadMessages, loadActionItems, loadReactions, loadReads, markRead])

  // Mark the open channel as read when the tab regains focus.
  useEffect(() => {
    function onVisible() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && activeId) {
        markRead(activeId)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [activeId, markRead])

  // Keep the view pinned to the newest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Grow the message box with its content, up to a limit.
  useEffect(() => {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }, [text])

  // Load teammates once so the task assignee picker is populated.
  useEffect(() => {
    ensureMembersLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSend() {
    const body = text.trim()
    if (!body && !file) return
    if (!activeId || !userId) return
    setSending(true)
    setNotice('')
    try {
      let attachment: { path: string; name: string; type: string; size: number } | null = null
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._]/g, '_')
        const path = `${activeId}/${Date.now()}_${safe}`
        const up = await supabase.storage.from(BUCKET).upload(path, file)
        if (up.error) {
          setNotice('File upload failed. Please try again.')
          setSending(false)
          return
        }
        attachment = { path, name: file.name, type: file.type, size: file.size }
      }

      const ins = await supabase
        .from('team_messages')
        .insert({
          channel_id: activeId,
          sender_id: userId,
          sender_name: userName,
          sender_email: userEmail,
          body: body || null,
          reply_to: replyTo?.id ?? null,
        })
        .select('id')
        .single()

      if (ins.error || !ins.data) {
        setNotice('Could not send the message.')
        setSending(false)
        return
      }

      if (attachment) {
        await supabase.from('team_message_files').insert({
          message_id: (ins.data as { id: string }).id,
          file_path: attachment.path,
          file_name: attachment.name,
          file_type: attachment.type,
          file_size: attachment.size,
        })
      }

      setText('')
      setReplyTo(null)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadMessages(activeId)
    } finally {
      setSending(false)
    }
  }

  function applyWrap(before: string, after: string) {
    const el = composerRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = text
    const selected = val.slice(start, end)
    const next = val.slice(0, start) + before + selected + after + val.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      const a = start + before.length
      el.setSelectionRange(a, a + selected.length)
    })
  }

  function applyListPrefix(kind: 'bullet' | 'number') {
    const el = composerRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = text
    const from = val.lastIndexOf('\n', start - 1) + 1
    let to = val.indexOf('\n', end)
    if (to === -1) to = val.length
    const block = val.slice(from, to)
    const replaced = block
      .split('\n')
      .map((ln, idx) => {
        const content = ln.replace(/^\s*([-*]|\d+\.)\s+/, '')
        return kind === 'bullet' ? `- ${content}` : `${idx + 1}. ${content}`
      })
      .join('\n')
    const next = val.slice(0, from) + replaced + val.slice(to)
    const added = next.length - val.length
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(from, to + added)
    })
  }

  async function openFile(att: Attachment) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(att.file_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleSummarise() {
    if (!activeId) return
    setSummarising(true)
    setNotice('')
    setSummary('')
    try {
      const res = await fetch('/api/team_chat/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: activeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNotice(data.error || 'Summary failed.')
      } else {
        setSummary(data.summary || '')
        setTasksOpen(true)
        loadActionItems(activeId)
      }
    } catch {
      setNotice('Summary failed. Please try again.')
    } finally {
      setSummarising(false)
    }
  }

  async function toggleDone(item: ActionItem) {
    const next = item.status === 'done' ? 'open' : 'done'
    setActionItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, status: next } : a)),
    )
    const { error } = await supabase.rpc('tc_set_task_status', {
      p_task_id: item.id,
      p_done: next === 'done',
    })
    if (error) {
      setActionItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: item.status } : a)),
      )
      setNotice('Only the assigned person can change this task.')
      return
    }
    if (next === 'done' && activeId && userId) {
      await supabase.from('team_messages').insert({
        channel_id: activeId,
        sender_id: userId,
        sender_name: userName,
        sender_email: userEmail,
        body: `✓ Task completed: ${item.title}`,
      })
      loadMessages(activeId)
    }
  }

  async function addTask(title: string, assigneeId: string, dueValue: string) {
    const t = title.trim()
    if (!t || !activeId || !userId) return
    const assignee = members.find((m) => m.id === assigneeId) || null
    const due = dueValue ? new Date(dueValue).toISOString() : null
    const { error } = await supabase.from('team_action_items').insert({
      channel_id: activeId,
      title: t.slice(0, 500),
      owner: assignee ? assignee.name : null,
      assignee_id: assignee ? assignee.id : null,
      due_at: due,
      status: 'open',
      source: 'manual',
      created_by: userId,
    })
    if (error) {
      setNotice('Could not add the task.')
    } else {
      await loadActionItems(activeId)
    }
  }

  async function setTaskDue(item: ActionItem, value: string) {
    const due = value ? new Date(value).toISOString() : null
    setActionItems((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, due_at: due, reminded_at: null } : a)),
    )
    await supabase
      .from('team_action_items')
      .update({ due_at: due, reminded_at: null })
      .eq('id', item.id)
  }

  async function createChannel() {
    const name = newChannelName.trim()
    if (!name || !userId) return
    const ins = await supabase
      .from('team_channels')
      .insert({ name, is_private: false, created_by: userId })
      .select('id')
      .single()
    if (ins.error || !ins.data) {
      setNotice('Could not create the channel.')
      return
    }
    const id = (ins.data as { id: string }).id
    await supabase.from('team_channel_members').insert({ channel_id: id, user_id: userId })
    setNewChannelName('')
    setShowNewChannel(false)
    await loadChannels(userId)
    setActiveId(id)
  }

  async function openPrivatePicker() {
    setShowPrivate(true)
    setSelectedIds([])
    if (members.length === 0) {
      setLoadingMembers(true)
      try {
        const res = await fetch('/api/team_chat/members')
        const data = await res.json()
        if (res.ok) setMembers((data.members || []) as Member[])
        else setNotice(data.error || 'Could not load teammates.')
      } catch {
        setNotice('Could not load teammates.')
      } finally {
        setLoadingMembers(false)
      }
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function ensureMembersLoaded() {
    if (members.length > 0) return
    setLoadingMembers(true)
    try {
      const res = await fetch('/api/team_chat/members')
      const data = await res.json()
      if (res.ok) setMembers((data.members || []) as Member[])
      else setNotice(data.error || 'Could not load teammates.')
    } catch {
      setNotice('Could not load teammates.')
    } finally {
      setLoadingMembers(false)
    }
  }

  async function openAddPeople() {
    if (!activeId) return
    setShowAddPeople(true)
    setAddSelectedIds([])
    await ensureMembersLoaded()
    const { data } = await supabase
      .from('team_channel_members')
      .select('user_id')
      .eq('channel_id', activeId)
    setExistingMemberIds(((data || []) as { user_id: string }[]).map((r) => r.user_id))
  }

  function toggleAddSelect(id: string) {
    setAddSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function addPeople() {
    if (!activeId || addSelectedIds.length === 0) return
    setAddingPeople(true)
    try {
      const rows = addSelectedIds.map((uid) => ({ channel_id: activeId, user_id: uid }))
      await supabase
        .from('team_channel_members')
        .upsert(rows, { onConflict: 'channel_id,user_id', ignoreDuplicates: true })
      setShowAddPeople(false)
      setAddSelectedIds([])
      await loadChannels(userId)
    } finally {
      setAddingPeople(false)
    }
  }

  function startEdit(m: Message) {
    setMenuMsg(null)
    setEditingId(m.id)
    setEditText(m.body || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function saveEdit() {
    if (!editingId) return
    const body = editText.trim()
    if (!body) return
    setSavingEdit(true)
    try {
      const { error } = await supabase.rpc('tc_edit_message', { p_message_id: editingId, p_body: body })
      if (error) {
        setNotice('Could not edit the message.')
      } else {
        setEditingId(null)
        setEditText('')
        await loadMessages(activeId)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteMessage(id: string) {
    setMenuMsg(null)
    if (!window.confirm('Delete this message for everyone?')) return
    const { error } = await supabase.rpc('tc_delete_message', { p_message_id: id })
    if (error) {
      setNotice('Could not delete the message.')
    } else {
      await loadMessages(activeId)
    }
  }

  async function deleteGroup() {
    if (!activeId) return
    if (!window.confirm('Delete this group for everyone? This cannot be undone.')) return
    const goneId = activeId
    const { error } = await supabase.from('team_channels').delete().eq('id', goneId)
    if (error) {
      setNotice('Could not delete the group.')
      return
    }
    const remaining = channels.filter((c) => c.id !== goneId)
    setActiveId(remaining[0]?.id || '')
    await loadChannels(userId)
  }

  async function leaveGroup() {
    if (!activeId || !userId) return
    if (!window.confirm('Leave this group?')) return
    const goneId = activeId
    const { error } = await supabase
      .from('team_channel_members')
      .delete()
      .eq('channel_id', goneId)
      .eq('user_id', userId)
    if (error) {
      setNotice('Could not leave the group.')
      return
    }
    const remaining = channels.filter((c) => c.id !== goneId)
    setActiveId(remaining[0]?.id || '')
    await loadChannels(userId)
  }

  function reactionsFor(messageId: string) {
    const map = new Map<string, { emoji: string; count: number; mine: boolean }>()
    for (const r of reactions) {
      if (r.message_id !== messageId) continue
      const e = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false }
      e.count += 1
      if (r.user_id === userId) e.mine = true
      map.set(r.emoji, e)
    }
    return Array.from(map.values())
  }

  async function toggleReaction(message: Message, emoji: string) {
    setMenuMsg(null)
    if (!userId) return
    const mine = reactions.some(
      (r) => r.message_id === message.id && r.user_id === userId && r.emoji === emoji,
    )
    if (mine) {
      await supabase
        .from('team_message_reactions')
        .delete()
        .eq('message_id', message.id)
        .eq('user_id', userId)
        .eq('emoji', emoji)
    } else {
      await supabase.from('team_message_reactions').insert({
        message_id: message.id,
        channel_id: message.channel_id,
        user_id: userId,
        emoji,
      })
    }
    await loadReactions(activeId)
  }

  function startReply(m: Message) {
    setMenuMsg(null)
    setReplyTo(m)
  }

  function cancelReply() {
    setReplyTo(null)
  }

  function openForward(m: Message) {
    setMenuMsg(null)
    setForwardMsg(m)
    setForwardTargets([])
  }

  function toggleForwardTarget(id: string) {
    setForwardTargets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function doForward() {
    if (!forwardMsg || forwardTargets.length === 0 || !userId) return
    const fwdBody = (forwardMsg.body || '').trim()
    const files = forwardMsg.team_message_files || []
    if (!fwdBody && files.length === 0) {
      setForwardMsg(null)
      return
    }
    setForwarding(true)
    try {
      const rows = forwardTargets.map((cid) => ({
        channel_id: cid,
        sender_id: userId,
        sender_name: userName,
        sender_email: userEmail,
        body: fwdBody || null,
        forwarded: true,
      }))
      const ins = await supabase.from('team_messages').insert(rows).select('id')
      const newIds = ((ins.data || []) as { id: string }[]).map((r) => r.id)
      if (files.length > 0 && newIds.length > 0) {
        const fileRows = newIds.flatMap((mid) =>
          files.map((f) => ({
            message_id: mid,
            file_path: f.file_path,
            file_name: f.file_name,
            file_type: f.file_type,
            file_size: f.file_size,
          })),
        )
        await supabase.from('team_message_files').insert(fileRows)
      }
      setForwardMsg(null)
      setForwardTargets([])
      await loadMessages(activeId)
    } finally {
      setForwarding(false)
    }
  }

  function startRename() {
    setHeaderMenuOpen(false)
    setRenameText(activeChannel?.name || '')
    setRenaming(true)
  }

  async function saveRename() {
    if (!activeId) return
    const name = renameText.trim()
    if (!name) return
    setSavingRename(true)
    try {
      const { error } = await supabase.from('team_channels').update({ name }).eq('id', activeId)
      if (error) {
        setNotice('Could not rename the group.')
      } else {
        setRenaming(false)
        await loadChannels(userId)
      }
    } finally {
      setSavingRename(false)
    }
  }

  async function openManageMembers() {
    setHeaderMenuOpen(false)
    await ensureMembersLoaded()
    if (!activeId) return
    const { data } = await supabase
      .from('team_channel_members')
      .select('user_id')
      .eq('channel_id', activeId)
    setExistingMemberIds(((data || []) as { user_id: string }[]).map((r) => r.user_id))
    setShowManageMembers(true)
  }

  async function removeMember(uid: string) {
    if (!activeId) return
    await supabase
      .from('team_channel_members')
      .delete()
      .eq('channel_id', activeId)
      .eq('user_id', uid)
    setExistingMemberIds((prev) => prev.filter((x) => x !== uid))
    await loadChannels(userId)
  }

  async function createPrivate() {
    if (!userId || selectedIds.length === 0) return
    setCreatingPrivate(true)
    setNotice('')
    try {
      // For a one to one chat, reuse an existing direct room if there is one.
      if (selectedIds.length === 1) {
        const targetId = selectedIds[0]
        const { data: myPriv } = await supabase
          .from('team_channels')
          .select('id, team_channel_members(user_id)')
          .eq('is_private', true)
        const existing = (
          (myPriv || []) as Array<{ id: string; team_channel_members: { user_id: string }[] }>
        ).find((c) => {
          const ids = (c.team_channel_members || []).map((m) => m.user_id)
          return ids.length === 2 && ids.includes(userId) && ids.includes(targetId)
        })
        if (existing) {
          await loadChannels(userId)
          setActiveId(existing.id)
          setShowPrivate(false)
          setSelectedIds([])
          setCreatingPrivate(false)
          return
        }
      }

      const picked = members.filter((m) => selectedIds.includes(m.id))
      const names = picked.map((m) => m.name)
      const channelName =
        names.length === 1
          ? names[0]
          : names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '')

      const ins = await supabase
        .from('team_channels')
        .insert({ name: channelName || 'Private chat', is_private: true, created_by: userId })
        .select('id')
        .single()
      if (ins.error || !ins.data) {
        setNotice('Could not create the private chat.')
        setCreatingPrivate(false)
        return
      }
      const id = (ins.data as { id: string }).id
      const rows = [userId, ...selectedIds].map((uid) => ({ channel_id: id, user_id: uid }))
      await supabase.from('team_channel_members').insert(rows)

      setShowPrivate(false)
      setSelectedIds([])
      await loadChannels(userId)
      setActiveId(id)
    } finally {
      setCreatingPrivate(false)
    }
  }

  const activeChannel = channels.find((c) => c.id === activeId) || null
  const isCreator = !!activeChannel && activeChannel.created_by === userId
  const hasGroupActions = !!activeChannel && (activeChannel.is_private || isCreator)
  const openItems = actionItems.filter((a) => a.status !== 'done').length
  const lastOwnId = messages.reduce<string | null>(
    (acc, mm) => (mm.sender_id === userId && !mm.deleted_at ? mm.id : acc),
    null,
  )
  function seenLabel(createdAt: string): string {
    const t = new Date(createdAt).getTime()
    const others = reads.filter(
      (r) => r.user_id !== userId && new Date(r.last_read_at).getTime() >= t,
    )
    if (others.length === 0) return 'Sent'
    if (memberCount <= 2) return 'Seen'
    return `Seen by ${others.length}`
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-10">Loading the team chat...</div>
  }

  if (channels.length === 0) {
    return (
      <div className="py-10">
        <h1 className="text-xl font-semibold text-gray-900">Team Chat</h1>
        <p className="text-sm text-gray-600 mt-2">No channels yet. Create the first one.</p>
        <div className="mt-4 flex gap-2">
          <input
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Channel name"
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={createChannel}
            className="bg-gray-900 text-white text-sm rounded px-4 py-2"
          >
            Create
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-9rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {activeChannel ? `${activeChannel.is_private ? '🔒 ' : ''}${activeChannel.name}` : 'Team Chat'}
          </h1>
          {activeChannel?.description ? (
            <p className="text-xs text-gray-500 truncate">{activeChannel.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasGroupActions ? (
            <div className="relative">
              <button
                onClick={() => setHeaderMenuOpen((v) => !v)}
                className="text-sm rounded px-2.5 py-1.5 border border-gray-300 text-gray-800 hover:bg-gray-100"
                title="Group options"
                aria-label="Group options"
              >
                ⋯
              </button>
              {headerMenuOpen ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 text-sm">
                    {activeChannel?.is_private ? (
                      <button
                        onClick={() => {
                          setHeaderMenuOpen(false)
                          openAddPeople()
                        }}
                        className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50"
                      >
                        Add people
                      </button>
                    ) : null}
                    {activeChannel?.is_private && !isCreator ? (
                      <button
                        onClick={() => {
                          setHeaderMenuOpen(false)
                          leaveGroup()
                        }}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        Leave group
                      </button>
                    ) : null}
                    {isCreator ? (
                      <button
                        onClick={startRename}
                        className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50"
                      >
                        Rename group
                      </button>
                    ) : null}
                    {isCreator ? (
                      <button
                        onClick={openManageMembers}
                        className="w-full text-left px-3 py-2 text-gray-800 hover:bg-gray-50"
                      >
                        Manage members
                      </button>
                    ) : null}
                    {isCreator ? (
                      <button
                        onClick={() => {
                          setHeaderMenuOpen(false)
                          deleteGroup()
                        }}
                        className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        Delete group
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          <button
            onClick={handleSummarise}
            disabled={summarising}
            className="text-sm rounded px-3 py-1.5 border border-gray-300 text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            {summarising ? 'Reading...' : 'Summarise'}
          </button>
          <button
            onClick={() => setTasksOpen((v) => !v)}
            className="lg:hidden text-sm rounded px-3 py-1.5 border border-gray-300 text-gray-800 hover:bg-gray-100"
          >
            {tasksOpen ? 'Chat' : `Tasks${openItems ? ` (${openItems})` : ''}`}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-3">
        {/* Channels, desktop */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-gray-200 pr-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Channels
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={openPrivatePicker}
                className="text-gray-500 hover:text-gray-900 text-sm leading-none"
                title="New private chat"
              >
                🔒
              </button>
              <button
                onClick={() => setShowNewChannel((v) => !v)}
                className="text-gray-500 hover:text-gray-900 text-lg leading-none"
                title="New channel"
              >
                +
              </button>
            </div>
          </div>
          {showNewChannel ? (
            <div className="mb-2 space-y-1">
              <input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createChannel()}
                placeholder="New channel"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <button
                onClick={createChannel}
                className="w-full bg-gray-900 text-white text-xs rounded px-2 py-1"
              >
                Create
              </button>
            </div>
          ) : null}
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`block w-full text-left px-3 py-2 text-sm rounded truncate ${
                  c.id === activeId
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {c.is_private ? '🔒 ' : ''}
                {c.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Main column */}
        <section className="flex-1 min-w-0 flex flex-col">
          {/* Channel picker, mobile */}
          <div className="md:hidden mb-2 flex gap-2">
            <select
              value={activeId}
              onChange={(e) => setActiveId(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm bg-white"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.is_private ? '🔒 ' : ''}
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={openPrivatePicker}
              className="border border-gray-300 rounded px-3 text-gray-700"
              title="New private chat"
            >
              🔒
            </button>
            <button
              onClick={() => setShowNewChannel((v) => !v)}
              className="border border-gray-300 rounded px-3 text-gray-700"
              title="New channel"
            >
              +
            </button>
          </div>
          {showNewChannel ? (
            <div className="md:hidden mb-2 flex gap-2">
              <input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="New channel"
                className="flex-1 border border-gray-300 rounded px-2 py-2 text-sm"
              />
              <button
                onClick={createChannel}
                className="bg-gray-900 text-white text-sm rounded px-3"
              >
                Create
              </button>
            </div>
          ) : null}

          {notice ? (
            <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {notice}
            </div>
          ) : null}

          {/* Tasks panel on small screens */}
          {tasksOpen ? (
            <div className="lg:hidden flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded p-3 mb-2">
              <TasksPanel summary={summary} items={actionItems} onToggle={toggleDone} onSetDue={setTaskDue} members={members} onAddTask={addTask} currentUserId={userId} />
            </div>
          ) : null}

          <div className={`${tasksOpen ? 'hidden lg:flex' : 'flex'} flex-1 min-h-0 flex-col`}>
              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-4">No messages yet. Say hello.</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === userId
                    const who = m.sender_name || m.sender_email || 'Someone'
                    const canAct = !m.deleted_at && (mine || isCreator)
                    const replied = m.reply_to
                      ? messages.find((x) => x.id === m.reply_to) || null
                      : null
                    const rx = reactionsFor(m.id)
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!mine ? (
                          <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-700 text-xs flex items-center justify-center mr-2 shrink-0">
                            {initials(who)}
                          </div>
                        ) : null}
                        {canAct && mine ? (
                          <button
                            onClick={() => setMenuMsg(m)}
                            className="text-gray-400 hover:text-gray-700 px-1 text-base leading-none shrink-0"
                            title="Message options"
                            aria-label="Message options"
                          >
                            ⋯
                          </button>
                        ) : null}
                        {editingId === m.id ? (
                          <div className="w-72 max-w-[78%] rounded-2xl px-3 py-2 bg-white border border-gray-300">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              className="w-full text-sm text-gray-900 resize-none outline-none"
                            />
                            <div className="flex justify-end gap-3 mt-1">
                              <button onClick={cancelEdit} className="text-xs text-gray-500">
                                Cancel
                              </button>
                              <button
                                onClick={saveEdit}
                                disabled={savingEdit || !editText.trim()}
                                className="text-xs font-medium text-gray-900 disabled:opacity-50"
                              >
                                {savingEdit ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                              mine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {!mine ? (
                              <div className="text-[11px] font-medium opacity-70 mb-0.5">{who}</div>
                            ) : null}
                            {m.forwarded && !m.deleted_at ? (
                              <div className="text-[10px] italic opacity-60 mb-0.5">Forwarded</div>
                            ) : null}
                            {replied && !m.deleted_at ? (
                              <div
                                className={`mb-1 rounded px-2 py-1 text-[11px] border-l-2 ${
                                  mine ? 'border-white/50 bg-white/10' : 'border-gray-300 bg-black/5'
                                }`}
                              >
                                <div className="font-medium opacity-80 truncate">
                                  {replied.sender_name || replied.sender_email || 'message'}
                                </div>
                                <div className="opacity-70 truncate">
                                  {replied.deleted_at ? 'deleted message' : replied.body || 'attachment'}
                                </div>
                              </div>
                            ) : null}
                            {m.deleted_at ? (
                              <div className="text-sm italic opacity-70">This message was deleted</div>
                            ) : (
                              <>
                                {m.body ? (
                                  <div
                                    className="text-sm break-words leading-relaxed [&_a]:underline"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(m.body, mine) }}
                                  />
                                ) : null}
                                {(m.team_message_files || []).map((att) => (
                                  <button
                                    key={att.id}
                                    onClick={() => openFile(att)}
                                    className={`mt-1 flex items-center gap-1 text-xs underline ${
                                      mine ? 'text-white' : 'text-gray-700'
                                    }`}
                                  >
                                    <span aria-hidden>📎</span>
                                    <span className="truncate max-w-[12rem]">{att.file_name}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            <div
                              className={`text-[10px] mt-1 ${
                                mine ? 'text-gray-300' : 'text-gray-400'
                              }`}
                            >
                              {timeLabel(m.created_at)}
                              {m.edited_at && !m.deleted_at ? ' · edited' : ''}
                            </div>
                            {mine && m.id === lastOwnId ? (
                              <div className="text-[10px] mt-0.5 text-gray-300">
                                {seenLabel(m.created_at)}
                              </div>
                            ) : null}
                            {rx.length ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rx.map((x) => (
                                  <button
                                    key={x.emoji}
                                    onClick={() => toggleReaction(m, x.emoji)}
                                    className={`text-[11px] rounded-full px-1.5 py-0.5 border ${
                                      x.mine
                                        ? mine
                                          ? 'border-white/60 bg-white/20'
                                          : 'border-gray-400 bg-gray-200'
                                        : mine
                                          ? 'border-white/30'
                                          : 'border-gray-300'
                                    }`}
                                  >
                                    {x.emoji} {x.count}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                        {canAct && !mine ? (
                          <button
                            onClick={() => setMenuMsg(m)}
                            className="text-gray-400 hover:text-gray-700 px-1 text-base leading-none shrink-0"
                            title="Message options"
                            aria-label="Message options"
                          >
                            ⋯
                          </button>
                        ) : null}
                      </div>
                    )
                  })
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <div className="mt-3 border-t border-gray-200 pt-3">
                {replyTo ? (
                  <div className="mb-2 flex items-start gap-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-gray-500">
                        Replying to {replyTo.sender_name || replyTo.sender_email || 'message'}
                      </div>
                      <div className="text-xs text-gray-700 truncate">
                        {replyTo.deleted_at ? 'deleted message' : replyTo.body || 'attachment'}
                      </div>
                    </div>
                    <button
                      onClick={cancelReply}
                      className="text-gray-400 hover:text-gray-700 text-sm shrink-0"
                      aria-label="Cancel reply"
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                {file ? (
                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-700">
                    <span aria-hidden>📎</span>
                    <span className="truncate max-w-[16rem]">{file.name}</span>
                    <button
                      onClick={() => {
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      remove
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-1 mb-1">
                  <button
                    onClick={() => applyWrap('*', '*')}
                    className="h-7 w-7 rounded text-sm font-bold text-gray-700 hover:bg-gray-100"
                    title="Bold"
                    aria-label="Bold"
                  >
                    B
                  </button>
                  <button
                    onClick={() => applyWrap('_', '_')}
                    className="h-7 w-7 rounded text-sm italic text-gray-700 hover:bg-gray-100"
                    title="Italic"
                    aria-label="Italic"
                  >
                    I
                  </button>
                  <button
                    onClick={() => applyWrap('~', '~')}
                    className="h-7 w-7 rounded text-sm line-through text-gray-700 hover:bg-gray-100"
                    title="Strikethrough"
                    aria-label="Strikethrough"
                  >
                    S
                  </button>
                  <button
                    onClick={() => applyWrap('`', '`')}
                    className="h-7 px-1.5 rounded text-xs font-mono text-gray-700 hover:bg-gray-100"
                    title="Code"
                    aria-label="Code"
                  >
                    &lt;/&gt;
                  </button>
                  <span className="w-px h-5 bg-gray-200 mx-1" />
                  <button
                    onClick={() => applyListPrefix('bullet')}
                    className="h-7 px-2 rounded text-sm text-gray-700 hover:bg-gray-100"
                    title="Bullet list"
                    aria-label="Bullet list"
                  >
                    • List
                  </button>
                  <button
                    onClick={() => applyListPrefix('number')}
                    className="h-7 px-2 rounded text-sm text-gray-700 hover:bg-gray-100"
                    title="Numbered list"
                    aria-label="Numbered list"
                  >
                    1. List
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 shrink-0 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                    title="Attach a file"
                    aria-label="Attach a file"
                  >
                    📎
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <textarea
                    ref={composerRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    rows={1}
                    placeholder="Write a message"
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm max-h-32"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || (!text.trim() && !file)}
                    className="h-10 px-4 shrink-0 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
          </div>
        </section>

        {/* Tasks, desktop */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-gray-200 pl-3 overflow-y-auto">
          <TasksPanel summary={summary} items={actionItems} onToggle={toggleDone} onSetDue={setTaskDue} members={members} onAddTask={addTask} currentUserId={userId} />
        </aside>
      </div>

      {/* Private chat picker */}
      {showPrivate ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowPrivate(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-sm max-h-[80dvh] flex flex-col shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">New private chat</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pick one person for a direct message, or several for a private group.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingMembers ? (
                <p className="text-sm text-gray-500 p-3">Loading teammates...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-gray-500 p-3">No other teammates found.</p>
              ) : (
                members.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={() => toggleSelect(m.id)}
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">{m.name}</div>
                      <div className="text-[11px] text-gray-500 truncate">{m.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowPrivate(false)}
                className="text-sm rounded px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={createPrivate}
                disabled={creatingPrivate || selectedIds.length === 0}
                className="text-sm rounded px-4 py-1.5 bg-gray-900 text-white disabled:opacity-50"
              >
                {creatingPrivate ? 'Starting...' : 'Start chat'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add people to an existing private group */}
      {showAddPeople ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowAddPeople(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-sm max-h-[80dvh] flex flex-col shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Add people</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pick who to add. They will be able to read this group's messages.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingMembers ? (
                <p className="text-sm text-gray-500 p-3">Loading teammates...</p>
              ) : members.filter((m) => !existingMemberIds.includes(m.id)).length === 0 ? (
                <p className="text-sm text-gray-500 p-3">Everyone is already in this group.</p>
              ) : (
                members
                  .filter((m) => !existingMemberIds.includes(m.id))
                  .map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={addSelectedIds.includes(m.id)}
                        onChange={() => toggleAddSelect(m.id)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">{m.name}</div>
                        <div className="text-[11px] text-gray-500 truncate">{m.email}</div>
                      </div>
                    </label>
                  ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowAddPeople(false)}
                className="text-sm rounded px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={addPeople}
                disabled={addingPeople || addSelectedIds.length === 0}
                className="text-sm rounded px-4 py-1.5 bg-gray-900 text-white disabled:opacity-50"
              >
                {addingPeople ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Message options sheet */}
      {menuMsg ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setMenuMsg(null)}
        >
          <div
            className="bg-white w-full sm:max-w-xs rounded-t-2xl sm:rounded-lg shadow-lg p-1"
            onClick={(e) => e.stopPropagation()}
          >
            {!menuMsg.deleted_at ? (
              <div className="flex gap-1 px-2 py-2 border-b border-gray-100">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggleReaction(menuMsg, e)}
                    className="text-xl px-1.5 py-1 rounded hover:bg-gray-100"
                    aria-label={`React ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : null}
            {!menuMsg.deleted_at ? (
              <button
                onClick={() => startReply(menuMsg)}
                className="w-full text-left px-4 py-3 text-sm text-gray-800 rounded hover:bg-gray-50"
              >
                Reply
              </button>
            ) : null}
            {!menuMsg.deleted_at &&
            ((menuMsg.body || '').trim() || (menuMsg.team_message_files || []).length > 0) ? (
              <button
                onClick={() => openForward(menuMsg)}
                className="w-full text-left px-4 py-3 text-sm text-gray-800 rounded hover:bg-gray-50"
              >
                Forward
              </button>
            ) : null}
            {menuMsg.sender_id === userId && !menuMsg.deleted_at ? (
              <button
                onClick={() => startEdit(menuMsg)}
                className="w-full text-left px-4 py-3 text-sm text-gray-800 rounded hover:bg-gray-50"
              >
                Edit
              </button>
            ) : null}
            {!menuMsg.deleted_at ? (
              <button
                onClick={() => deleteMessage(menuMsg.id)}
                className="w-full text-left px-4 py-3 text-sm text-red-600 rounded hover:bg-red-50"
              >
                Delete
              </button>
            ) : null}
            <button
              onClick={() => setMenuMsg(null)}
              className="w-full text-left px-4 py-3 text-sm text-gray-500 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Forward modal */}
      {forwardMsg ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setForwardMsg(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-lg shadow-lg p-4 max-h-[80dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium text-gray-900 mb-2">Forward to</div>
            <div className="space-y-1">
              {channels
                .filter((c) => c.id !== activeId)
                .map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={forwardTargets.includes(c.id)}
                      onChange={() => toggleForwardTarget(c.id)}
                    />
                    <span className="text-sm text-gray-800 truncate">{c.name}</span>
                  </label>
                ))}
            </div>
            <div className="flex justify-end gap-3 mt-3">
              <button onClick={() => setForwardMsg(null)} className="text-sm text-gray-500">
                Cancel
              </button>
              <button
                onClick={doForward}
                disabled={forwarding || forwardTargets.length === 0}
                className="text-sm rounded px-4 py-1.5 bg-gray-900 text-white disabled:opacity-50"
              >
                {forwarding ? 'Sending...' : 'Forward'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Manage members modal */}
      {showManageMembers ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setShowManageMembers(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-lg shadow-lg p-4 max-h-[80dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium text-gray-900 mb-2">Members</div>
            <div className="space-y-1">
              {members
                .filter((u) => existingMemberIds.includes(u.id))
                .map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-800 truncate">{u.name || u.email}</span>
                    <button
                      onClick={() => removeMember(u.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              {members.filter((u) => existingMemberIds.includes(u.id)).length === 0 ? (
                <div className="text-xs text-gray-500 px-2 py-2">No other members to remove.</div>
              ) : null}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowManageMembers(false)} className="text-sm text-gray-500">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Rename group modal */}
      {renaming ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setRenaming(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-lg shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium text-gray-900 mb-2">Rename group</div>
            <input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className="w-full text-sm rounded border border-gray-300 px-3 py-2 outline-none"
              placeholder="Group name"
            />
            <div className="flex justify-end gap-3 mt-3">
              <button onClick={() => setRenaming(false)} className="text-sm text-gray-500">
                Cancel
              </button>
              <button
                onClick={saveRename}
                disabled={savingRename || !renameText.trim()}
                className="text-sm rounded px-4 py-1.5 bg-gray-900 text-white disabled:opacity-50"
              >
                {savingRename ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TaskRow({
  it,
  onToggle,
  onSetDue,
  currentUserId,
}: {
  it: ActionItem
  onToggle: (item: ActionItem) => void
  onSetDue: (item: ActionItem, value: string) => void
  currentUserId: string
}) {
  const locked = !!it.assignee_id && it.assignee_id !== currentUserId
  return (
    <li className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={it.status === 'done'}
        onChange={() => onToggle(it)}
        disabled={locked}
        title={locked ? 'Only the assigned person can change this' : undefined}
        className={`mt-0.5 ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
      />
      <div className="min-w-0">
        <div
          className={`text-sm ${
            it.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {it.title}
        </div>
        {(it.owner || it.due_hint) && (
          <div className="text-[11px] text-gray-500">
            {it.owner ? it.owner : ''}
            {it.owner && it.due_hint ? ', ' : ''}
            {it.due_hint ? it.due_hint : ''}
          </div>
        )}
        {it.status !== 'done' && (
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500">Remind:</span>
            <input
              type="datetime-local"
              value={it.due_at ? toLocalInput(it.due_at) : ''}
              onChange={(e) => onSetDue(it, e.target.value)}
              className="text-[11px] border border-gray-300 rounded px-1 py-0.5 text-gray-700"
            />
            {it.due_at ? (
              <button
                onClick={() => onSetDue(it, '')}
                className="text-[11px] text-gray-400 hover:text-gray-700"
                aria-label="Clear reminder"
              >
                clear
              </button>
            ) : null}
          </div>
        )}
      </div>
    </li>
  )
}

function TasksPanel({
  summary,
  items,
  onToggle,
  onSetDue,
  members,
  onAddTask,
  currentUserId,
}: {
  summary: string
  items: ActionItem[]
  onToggle: (item: ActionItem) => void
  onSetDue: (item: ActionItem, value: string) => void
  members: Member[]
  onAddTask: (title: string, assigneeId: string, dueValue: string) => void
  currentUserId: string
}) {
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [newDue, setNewDue] = useState('')
  const [showDone, setShowDone] = useState(false)
  const openItems = items.filter((i) => i.status !== 'done')
  const doneItems = items.filter((i) => i.status === 'done')
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          Summary
        </h2>
        {summary ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-xs text-gray-400">
            Press Summarise to recap this channel and pull out tasks.
          </p>
        )}
      </div>
      <div>
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Action items
        </h2>
        {openItems.length === 0 ? (
          <p className="text-xs text-gray-400">Nothing tracked yet.</p>
        ) : (
          <ul className="space-y-2">
            {openItems.map((it) => (
              <TaskRow
                key={it.id}
                it={it}
                onToggle={onToggle}
                onSetDue={onSetDue}
                currentUserId={currentUserId}
              />
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-gray-100 pt-2 space-y-1">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a task"
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-800"
          />
          <div className="flex gap-1">
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="flex-1 min-w-0 text-[12px] border border-gray-300 rounded px-1 py-1 text-gray-700"
            >
              <option value="">Assign to</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="text-[12px] border border-gray-300 rounded px-1 py-1 text-gray-700"
            />
          </div>
          <button
            onClick={() => {
              if (!newTitle.trim()) return
              onAddTask(newTitle, newAssignee, newDue)
              setNewTitle('')
              setNewAssignee('')
              setNewDue('')
            }}
            className="w-full text-sm rounded px-3 py-1.5 bg-gray-900 text-white"
          >
            Add task
          </button>
        </div>
      </div>
      {doneItems.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone((s) => !s)}
            className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2"
          >
            Completed ({doneItems.length}) {showDone ? '▾' : '▸'}
          </button>
          {showDone && (
            <ul className="space-y-2">
              {doneItems.map((it) => (
                <TaskRow
                  key={it.id}
                  it={it}
                  onToggle={onToggle}
                  onSetDue={onSetDue}
                  currentUserId={currentUserId}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
