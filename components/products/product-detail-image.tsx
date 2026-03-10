'use client'

import { useEffect, useState } from 'react'
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
    }>
    category?: string | { id?: string; name?: string } | null
    categories?: { id: string; name: string } | null
  }
}

export default function ProductDetailImage({
  product,
}: ProductDetailImageProps) {
  const categoryName = getCategoryName(product)
  const fallbackImage = getFallbackImageByCategory(categoryName)

  // Force local category image first.
  // If you want DB images first later, I can change this.
  const preferredImage = fallbackImage

  const [imageSrc, setImageSrc] = useState(preferredImage || '/Bamboo-Board.png')

  useEffect(() => {
    setImageSrc(preferredImage || '/Bamboo-Board.png')
  }, [preferredImage])

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-3xl">
      <Image
        src={imageSrc}
        alt={product.name || 'Product image'}
        fill
        unoptimized
        className="object-cover"
        onError={() => {
          if (imageSrc !== '/Bamboo-Board.png') {
            setImageSrc('/Bamboo-Board.png')
          }
        }}
      />
    </div>
  )
}