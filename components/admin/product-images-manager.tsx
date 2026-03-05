'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text?: string
  display_order: number
  created_at: string
}

interface ProductImagesManagerProps {
  productId: string
}

export function ProductImagesManager({ productId }: ProductImagesManagerProps) {
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchImages()
  }, [productId])

  const fetchImages = async () => {
    try {
      const res = await fetch(`/api/products/${productId}/images`)
      if (!res.ok) throw new Error('Failed to fetch images')
      const data = await res.json()
      setImages(data)
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    setDeletingImageId(imageId)
    try {
      const res = await fetch(`/api/products/${productId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      })

      if (!res.ok) throw new Error('Failed to delete image')

      setImages(images.filter(img => img.id !== imageId))
      toast({
        title: 'Success',
        description: 'Image deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete image',
        variant: 'destructive',
      })
    } finally {
      setDeletingImageId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">No additional images uploaded yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Add images using the form above to showcase your product from multiple angles.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Uploaded Images ({images.length})</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative w-full aspect-square rounded border border-border overflow-hidden bg-muted group"
          >
            <Image
              src={image.image_url}
              alt={image.alt_text || 'Product image'}
              fill
              className="object-cover"
            />
            <button
              onClick={() => handleDeleteImage(image.id)}
              disabled={deletingImageId === image.id}
              className="absolute inset-0 bg-black/0 hover:bg-black/50 group-hover:bg-black/50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete image"
            >
              {deletingImageId === image.id ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
