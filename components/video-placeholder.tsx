'use client'

import { PlayCircle } from 'lucide-react'

type Props = {
  /** Shown on the panel so it is obvious what belongs in the slot. */
  label: string
  className?: string
}

/**
 * Neutral labelled panel standing in for a video that has not been shot or
 * uploaded yet. Replace with the real embed when the asset lands.
 */
export default function VideoPlaceholder({ label, className = '' }: Props) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-stone-900 text-stone-400 ${className}`}
      role="img"
      aria-label={`${label} (video pending)`}
    >
      <PlayCircle className="h-10 w-10" />
      <span className="px-6 text-center text-xs font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
      <span className="text-[11px] text-stone-500">Video pending</span>
    </div>
  )
}
