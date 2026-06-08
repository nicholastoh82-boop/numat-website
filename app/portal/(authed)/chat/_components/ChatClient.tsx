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
  team_message_files?: Attachment[]
}

type ActionItem = {
  id: string
  title: string
  owner: string | null
  due_hint: string | null
  status: string
  created_at: string
}

type Member = { id: string; name: string; email: string }

const BUCKET = 'team_files'

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

  const [loading, setLoading] = useState(true)

  const endRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
          'id, channel_id, sender_id, sender_name, sender_email, body, created_at, edited_at, deleted_at, team_message_files(id, file_path, file_name, file_type, file_size)',
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
        .select('id, title, owner, due_hint, status, created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
      setActionItems((data || []) as ActionItem[])
    },
    [supabase],
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
  }, [activeId, supabase, loadMessages, loadActionItems])

  // Keep the view pinned to the newest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadMessages(activeId)
    } finally {
      setSending(false)
    }
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
    await supabase
      .from('team_action_items')
      .update({ status: next, done_at: next === 'done' ? new Date().toISOString() : null })
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
            Tasks{openItems ? ` (${openItems})` : ''}
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
              <TasksPanel summary={summary} items={actionItems} onToggle={toggleDone} />
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-4">No messages yet. Say hello.</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === userId
                    const who = m.sender_name || m.sender_email || 'Someone'
                    const canAct = !m.deleted_at && (mine || isCreator)
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
                            {m.deleted_at ? (
                              <div className="text-sm italic opacity-70">This message was deleted</div>
                            ) : (
                              <>
                                {m.body ? (
                                  <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
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
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
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
            </>
          )}
        </section>

        {/* Tasks, desktop */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-gray-200 pl-3 overflow-y-auto">
          <TasksPanel summary={summary} items={actionItems} onToggle={toggleDone} />
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
    </div>
  )
}

function TasksPanel({
  summary,
  items,
  onToggle,
}: {
  summary: string
  items: ActionItem[]
  onToggle: (item: ActionItem) => void
}) {
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
        {items.length === 0 ? (
          <p className="text-xs text-gray-400">Nothing tracked yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={it.status === 'done'}
                  onChange={() => onToggle(it)}
                  className="mt-0.5"
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
