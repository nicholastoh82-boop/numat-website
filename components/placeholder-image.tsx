'use client'

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

type Props = {
  /** Final asset path. Drop the real file here and the placeholder disappears. */
  src: string
  alt: string
  /** Shown on the placeholder panel so it is obvious what belongs in the slot. */
  label?: string
  className?: string
}

/**
 * Renders the real image once it exists at `src`, and a labelled neutral panel
 * until then. Keeps the layout honest during the overhaul instead of showing a
 * broken image icon on a live page.
 */
export default function PlaceholderImage({ src, alt, label, className = '' }: Props) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-stone-200 text-stone-500 ${className}`}
        role="img"
        aria-label={`${alt} (image pending)`}
      >
        <ImageIcon className="h-6 w-6" />
        <span className="px-4 text-center text-xs font-medium">{label ?? alt}</span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}
