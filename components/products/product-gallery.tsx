'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import type { GalleryImage } from '@/lib/product-media'

type Props = {
  images: GalleryImage[]
  /** Compact mode for product cards: no thumbnails, no lightbox, small arrows. */
  compact?: boolean
  className?: string
  priority?: boolean
}

function Slide({ image, priority, sizes }: { image: GalleryImage; priority?: boolean; sizes: string }) {
  const contain = image.fit === 'contain'
  return (
    <div className={`relative h-full w-full ${contain ? 'bg-[#f4efe6]' : 'bg-stone-100'}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        className={contain ? 'object-contain p-4 sm:p-8' : 'object-cover'}
      />
    </div>
  )
}

/**
 * Swipeable product image carousel (Embla). Arrows, dots or thumbnails, arrow
 * key support, and a full screen view on the detail page.
 */
export default function ProductGallery({ images, compact = false, className = '', priority = false }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 })
  const [thumbsRef, thumbsApi] = useEmblaCarousel({ containScroll: 'keepSnaps', dragFree: true })
  const [selected, setSelected] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    const index = emblaApi.selectedScrollSnap()
    setSelected(index)
    thumbsApi?.scrollTo(index)
  }, [emblaApi, thumbsApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect).on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightbox, prev, next])

  if (images.length === 0) return null
  const many = images.length > 1

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        className="group relative overflow-hidden rounded-[1.5rem] border border-stone-200"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') prev()
          if (e.key === 'ArrowRight') next()
        }}
        tabIndex={compact ? -1 : 0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Product images"
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex touch-pan-y">
            {images.map((image, i) => (
              <div
                key={image.src}
                className={`relative min-w-0 shrink-0 grow-0 basis-full ${compact ? 'aspect-[4/3]' : 'aspect-square sm:aspect-[5/4]'}`}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${images.length}`}
              >
                <Slide
                  image={image}
                  priority={priority && i === 0}
                  sizes={compact ? '(min-width: 1024px) 33vw, 100vw' : '(min-width: 1024px) 55vw, 100vw'}
                />
              </div>
            ))}
          </div>
        </div>

        {many && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); prev() }}
              aria-label="Previous image"
              className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 text-stone-900 shadow-md transition hover:bg-white ${compact ? 'p-1.5 opacity-0 group-hover:opacity-100' : 'p-2.5'}`}
            >
              <ChevronLeft className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); next() }}
              aria-label="Next image"
              className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 text-stone-900 shadow-md transition hover:bg-white ${compact ? 'p-1.5 opacity-0 group-hover:opacity-100' : 'p-2.5'}`}
            >
              <ChevronRight className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
            </button>
          </>
        )}

        {many && compact && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((image, i) => (
              <span
                key={image.src}
                className={`h-1.5 rounded-full transition-all ${i === selected ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        )}

        {!compact && (
          <>
            <span className="absolute bottom-3 left-3 rounded-full bg-stone-950/70 px-3 py-1 text-xs font-medium text-white">
              {selected + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              aria-label="View full screen"
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2.5 text-stone-900 shadow-md transition hover:bg-white"
            >
              <Expand className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {!compact && many && (
        <div ref={thumbsRef} className="overflow-hidden">
          <div className="flex gap-2">
            {images.map((image, i) => (
              <button
                key={image.src}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === selected}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-20 ${
                  i === selected ? 'border-emerald-800' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="80px"
                  className={image.fit === 'contain' ? 'bg-[#f4efe6] object-contain p-1' : 'object-cover'}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Product images, full screen"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-stone-600">
              {selected + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close full screen view"
              className="rounded-full bg-stone-100 p-2.5 text-stone-900 transition hover:bg-stone-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              key={images[selected].src}
              src={images[selected].src}
              alt={images[selected].alt}
              fill
              sizes="100vw"
              className="object-contain p-4"
            />
            {many && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-stone-100 p-3 text-stone-900 shadow transition hover:bg-stone-200"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-stone-100 p-3 text-stone-900 shadow transition hover:bg-stone-200"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          <p className="px-4 pb-4 text-center text-sm text-stone-600">{images[selected].alt}</p>
        </div>
      )}
    </div>
  )
}
