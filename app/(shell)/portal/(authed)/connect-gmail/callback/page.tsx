'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ConnectGmailCallbackPage() {
  const [state, setState] = useState<'working' | 'saved' | 'error'>('working')
  const [msg, setMsg] = useState('Finishing the connection...')
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<string | null>(null)
  const [testOk, setTestOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      // Give the client a moment to finish exchanging the code for a session.
      let refreshToken: string | null | undefined
      for (let i = 0; i < 5 && !refreshToken; i++) {
        const { data } = await supabase.auth.getSession()
        refreshToken = data.session?.provider_refresh_token
        if (!refreshToken) await new Promise((r) => setTimeout(r, 400))
      }
      if (cancelled) return

      if (!refreshToken) {
        setState('error')
        setMsg(
          'Google did not return a sending permission. Please go back and try again, making sure you approve the Gmail access on the Google screen.'
        )
        return
      }

      try {
        const res = await fetch('/api/portal/connect-gmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken, scope: 'gmail.send gmail.modify' }),
        })
        const data = await res.json()
        if (data.ok) {
          setState('saved')
          setMsg(`Gmail is connected for ${data.email}.`)
        } else {
          setState('error')
          setMsg(data.error || 'Could not save the connection.')
        }
      } catch {
        setState('error')
        setMsg('Could not save the connection. Please try again.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function sendTest() {
    setTesting(true)
    setTestMsg(null)
    setTestOk(null)
    try {
      const res = await fetch('/api/portal/connect-gmail/test', { method: 'POST' })
      const data = await res.json()
      setTestOk(!!data.ok)
      setTestMsg(data.ok ? `Test email sent to ${data.sentTo}. Check that inbox to confirm.` : data.error)
    } catch {
      setTestOk(false)
      setTestMsg('The test could not run. Please try again.')
    }
    setTesting(false)
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">Connect Gmail</h1>
      <p className={`mt-3 text-sm ${state === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{msg}</p>

      {state === 'saved' && (
        <div className="mt-6">
          <button
            type="button"
            onClick={sendTest}
            disabled={testing}
            className="px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {testing ? 'Sending test...' : 'Send test email'}
          </button>
          {testMsg && (
            <p className={`mt-4 text-sm ${testOk ? 'text-green-700' : 'text-red-600'}`}>{testMsg}</p>
          )}
        </div>
      )}

      {state === 'error' && (
        <Link
          href="/portal/connect-gmail"
          className="mt-6 inline-block px-4 py-2 text-sm rounded border border-gray-200 text-gray-700 hover:bg-gray-100"
        >
          Try again
        </Link>
      )}
    </div>
  )
}
