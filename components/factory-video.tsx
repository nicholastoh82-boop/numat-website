'use client'

import { useState } from 'react'
import { PlayCircle } from 'lucide-react'

type Props = {
  src: string
  poster?: string
  /** Used for the fallback panel and as the accessible label. */
  label: string
  className?: string
}

/**
 * Factory walkthrough player.
 *
 * Plain HTML5 video with a poster, so it streams from wherever src points (the
 * MP4 is encoded with faststart, moov atom up front, so playback can begin
 * before the whole file arrives). Not autoplaying: a 52 second walkthrough with
 * sound should start on a deliberate click, not ambush a visitor.
 *
 * If the file is missing or the codec is unsupported, onError swaps in the same
 * neutral panel the slot used to show, so a broken asset never renders a broken
 * player on a live page.
 */
export default function FactoryVideo({ src, poster, label, className = '' }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-stone-900 text-stone-400 ${className}`}
        role="img"
        aria-label={`${label} (video unavailable)`}
      >
        <PlayCircle className="h-10 w-10" />
        <span className="px-6 text-center text-xs font-semibold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      className={`h-full w-full bg-stone-900 object-cover ${className}`}
      controls
      preload="metadata"
      poster={poster}
      playsInline
      aria-label={label}
      onError={() => setFailed(true)}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  )
}
