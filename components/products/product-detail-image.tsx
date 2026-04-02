'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCategoryName, getFallbackImageByCategory } from '@/lib/product-image'

type ImageItem = {
  id: string
  image_url: string
  alt_text?: string
  is_primary?: boolean
}

interface ProductDetailImageProps {
  product: {
    name: string
    image_url?: string | null
    images?: ImageItem[]
    category?: string | { id?: string; name?: string } | null
    categories?: { id: string; name: string } | null
  }
  variantImages?: ImageItem[]
}

export default function ProductDetailImage({ product, variantImages }: ProductDetailImageProps) {
  const categoryName = getCategoryName(product)
  const fallbackImage = getFallbackImageByCategory(categoryName) || '/Bamboo-Board.png'

  function buildSlides(images: ImageItem[] | undefined | null, fallback: string, name: string) {
    if (images && images.length > 0) {
      const sorted = [...images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      return sorted.map((img) => ({ id: img.id, src: img.image_url, alt: img.alt_text || name }))
    }
    return null
  }

  const variantSlides = buildSlides(variantImages, fallbackImage, product.name)
  const productSlides = buildSlides(product.images, fallbackImage, product.name)
  const slides =
    variantSlides ??
    productSlides ??
    (product.image_url
      ? [{ id: 'main', src: product.image_url, alt: product.name }]
      : [{ id: 'fallback', src: fallbackImage, alt: product.name }])

  const [index, setIndex] = useState(0)

  // Reset to first slide when variant changes
  useEffect(() => {
    setIndex(0)
  }, [variantImages])

  const safeIndex = Math.min(index, slides.length - 1)
  const current = slides[safeIndex]

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex((i) => (i + 1) % slides.length)

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Main image */}
      <div className="group relative flex-1 min-h-[260px] overflow-hidden rounded-3xl sm:min-h-[420px]">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          unoptimized
          className="object-cover transition-opacity duration-300"
          onError={() => setIndex(0)}
        />

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === safeIndex ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === safeIndex ? 'border-primary' : 'border-transparent hover:border-border'
              }`}
            >
              <Image src={slide.src} alt={slide.alt} fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
