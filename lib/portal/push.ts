/* lib/portal/push.ts
   Server side web push with no external library. It signs a VAPID token with
   the keys in push_config and sends a wake signal (no payload) to each device.
   The text to show is written to push_notifications, which the service worker
   fetches from /api/portal/push/pending. */

import crypto from 'node:crypto'
import { createClient as createAdmin } from '@supabase/supabase-js'

function admin() {
  return createAdmin(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

type Vapid = { publicKey: string; privatePem: string; subject: string }

async function getVapid(a: ReturnType<typeof admin>): Promise<Vapid | null> {
  const { data } = await a.from('push_config').select('key, value')
  const m: Record<string, string> = {}
  for (const r of (data ?? []) as Array<{ key: string; value: string }>) m[r.key] = r.value
  if (!m.vapid_public || !m.vapid_private) return null
  return {
    publicKey: m.vapid_public,
    privatePem: m.vapid_private,
    subject: m.vapid_subject || 'mailto:nick@numat.ph',
  }
}

function vapidAuth(endpoint: string, v: Vapid): string {
  const aud = new URL(endpoint).origin
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 43200,
        sub: v.subject,
      }),
    ),
  )
  const signingInput = `${header}.${payload}`
  const sig = crypto
    .createSign('SHA256')
    .update(signingInput)
    .end()
    .sign({ key: v.privatePem, dsaEncoding: 'ieee-p1363' })
  return `vapid t=${signingInput}.${b64url(sig)}, k=${v.publicKey}`
}

type Sub = { id: string; user_id: string; endpoint: string }

/* Writes an outbox row for each recipient, then wakes their devices.
   userIds null means everyone who has a subscription. */
export async function notifyUsers(opts: {
  userIds: string[] | null
  title: string
  body?: string
  url?: string
}): Promise<void> {
  const a = admin()

  let subQuery = a.from('push_subscriptions').select('id, user_id, endpoint')
  if (opts.userIds && opts.userIds.length > 0) {
    subQuery = subQuery.in('user_id', opts.userIds)
  }
  const { data: subs } = await subQuery
  const list = (subs ?? []) as Sub[]
  if (list.length === 0) return

  const recipients = Array.from(new Set(list.map((s) => s.user_id)))
  await a.from('push_notifications').insert(
    recipients.map((uid) => ({
      user_id: uid,
      title: opts.title,
      body: opts.body ?? null,
      url: opts.url ?? '/portal',
    })),
  )

  const v = await getVapid(a)
  if (!v) return

  await Promise.all(
    list.map(async (s) => {
      try {
        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: { Authorization: vapidAuth(s.endpoint, v), TTL: '86400' },
        })
        if (res.status === 404 || res.status === 410) {
          await a.from('push_subscriptions').delete().eq('id', s.id)
        }
      } catch {
        // Ignore a single failed send.
      }
    }),
  )
}
