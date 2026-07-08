/* components/portal/PortalErrorBoundary.tsx
   Shared error UI for the internal portal, CRM and finance route trees. Next
   renders the nearest error.tsx when a route subtree throws during render. This
   keeps a broken page from taking down the whole shell: the sidebar and the
   rest of the app stay usable, the person gets a plain explanation, a retry,
   and a way back home. White background to match the finance and CRM tools. */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function PortalErrorBoundary({
  error,
  reset,
  area = 'this page',
}: {
  error: Error & { digest?: string }
  reset: () => void
  area?: string
}) {
  useEffect(() => {
    // Surfaces in the browser console and in Vercel logs for triage.
    console.error(`[portal error boundary] ${area}:`, error)
  }, [error, area])

  return (
    <div className="min-h-[60vh] bg-white text-gray-900 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center">
        <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600">
          {area.charAt(0).toUpperCase() + area.slice(1)} hit an error and could not load. Your data
          is safe. You can try again, or head back and come at it fresh.
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm rounded bg-gray-900 text-white hover:bg-gray-800"
          >
            Try again
          </button>
          <Link
            href="/portal"
            className="px-4 py-2 text-sm rounded border border-gray-200 text-gray-700 hover:bg-gray-100"
          >
            Back to portal home
          </Link>
        </div>
      </div>
    </div>
  )
}
