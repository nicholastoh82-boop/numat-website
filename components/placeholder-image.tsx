'use client'

import { useEffect, useRef, useState } from 'react'
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
 * until then.
 *
 * onError on its own is not enough. This is a client component but it is still
 * server rendered, so the browser starts fetching the image while it parses the
 * HTML. A missing file fires its error event before React hydrates and attaches
 * the handler, and React does not replay that event, so the panel never
 * appeared and the live page showed a broken image icon instead. It looked fine
 * locally because hydration wins the race when there is no network latency.
 *
 * The mount check below reads the element back: complete with no intrinsic
 * width means the fetch already failed, which catches what onError missed.
 * Tracking the failed src rather than a boolean means a later src change
 * re-arms the component instead of leaving the panel stuck on screen.
 */
export default function PlaceholderImage({ src, alt, label, className = '' }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const ref = useRef<HTMLImageElement>(null)
  const failed = failedSrc === src

  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src)
  }, [src])

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
      ref={ref}
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      className={`h-full w-full object-cover ${className}`}
    />
  )
}
