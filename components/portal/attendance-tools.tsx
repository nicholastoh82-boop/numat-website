'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Shows Clock In or Clock Out based on the last event. On tap it asks the
// device for location, then records the event either way so a denied or failed
// location never blocks clocking in.
export function ClockButton({ clockedIn }: { clockedIn: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const nextType = clockedIn ? 'out' : 'in'

  async function send(
    lat: number | null,
    lng: number | null,
    acc: number | null,
  ) {
    const res = await fetch('/api/portal/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: nextType, latitude: lat, longitude: lng, accuracy: acc }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setNote(d.error || 'Could not record.')
    } else {
      router.refresh()
    }
    setBusy(false)
  }

  function run() {
    setBusy(true)
    setNote('')
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setNote('Location not available on this device. Recorded without it.')
      send(null, null, null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => send(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {
        setNote('Location not shared. Recorded without it.')
        send(null, null, null)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={`rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
          clockedIn ? 'bg-gray-800' : 'bg-green-600'
        }`}
      >
        {busy ? 'Recording...' : clockedIn ? 'Clock out' : 'Clock in'}
      </button>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  )
}
