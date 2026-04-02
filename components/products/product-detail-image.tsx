'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getCategoryName, getFallbackImageByCategory } from '@/lib/product-image'

interface ProductDetailImageProps {
  product: {
    name: string
    image_url?: string | null
    images?: Array<{
      id: string
      image_url: string
      alt_text?: string
      is_primary?: boolean
    }>
    category?: string | { id?: string; name?: string } | null
    categories?: { id: string; name: string } | null
  }
}

export default function ProductDetailImage({ product }: ProductDetailImageProps) {
  const categoryName = getCategoryName(product)
  const fallbackImage = getFallbackImageByCategory(categoryName) || '/Bamboo-Board.png'

  // Priority: gallery images → product image_url → category fallback
  const galleryImages = product.images && product.images.length > 0 ? product.images : null
  const primaryImage =
    galleryImages?.find((img) => img.is_primary)?.image_url ??
    galleryImages?.[0]?.image_url ??
    product.image_url ??
    fallbackImage

  const [selected, setSelected] = useState(primaryImage)

  const allThumbs = galleryImages ?? (product.image_url ? [{ id: 'main', image_url: product.image_url, alt_text: product.name }] : [])

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Main image */}
      <div className="relative flex-1 min-h-[260px] overflow-hidden rounded-3xl sm:min-h-[420px]">
        <Image
          src={selected}
          alt={product.name || 'Product image'}
          fill
          unoptimized
          className="object-cover"
          onError={() => setSelected(fallbackImage)}
        />
      </div>

      {/* Thumbnails — only shown when there are multiple images */}
      {allThumbs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allThumbs.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(img.image_url)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                selected === img.image_url
                  ? 'border-primary'
                  : 'border-transparent hover:border-border'
              }`}
            >
              <Image
                src={img.image_url}
                alt={img.alt_text || product.name}
                fill
                unoptimized
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
