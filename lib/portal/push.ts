/* lib/portal/push.ts
   Server side web push with no external library. It signs a VAPID token with the
   keys in push_config, encrypts the message for each device the way browsers and
   Apple require (RFC 8291, aes128gcm), and sends it. The notification text now
   travels inside the push itself, so the device shows it straight away with no
   extra fetch. A copy is also written to push_notifications as a record. */

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

function b64urlToBuf(s: string): Buffer {
  let t = s.replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  return Buffer.from(t, 'base64')
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
    Buffer.from(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: v.subject })),
  )
  const signingInput = `${header}.${payload}`
  const sig = crypto
    .createSign('SHA256')
    .update(signingInput)
    .end()
    .sign({ key: v.privatePem, dsaEncoding: 'ieee-p1363' })
  return `vapid t=${signingInput}.${b64url(sig)}, k=${v.publicKey}`
}

/* Encrypt a message for one subscription using its public key (p256dh) and auth
   secret. Returns the full aes128gcm body to post. Follows RFC 8291 and RFC 8188. */
function encryptPayload(plaintext: string, p256dh: string, auth: string): Buffer {
  const uaPublic = b64urlToBuf(p256dh) // 65 bytes, the device public key
  const authSecret = b64urlToBuf(auth) // 16 bytes

  const ecdh = crypto.createECDH('prime256v1')
  const asPublic = ecdh.generateKeys() // our throwaway public key, 65 bytes
  const sharedSecret = ecdh.computeSecret(uaPublic) // 32 bytes
  const salt = crypto.randomBytes(16)

  // Combine the auth secret and the shared secret into the input key material.
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'utf8'), uaPublic, asPublic])
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32))

  // Derive the content key and nonce from the input key material and the salt.
  const cek = Buffer.from(
    crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'), 16),
  )
  const nonce = Buffer.from(
    crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'utf8'), 12),
  )

  // One record: the message, a 0x02 end marker, then encrypt.
  const padded = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.from([0x02])])
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const body = Buffer.concat([cipher.update(padded), cipher.final()])
  const tag = cipher.getAuthTag()

  // Header: salt (16) then record size (4) then key id length (1) then key id.
  const rs = Buffer.alloc(4)
  rs.writeUInt32BE(4096, 0)
  const idlen = Buffer.from([asPublic.length])
  const header = Buffer.concat([salt, rs, idlen, asPublic])

  return Buffer.concat([header, body, tag])
}

type Sub = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string | null
  auth: string | null
}

/* Writes a record for each recipient, then pushes the message to their devices.
   userIds null means everyone who has a subscription. */
export async function notifyUsers(opts: {
  userIds: string[] | null
  title: string
  body?: string
  url?: string
}): Promise<void> {
  const a = admin()

  let subQuery = a.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
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

  const message = JSON.stringify({
    title: opts.title,
    body: opts.body ?? '',
    url: opts.url ?? '/portal',
  })

  await Promise.all(
    list.map(async (s) => {
      if (!s.p256dh || !s.auth) return
      try {
        const payload = encryptPayload(message, s.p256dh, s.auth)
        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: {
            Authorization: vapidAuth(s.endpoint, v),
            TTL: '86400',
            Urgency: 'high',
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
          },
          body: payload as BodyInit,
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
