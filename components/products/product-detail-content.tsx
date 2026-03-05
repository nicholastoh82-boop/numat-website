'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Plus, Minus, ShoppingCart, Leaf, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ProductImage {
  id: string
  product_id: string
  image_url: string
  alt_text?: string
  display_order: number
  created_at: string
}

interface ProductDetailProps {
  product: {
    id: string
    sku: string
    name: string
    title: string
    slug?: string
    description: string
    category: string
    size: string
    thickness: number
    thickness_mm: number
    base_price: number
    price: number
    moq: number
    min_order_qty: number
    lead_time_days: number
    is_active: boolean
    is_featured: boolean
    unit: string
    ply: string
    image_url: string
    images: ProductImage[]
    created_at: string
    updated_at: string
  }
}

export function ProductDetailContent({ product }: ProductDetailProps) {
  const minQty = product.min_order_qty ?? 1
  const [quantity, setQuantity] = useState(minQty)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const { addItem, openCart } = useCartStore()
  const { toast } = useToast()

  // 1. Combine Main Image and Gallery Images into a single array
  const allImages = useMemo(() => {
    const galleryImages = product.images && Array.isArray(product.images) ? product.images : []

    // Create an array starting with the main image
    const combined = []

    if (product.image_url) {
      combined.push({
        id: 'main',
        image_url: product.image_url,
        alt_text: product.name,
      })
    }
    console.log('galleryImages :>> ', galleryImages);
    // Add gallery images, avoiding duplicates of the main image URL
    galleryImages.forEach(img => {
      console.log('img :>> ', img);
      if (img.image_url !== product.image_url) {
        combined.push(img)
      }
    })

    return combined.length > 0 ? combined : [{ id: 'placeholder', image_url: '/placeholder-product.jpg', alt_text: 'No image available' }]
  }, [product])

  const currentImage = allImages[selectedImageIndex]

  const handleAddToCart = () => {
    if (quantity < minQty) {
      toast({
        title: 'Minimum Order Quantity',
        description: `Minimum order quantity is ${minQty} ${product.unit || 'pcs'}.`,
        variant: 'destructive',
      })
      return
    }
    addItem({
      id: product.id,
      name: product.name || product.title,
      specs: `${product.thickness_mm || product.thickness || ''}mm x ${product.size || ''} | ${product.ply || ''} ply`,
      quantity,
      unitPrice: product.price || product.base_price || 0,
      minOrderQty: minQty,
      unit: product.unit || 'pcs',
      imageUrl: product.image_url,
    })
    toast({
      title: 'Added to Quote',
      description: `${quantity}x ${product.name || product.title} added to your request.`,
    })
    openCart()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
      <Link href="/products" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8 w-fit transition-colors">
        <ChevronLeft className="w-4 h-4" />
        <span className="font-medium">Back to Products</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT COLUMN: IMAGE GALLERY */}
        <div className="space-y-4">
          {/* Main Preview Image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
            {currentImage?.image_url ? (
              <Image
                src={currentImage.image_url}
                alt={currentImage.alt_text || product.name}
                fill
                className="object-cover transition-all duration-500 ease-in-out"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Thumbnail Strip (The "Gallery") */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((image, index) => (
                <button
                  key={image.id || index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                    selectedImageIndex === index
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-primary/50"
                  )}
                >
                  <Image
                    src={image.image_url}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PRODUCT DETAILS */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-mono text-muted-foreground mb-1">SKU: {product.sku}</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              {product.name || product.title}
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                {product.category}
              </span>
              {product.is_featured && (
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Thickness</p>
              <p className="font-medium">{product.thickness_mm || product.thickness} mm</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Dimensions</p>
              <p className="font-medium">{product.size}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Ply Count</p>
              <p className="font-medium">{product.ply}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Lead Time</p>
              <p className="font-medium">{product.lead_time_days} Days</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.description || "No description provided for this product."}
            </p>
          </div>

          <div className="mt-4 p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">
                PHP {(product.price || product.base_price || 0).toLocaleString()}
              </span>
              <span className="text-muted-foreground font-medium">/ {product.unit || 'pc'}</span>
            </div>
            <p className="text-xs text-primary/70 mt-1 font-medium">Minimum Order: {minQty} {product.unit || 'pcs'}</p>
          </div>

          {/* Add to Quote Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center h-12 border border-border rounded-lg bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none h-full"
                  onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                  disabled={quantity <= minQty}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="w-12 text-center font-bold">{quantity}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none h-full"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleAddToCart}
                className="flex-1 h-12 gap-2 text-base font-bold shadow-lg shadow-primary/20"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Quote
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}