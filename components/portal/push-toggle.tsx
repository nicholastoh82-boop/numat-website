'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function PushToggle() {
  const [supported, setSupported] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [publicKey, setPublicKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setSupported(ok)

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '')
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (isIOS && !standalone) setIosNeedsInstall(true)

    if (!ok) {
      setLoaded(true)
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/portal/push')
        if (res.ok) {
          const j = await res.json()
          setPublicKey(j.publicKey || '')
          setSubscribed(!!j.subscribed)
        }
      } catch {
        // Leave defaults.
      }
      setLoaded(true)
    })()
  }, [])

  async function enable() {
    setBusy(true)
    setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setMsg('Permission was not granted.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
      const res = await fetch('/api/portal/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) {
        setMsg('Could not save the subscription.')
        return
      }
      setSubscribed(true)
      setMsg('Notifications are on for this device.')
    } catch {
      setMsg('Could not turn on notifications.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setMsg('')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/portal/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
      setMsg('Notifications are off for this device.')
    } catch {
      setMsg('Could not turn off notifications.')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/portal/push/test', { method: 'POST' })
      setMsg(res.ok ? 'Test sent. It should appear shortly.' : 'Could not send the test.')
    } catch {
      setMsg('Could not send the test.')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">Device notifications</h2>
      {!supported ? (
        <p className="text-sm text-gray-500">This browser does not support notifications.</p>
      ) : iosNeedsInstall ? (
        <p className="text-sm text-gray-500">
          On iPhone, add this app to your home screen first, then open it from the icon to turn on
          notifications.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {subscribed
              ? 'On for this device. You will get a notification for new announcements and leave decisions.'
              : 'Get a notification on this device for new announcements and leave decisions.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {subscribed ? (
              <>
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  Turn off
                </button>
                <button
                  type="button"
                  onClick={test}
                  disabled={busy}
                  className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Send test
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={enable}
                disabled={busy || !publicKey}
                className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Turn on notifications
              </button>
            )}
          </div>
          {msg && <p className="text-xs text-gray-500">{msg}</p>}
        </>
      )}
    </div>
  )
}
