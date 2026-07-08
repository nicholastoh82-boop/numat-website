'use client'

/*
  app/portal/(authed)/chat/error.tsx

  Temporary diagnostic boundary. If the chat client throws while rendering,
  this shows the real error message and stack on screen so we can see the
  exact cause instead of the generic browser message. White background.
*/

import { useEffect } from 'react'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Chat page error:', error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827', padding: '24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Chat hit an error</h1>
        <p style={{ fontSize: 14, marginBottom: 6 }}>Message</p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#f3f4f6',
            padding: 12,
            borderRadius: 8,
            fontSize: 14,
            color: '#b91c1c',
          }}
        >
          {error?.name ? error.name + ': ' : ''}
          {error?.message || 'No message available'}
        </pre>
        {error?.digest ? (
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Digest: {error.digest}</p>
        ) : null}
        <p style={{ fontSize: 14, margin: '16px 0 6px' }}>Stack</p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#f3f4f6',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflowX: 'auto',
          }}
        >
          {error?.stack || 'No stack available'}
        </pre>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 16,
            background: '#111827',
            color: '#ffffff',
            fontSize: 14,
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
