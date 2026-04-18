// ============================================================================
// File path in your repo: app/admin/products/page.tsx
//
// Full rewrite after the catalog cleanup.
//
// Changes from the previous version:
//   1. Removed NuDoor special case grouping (NuDoor is now a normal product
//      with 3 variants, same pattern as everything else).
//   2. Removed product form fields that map to dropped DB columns:
//      length_mm, width_mm, thickness_mm, ply (these live on variants now).
//   3. Added moq_unit and order_increment fields to product form.
//   4. Added unit field to product form.
//   5. Default variant unit is now 'piece' (was 'sheet').
//   6. Variant save payload no longer sends currency or unit_price_old
//      (columns were dropped).
//   7. Variant form now has an in_stock toggle and an image_url input
//      so admins can set the hero image per variant.
//   8. The multi-image upload for variants still uses product_images table
//      (no changes needed there).
//   9. Product save payload only sends fields that exist in the new schema.
// ============================================================================

'use client'

import React, { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type RawProduct = {
  id?: string
  slug?: string | null
  name?: string | null
  description?: string | null
  image?: string | null
  image_url?: string | null
  base_price_usd?: number | string | null
  moq?: number | null
  moq_unit?: string | null
  order_increment?: number | null
  unit?: string | null
  category_id?: string | null
  is_active?: boolean | null
  is_featured?: boolean | null
  is_price_on_request?: boolean | null
  price_notes?: string | null
  categories?: { name?: string | null } | null
}

type Product = {
  id?: string
  slug: string
  name: string
  description: string
  image_url: string
  base_price_usd: number
  moq: number
  moq_unit: string
  order_increment: number
  unit: string
  category_id: string
  category_name: string
  is_active: boolean
  is_featured: boolean
  is_price_on_request: boolean
  price_notes: string
}

type RawVariant = {
  id?: string
  product_id?: string | null
  sku?: string | null
  thickness_mm?: number | null
  length_mm?: number | null
  width_mm?: number | null
  ply_count?: number | null
  size_label?: string | null
  finish?: string | null
  grade?: string | null
  unit?: string | null
  moq?: number | null
  sort_order?: number | null
  unit_price?: number | string | null
  base_price_usd?: number | string | null
  is_active?: boolean | null
  is_price_on_request?: boolean | null
  in_stock?: boolean | null
  price_notes?: string | null
  core_type?: string | null
  image_url?: string | null
  applications?: string[] | null
}

type Variant = {
  id: string
  product_id: string
  sku: string
  thickness_mm: number | null
  length_mm: number | null
  width_mm: number | null
  ply_count: number | null
  size_label: string
  finish: string
  grade: string
  unit: string
  moq: number | null
  sort_order: number | null
  unit_price: number | null
  base_price_usd: number | null
  is_active: boolean
  is_price_on_request: boolean
  in_stock: boolean
  price_notes: string
  core_type: string
  image_url: string
  applications: string[]
}

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------
const INITIAL_PRODUCT: Product = {
  slug: '',
  name: '',
  description: '',
  image_url: '',
  base_price_usd: 0,
  moq: 10,
  moq_unit: 'piece',
  order_increment: 1,
  unit: 'piece',
  category_id: '',
  category_name: '',
  is_active: true,
  is_featured: false,
  is_price_on_request: false,
  price_notes: '',
}

const INITIAL_VARIANT: Variant = {
  id: '',
  product_id: '',
  sku: '',
  thickness_mm: null,
  length_mm: null,
  width_mm: null,
  ply_count: null,
  size_label: '',
  finish: '',
  grade: '',
  unit: 'piece',
  moq: null,
  sort_order: null,
  unit_price: null,
  base_price_usd: null,
  is_active: true,
  is_price_on_request: false,
  in_stock: true,
  price_notes: '',
  core_type: '',
  image_url: '',
  applications: [],
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || 'Failed to load data')
  return data
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeProduct(raw: RawProduct): Product {
  return {
    id: raw.id,
    slug: raw.slug || '',
    name: raw.name || '',
    description: raw.description || '',
    image_url: raw.image_url || raw.image || '',
    base_price_usd: Number(raw.base_price_usd ?? 0) || 0,
    moq: Number(raw.moq ?? 1),
    moq_unit: raw.moq_unit || 'piece',
    order_increment: Number(raw.order_increment ?? 1),
    unit: raw.unit || 'piece',
    category_id: raw.category_id || '',
    category_name: raw.categories?.name || '',
    is_active: raw.is_active ?? true,
    is_featured: raw.is_featured ?? false,
    is_price_on_request: raw.is_price_on_request ?? false,
    price_notes: raw.price_notes || '',
  }
}

function normalizeVariant(raw: RawVariant): Variant {
  return {
    id: raw.id || '',
    product_id: raw.product_id || '',
    sku: raw.sku || '',
    thickness_mm: toNum(raw.thickness_mm),
    length_mm: toNum(raw.length_mm),
    width_mm: toNum(raw.width_mm),
    ply_count: toNum(raw.ply_count),
    size_label: raw.size_label || '',
    finish: raw.finish || '',
    grade: raw.grade || '',
    unit: raw.unit || 'piece',
    moq: toNum(raw.moq),
    sort_order: toNum(raw.sort_order),
    unit_price: toNum(raw.unit_price),
    base_price_usd: toNum(raw.base_price_usd),
    is_active: raw.is_active ?? true,
    is_price_on_request: raw.is_price_on_request ?? false,
    in_stock: raw.in_stock ?? true,
    price_notes: raw.price_notes || '',
    core_type: raw.core_type || '',
    image_url: raw.image_url || '',
    applications: raw.applications || [],
  }
}

function formatVariantSize(variant: Variant) {
  if (variant.size_label) return variant.size_label
  const parts = [
    variant.length_mm ? `${variant.length_mm}` : null,
    variant.width_mm ? `${variant.width_mm}` : null,
    variant.thickness_mm ? `${variant.thickness_mm}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? `${parts.join(' x ')} mm` : '-'
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function AdminProductsPage() {
  const { toast } = useToast()

  const {
    data: productsData,
    isLoading: isLoadingProducts,
    error: productsError,
    mutate: mutateProducts,
  } = useSWR<RawProduct[]>('/api/admin/products?includeInactive=true', fetcher)

  const {
    data: variantsData,
    isLoading: isLoadingVariants,
    error: variantsError,
    mutate: mutateVariants,
  } = useSWR<RawVariant[]>('/api/admin/product-variants?includeInactive=true', fetcher)

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVariantSaving, setIsVariantSaving] = useState(false)

  const [currentProduct, setCurrentProduct] = useState<Product>(INITIAL_PRODUCT)
  const [currentVariant, setCurrentVariant] = useState<Variant>(INITIAL_VARIANT)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [variantImageFiles, setVariantImageFiles] = useState<File[]>([])
  const [existingVariantImages, setExistingVariantImages] = useState<any[]>([])
  const [isUploadingVariantImages, setIsUploadingVariantImages] = useState(false)
  const variantImageInputRef = useRef<HTMLInputElement>(null)

  const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([])
  const multiImageInputRef = useRef<HTMLInputElement>(null)
  const [existingProductImages, setExistingProductImages] = useState<any[]>([])

  const products = useMemo(
    () => (Array.isArray(productsData) ? productsData.map(normalizeProduct) : []),
    [productsData],
  )

  const variants = useMemo(
    () => (Array.isArray(variantsData) ? variantsData.map(normalizeVariant) : []),
    [variantsData],
  )

  const variantsByProductId = useMemo(() => {
    const grouped: Record<string, Variant[]> = {}
    const getCoreRank = (v: Variant) => {
      const c = (v.core_type || '').toLowerCase()
      if (c.includes('horizontal')) return 0
      if (c.includes('vertical')) return 1
      return 2
    }
    const getThick = (v: Variant) => v.thickness_mm ?? Number.POSITIVE_INFINITY

    for (const v of variants) {
      if (!v.product_id) continue
      if (!grouped[v.product_id]) grouped[v.product_id] = []
      grouped[v.product_id].push(v)
    }

    for (const pid of Object.keys(grouped)) {
      grouped[pid] = grouped[pid].sort((a, b) => {
        const sortOrderDiff = (a.sort_order ?? 999) - (b.sort_order ?? 999)
        if (sortOrderDiff !== 0) return sortOrderDiff
        const coreRankDiff = getCoreRank(a) - getCoreRank(b)
        if (coreRankDiff !== 0) return coreRankDiff
        const thickDiff = getThick(a) - getThick(b)
        if (thickDiff !== 0) return thickDiff
        return (a.sku || '').localeCompare(b.sku || '')
      })
    }

    return grouped
  }, [variants])

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return products
    return products.filter((p) => {
      const selfMatch =
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category_name.toLowerCase().includes(q)
      const variantMatch = (variantsByProductId[p.id || ''] || []).some((v) =>
        [v.sku, v.core_type, v.finish, v.grade, v.size_label]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q)),
      )
      return selfMatch || variantMatch
    })
  }, [products, searchQuery, variantsByProductId])

  const toggleExpanded = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // ---------------------------------------------------------------------------
  // Product modal handlers
  // ---------------------------------------------------------------------------
  const fetchProductImages = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/images`)
      if (res.ok) {
        const data = await res.json()
        setExistingProductImages(data.images || [])
      }
    } catch (e) {
      console.error('Failed to fetch product images:', e)
    }
  }

  const handleOpenAdd = () => {
    setCurrentProduct(INITIAL_PRODUCT)
    setImageFile(null)
    setImagePreview(null)
    setMultipleImageFiles([])
    setExistingProductImages([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (multiImageInputRef.current) multiImageInputRef.current.value = ''
    setIsProductModalOpen(true)
  }

  const handleOpenEdit = (product: Product) => {
    setCurrentProduct(product)
    setImageFile(null)
    setImagePreview(product.image_url || null)
    setMultipleImageFiles([])
    setExistingProductImages([])
    if (product.id) fetchProductImages(product.id)
    setIsProductModalOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 5MB', variant: 'destructive' })
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setCurrentProduct({ ...currentProduct, image_url: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleMultipleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: `${f.name} over 5MB`, variant: 'destructive' })
        return false
      }
      return true
    })
    setMultipleImageFiles((prev) => [...prev, ...valid])
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      let imageUrl = currentProduct.image_url

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json().catch(() => null)
        if (!uploadRes.ok) throw new Error(uploadData?.error || 'Image upload failed')
        imageUrl = uploadData.url
      }

      // Build a clean payload with only fields that exist in the new schema
      const payload: any = {
        id: currentProduct.id,
        slug: currentProduct.slug,
        name: currentProduct.name,
        description: currentProduct.description,
        image_url: imageUrl,
        base_price_usd: currentProduct.base_price_usd,
        moq: currentProduct.moq,
        moq_unit: currentProduct.moq_unit,
        order_increment: currentProduct.order_increment,
        unit: currentProduct.unit,
        category_id: currentProduct.category_id || null,
        is_active: currentProduct.is_active,
        is_featured: currentProduct.is_featured,
        is_price_on_request: currentProduct.is_price_on_request,
        price_notes: currentProduct.price_notes,
      }

      const method = currentProduct.id ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saved = await res.json().catch(() => null)
      if (!res.ok) throw new Error(saved?.error || 'Save failed')

      if (multipleImageFiles.length > 0 && saved?.id) {
        const formData = new FormData()
        multipleImageFiles.forEach((f) => formData.append('images', f))
        await fetch(`/api/products/${saved.id}/images`, { method: 'POST', body: formData })
      }

      await mutateProducts()
      setIsProductModalOpen(false)
      setCurrentProduct(INITIAL_PRODUCT)
      setImageFile(null)
      setImagePreview(null)
      setMultipleImageFiles([])
      setExistingProductImages([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (multiImageInputRef.current) multiImageInputRef.current.value = ''
      toast({ title: 'Success', description: `Product ${currentProduct.id ? 'updated' : 'created'}` })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      const res = await fetch(`/api/admin/products?id=${productToDelete}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Delete failed')
      await mutateProducts()
      if (data?.mode === 'soft_fallback') {
        toast({
          title: 'Marked inactive',
          description: data.note || 'Hard delete was blocked, product marked inactive instead.',
        })
      } else {
        toast({ title: 'Deleted', description: 'Product and its variants removed.' })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not delete',
        variant: 'destructive',
      })
    } finally {
      setIsDeleteAlertOpen(false)
      setProductToDelete(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Variant modal handlers
  // ---------------------------------------------------------------------------
  const handleOpenVariantEdit = async (variant: Variant) => {
    setCurrentVariant(variant)
    setVariantImageFiles([])
    setExistingVariantImages([])
    if (variantImageInputRef.current) variantImageInputRef.current.value = ''

    if (variant.id) {
      try {
        const res = await fetch(`/api/admin/variant-images?variantId=${variant.id}`)
        if (res.ok) {
          const data = await res.json()
          setExistingVariantImages(data.images || [])
        }
      } catch {}
    }
    setIsVariantModalOpen(true)
  }

  const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: `${f.name} over 5MB`, variant: 'destructive' })
        return false
      }
      return true
    })
    setVariantImageFiles((prev) => [...prev, ...valid])
  }

  const handleDeleteVariantImage = async (imageId: string) => {
    try {
      await fetch(`/api/admin/variant-images?imageId=${imageId}`, { method: 'DELETE' })
      setExistingVariantImages((prev) => prev.filter((img) => img.id !== imageId))
    } catch {
      toast({ title: 'Error', description: 'Could not delete image', variant: 'destructive' })
    }
  }

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVariantSaving(true)

    try {
      // Auto-regenerate size_label if all three dims are present
      const autoSize =
        currentVariant.length_mm && currentVariant.width_mm && currentVariant.thickness_mm
          ? `${currentVariant.length_mm} mm x ${currentVariant.width_mm} mm x ${currentVariant.thickness_mm} mm`
          : currentVariant.size_label

      // Build clean payload. Omit fields from dropped columns.
      const payload: any = {
        id: currentVariant.id,
        product_id: currentVariant.product_id,
        sku: currentVariant.sku,
        size_label: autoSize,
        thickness_mm: currentVariant.thickness_mm,
        length_mm: currentVariant.length_mm,
        width_mm: currentVariant.width_mm,
        ply_count: currentVariant.ply_count,
        finish: currentVariant.finish,
        grade: currentVariant.grade,
        unit: currentVariant.unit,
        moq: currentVariant.moq,
        sort_order: currentVariant.sort_order,
        unit_price: currentVariant.is_price_on_request ? null : currentVariant.unit_price,
        base_price_usd: currentVariant.is_price_on_request ? null : currentVariant.base_price_usd,
        is_active: currentVariant.is_active,
        is_price_on_request: currentVariant.is_price_on_request,
        in_stock: currentVariant.in_stock,
        price_notes: currentVariant.price_notes,
        core_type: currentVariant.core_type,
        image_url: currentVariant.image_url,
      }

      const res = await fetch('/api/admin/product-variants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })
      const saved = await res.json().catch(() => null)
      if (!res.ok) throw new Error(saved?.error || 'Variant save failed')

      await mutateVariants()

      if (variantImageFiles.length > 0 && currentVariant.product_id) {
        setIsUploadingVariantImages(true)
        try {
          const formData = new FormData()
          formData.append('variantId', currentVariant.id)
          formData.append('productId', currentVariant.product_id)
          variantImageFiles.forEach((f) => formData.append('images', f))
          const uploadRes = await fetch('/api/admin/variant-images', {
            method: 'POST',
            body: formData,
          })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            setExistingVariantImages((prev) => [...prev, ...(uploadData.images || [])])
          }
        } finally {
          setIsUploadingVariantImages(false)
          setVariantImageFiles([])
          if (variantImageInputRef.current) variantImageInputRef.current.value = ''
        }
      }

      setIsVariantModalOpen(false)
      setCurrentVariant(INITIAL_VARIANT)
      setVariantImageFiles([])
      setExistingVariantImages([])
      toast({ title: 'Success', description: 'Variant updated' })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsVariantSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isLoading = isLoadingProducts || isLoadingVariants
  const error = productsError || variantsError

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Products</h1>
          <p className="mt-1 text-muted-foreground">
            {filteredProducts.length} products, {variants.length} variants
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(error as Error).message}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by product, slug, SKU, finish, core..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Base Price</th>
                  <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredProducts.map((product) => {
                  const productVariants = variantsByProductId[product.id || ''] || []
                  const expanded = !!expandedProducts[product.id || '']
                  const hasVariants = productVariants.length > 0

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                          <div className="flex items-center gap-2">
                            {hasVariants ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(product.id!)}
                                className="rounded p-0.5 hover:bg-muted"
                              >
                                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            ) : (
                              <span className="inline-block w-5" />
                            )}
                            <span>{product.slug || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-10 w-10 rounded border border-border object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{product.name || 'Untitled'}</p>
                              <p className="text-xs text-muted-foreground">
                                {hasVariants
                                  ? `${productVariants.length} variant${productVariants.length === 1 ? '' : 's'}`
                                  : 'No variants'}
                                {product.moq ? ` , MOQ ${product.moq} ${product.moq_unit}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                          {product.category_name || '-'}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                          {product.is_price_on_request
                            ? 'Quote'
                            : product.base_price_usd > 0
                            ? `USD ${product.base_price_usd.toLocaleString()}`
                            : '-'}
                        </td>

                        <td className="hidden px-4 py-3 text-center md:table-cell">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              product.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(product)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                setProductToDelete(product.id!)
                                setIsDeleteAlertOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {expanded &&
                        productVariants.map((variant) => (
                          <tr key={variant.id} className="border-t border-border bg-muted/20">
                            <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                              <span className="ml-7">{variant.sku || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {variant.image_url && (
                                  <img
                                    src={variant.image_url}
                                    alt={variant.sku}
                                    className="h-8 w-8 rounded border border-border object-cover"
                                  />
                                )}
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">{formatVariantSize(variant)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {[variant.core_type, variant.ply_count ? `${variant.ply_count} ply` : null, variant.finish, variant.grade]
                                      .filter(Boolean)
                                      .join(' , ')}
                                    {!variant.in_stock ? ' , out of stock' : ''}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                              {variant.unit} , MOQ {variant.moq || '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                              {variant.is_price_on_request || variant.unit_price === null
                                ? 'Quote'
                                : `USD ${Number(variant.unit_price).toLocaleString()}`}
                            </td>
                            <td className="hidden px-4 py-3 text-center md:table-cell">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs',
                                  variant.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {variant.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenVariantEdit(variant)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  )
                })}

                {!isLoading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentProduct.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              Base price is stored in USD. The public site converts to the visitor's local currency.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="grid gap-4 py-4">
            {/* Hero image */}
            <div className="flex flex-col gap-2">
              <Label>Product Hero Image</Label>
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/50">
                  {imagePreview ? (
                    <>
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP under 5MB.</p>
                </div>
              </div>
            </div>

            {/* Name + slug */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={currentProduct.slug}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, slug: e.target.value })}
                  placeholder="nubam-boards"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={currentProduct.name}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Base price + unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Price (USD) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentProduct.base_price_usd}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, base_price_usd: Number(e.target.value) || 0 })
                  }
                  disabled={currentProduct.is_price_on_request}
                  required={!currentProduct.is_price_on_request}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={currentProduct.unit}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, unit: e.target.value })}
                  placeholder="piece"
                />
              </div>
            </div>

            {/* MOQ, MOQ unit, order increment */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>MOQ</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentProduct.moq}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, moq: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>MOQ Unit</Label>
                <Input
                  value={currentProduct.moq_unit}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, moq_unit: e.target.value })}
                  placeholder="piece"
                />
              </div>
              <div className="space-y-2">
                <Label>Order Increment</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentProduct.order_increment}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, order_increment: Number(e.target.value) || 1 })
                  }
                />
                <p className="text-xs text-muted-foreground">Orders must be multiples of this. Use 1 for no restriction.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={currentProduct.description}
                onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Price Notes</Label>
              <Input
                value={currentProduct.price_notes}
                onChange={(e) => setCurrentProduct({ ...currentProduct, price_notes: e.target.value })}
                placeholder="Optional notes shown next to the price"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentProduct.is_active}
                  onCheckedChange={(checked) => setCurrentProduct({ ...currentProduct, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentProduct.is_featured}
                  onCheckedChange={(checked) => setCurrentProduct({ ...currentProduct, is_featured: checked })}
                />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentProduct.is_price_on_request}
                  onCheckedChange={(checked) =>
                    setCurrentProduct({ ...currentProduct, is_price_on_request: checked })
                  }
                />
                <Label>Price on request</Label>
              </div>
            </div>

            {/* Gallery */}
            <div className="border-t pt-4">
              <Label className="mb-3 block">Product Gallery Images</Label>
              {currentProduct.id && existingProductImages.length > 0 && (
                <div className="mb-4 border-b pb-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Existing Images ({existingProductImages.length})
                  </p>
                  <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto">
                    {existingProductImages.map((image) => (
                      <div key={image.id} className="relative h-24 w-24 overflow-hidden rounded border border-border bg-muted">
                        <img src={image.image_url} alt={image.alt_text || ''} className="h-full w-full object-cover" />
                        {image.is_primary && (
                          <div className="absolute left-0.5 top-0.5 rounded bg-primary/90 px-1.5 py-0.5 text-xs text-white">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Input
                ref={multiImageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleImageChange}
                className="cursor-pointer"
              />
              {multipleImageFiles.length > 0 && (
                <div className="mt-2 grid max-h-32 grid-cols-3 gap-2 overflow-y-auto">
                  {multipleImageFiles.map((file, index) => (
                    <div key={index} className="relative h-24 w-24 overflow-hidden rounded border border-border bg-muted">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setMultipleImageFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Variant modal */}
      <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
            <DialogDescription>Prices in USD. Size label is auto-generated from length x width x thickness.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVariant} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variant SKU</Label>
                <Input
                  value={currentVariant.sku}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={currentVariant.unit}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Length (mm)</Label>
                <Input
                  type="number"
                  value={currentVariant.length_mm ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      length_mm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <Input
                  type="number"
                  value={currentVariant.width_mm ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      width_mm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Thickness (mm)</Label>
                <Input
                  type="number"
                  value={currentVariant.thickness_mm ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      thickness_mm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ply Count</Label>
                <Input
                  type="number"
                  value={currentVariant.ply_count ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      ply_count: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Core Type</Label>
                <Input
                  value={currentVariant.core_type}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, core_type: e.target.value })}
                  placeholder="Horizontal Core"
                />
              </div>
              <div className="space-y-2">
                <Label>MOQ</Label>
                <Input
                  type="number"
                  value={currentVariant.moq ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      moq: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Finish</Label>
                <Input
                  value={currentVariant.finish}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, finish: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input
                  value={currentVariant.grade}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, grade: e.target.value })}
                  placeholder="Light, Composite, Premium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Price (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentVariant.base_price_usd ?? ''}
                  disabled={currentVariant.is_price_on_request}
                  onChange={(e) => {
                    const n = e.target.value === '' ? null : Number(e.target.value)
                    setCurrentVariant({ ...currentVariant, base_price_usd: n, unit_price: n })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={currentVariant.sort_order ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      sort_order: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Variant Hero Image URL</Label>
              <Input
                value={currentVariant.image_url}
                onChange={(e) => setCurrentVariant({ ...currentVariant, image_url: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                The main image shown when this variant is selected on the public product page.
                Leave blank to use the parent product image.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Price Notes</Label>
              <Textarea
                rows={2}
                value={currentVariant.price_notes}
                onChange={(e) => setCurrentVariant({ ...currentVariant, price_notes: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentVariant.is_active}
                  onCheckedChange={(checked) => setCurrentVariant({ ...currentVariant, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentVariant.in_stock}
                  onCheckedChange={(checked) => setCurrentVariant({ ...currentVariant, in_stock: checked })}
                />
                <Label>In stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentVariant.is_price_on_request}
                  onCheckedChange={(checked) =>
                    setCurrentVariant({
                      ...currentVariant,
                      is_price_on_request: checked,
                      unit_price: checked ? null : currentVariant.unit_price,
                      base_price_usd: checked ? null : currentVariant.base_price_usd,
                    })
                  }
                />
                <Label>Price on request</Label>
              </div>
            </div>

            {/* Variant images */}
            <div className="border-t pt-4 space-y-3">
              <Label className="block">Variant Gallery Images</Label>
              <p className="text-xs text-muted-foreground">
                Additional images shown in the carousel when this variant is selected.
              </p>

              {existingVariantImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {existingVariantImages.map((img) => (
                    <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={img.image_url} alt={img.alt_text || ''} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteVariantImage(img.id)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Input
                ref={variantImageInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleVariantImageChange}
                className="cursor-pointer"
              />

              {variantImageFiles.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {variantImageFiles.map((f, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setVariantImageFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsVariantModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isVariantSaving || isUploadingVariantImages}>
                {isVariantSaving || isUploadingVariantImages ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingVariantImages ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Variant
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product, its variants, and its images.
              Historical quotes that referenced this product will keep their text
              snapshots but lose the live product link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
