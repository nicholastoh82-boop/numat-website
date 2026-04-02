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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type RawProduct = {
  id?: string
  sku?: string | null
  slug?: string | null
  title?: string | null
  name?: string | null
  size?: string | null
  length_mm?: number | null
  width_mm?: number | null
  thickness_mm?: number | null
  ply?: string | null
  price?: number | null
  unit_price?: number | null
  base_price?: number | null
  base_price_usd?: number | null
  moq?: number | null
  min_order_qty?: number | null
  lead_time_days?: number | null
  category?: string | null
  category_id?: string | null
  description?: string | null
  image?: string | null
  image_url?: string | null
  is_active?: boolean | null
  is_featured?: boolean | null
  categories?: { name?: string | null } | null
}

type Product = {
  id?: string
  sku: string
  title: string
  size: string
  length_mm: number | null
  width_mm: number | null
  thickness_mm: number | null
  ply: string
  price: number
  base_price?: number
  moq: number
  lead_time_days: number
  category: string
  category_id: string
  description: string
  image: string
  is_active: boolean
  is_featured: boolean
  categories?: { name: string }
}

type RawVariant = {
  id?: string
  product?: string | null
  product_id?: string | null
  sku?: string | null
  thickness_mm?: number | null
  length_mm?: number | null
  width_mm?: number | null
  size_label?: string | null
  finish?: string | null
  grade?: string | null
  unit?: string | null
  moq?: number | null
  currency?: string | null
  unit_price?: number | null
  unit_price_old?: number | null
  base_price_usd?: number | null
  is_active?: boolean | null
  is_price_on_request?: boolean | null
  price_notes?: string | null
  core_type?: string | null
}

type Variant = {
  id: string
  product_id: string
  sku: string
  thickness_mm: number | null
  length_mm: number | null
  width_mm: number | null
  finish: string
  grade: string
  unit: string
  moq: number | null
  currency: string
  unit_price: number | null
  unit_price_old: number | null
  is_active: boolean
  is_price_on_request: boolean
  price_notes: string
  core_type: string
}

type DisplayProduct = Product & {
  displayId: string
  displaySku: string
  displayTitle: string
  childProducts: Product[]
  sourceProductIds: string[]
}

const INITIAL_PRODUCT: Product = {
  sku: '',
  title: '',
  size: '',
  length_mm: null,
  width_mm: null,
  thickness_mm: null,
  ply: '',
  price: 0,
  moq: 10,
  lead_time_days: 10,
  category: '',
  category_id: '',
  description: '',
  image: '',
  is_active: true,
  is_featured: false,
}

const INITIAL_VARIANT: Variant = {
  id: '',
  product_id: '',
  sku: '',
  thickness_mm: null,
  length_mm: null,
  width_mm: null,
  finish: '',
  grade: '',
  unit: 'sheet',
  moq: 1,
  currency: 'USD',
  unit_price: null,
  unit_price_old: null,
  is_active: true,
  is_price_on_request: false,
  price_notes: '',
  core_type: '',
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    cache: 'no-store',
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || 'Failed to load data')
  }

  return data
}

function normalizeProduct(raw: RawProduct): Product {
  const usdPrice = Number(
    raw.price ?? raw.unit_price ?? raw.base_price ?? raw.base_price_usd ?? 0
  )

  return {
    id: raw.id,
    sku: raw.sku || raw.slug || raw.id || '',
    title: raw.title || raw.name || '',
    size: raw.size || '',
    length_mm: raw.length_mm === null || raw.length_mm === undefined ? null : Number(raw.length_mm),
    width_mm: raw.width_mm === null || raw.width_mm === undefined ? null : Number(raw.width_mm),
    thickness_mm: raw.thickness_mm === null || raw.thickness_mm === undefined ? null : Number(raw.thickness_mm),
    ply: raw.ply || '',
    price: usdPrice,
    base_price: usdPrice,
    moq: Number(raw.moq ?? raw.min_order_qty ?? 1),
    lead_time_days: Number(raw.lead_time_days ?? 10),
    category: raw.category || raw.categories?.name || '',
    category_id: raw.category_id || '',
    description: raw.description || '',
    image: raw.image || raw.image_url || '',
    is_active: raw.is_active ?? true,
    is_featured: raw.is_featured ?? false,
    categories: raw.categories?.name ? { name: raw.categories.name } : undefined,
  }
}

function normalizeVariant(raw: RawVariant): Variant {
  return {
    id: raw.id || '',
    product_id: raw.product_id || raw.product || '',
    sku: raw.sku || '',
    thickness_mm:
      raw.thickness_mm === null || raw.thickness_mm === undefined
        ? null
        : Number(raw.thickness_mm),
    length_mm:
      raw.length_mm === null || raw.length_mm === undefined
        ? null
        : Number(raw.length_mm),
    width_mm:
      raw.width_mm === null || raw.width_mm === undefined
        ? null
        : Number(raw.width_mm),
    finish: raw.finish || '',
    grade: raw.grade || '',
    unit: raw.unit || 'sheet',
    moq: raw.moq === null || raw.moq === undefined ? null : Number(raw.moq),
    currency: raw.currency || 'USD',
    unit_price:
      raw.unit_price === null || raw.unit_price === undefined
        ? null
        : Number(raw.unit_price),
    unit_price_old:
      raw.unit_price_old === null || raw.unit_price_old === undefined
        ? null
        : Number(raw.unit_price_old),
    is_active: raw.is_active ?? true,
    is_price_on_request: raw.is_price_on_request ?? false,
    price_notes: raw.price_notes || '',
    core_type: raw.core_type || '',
  }
}

function formatVariantSize(variant: Variant) {
  const parts = [
    variant.length_mm ? `${variant.length_mm}` : null,
    variant.width_mm ? `${variant.width_mm}` : null,
  ].filter(Boolean)

  const size = parts.length > 0 ? `${parts.join(' × ')} mm` : ''
  const thickness = variant.thickness_mm ? `${variant.thickness_mm} mm` : ''

  if (size && thickness) return `${size} · ${thickness}`
  return size || thickness || '-'
}

function isNuDoorProduct(product: Product) {
  const sku = product.sku.toLowerCase()
  const title = product.title.toLowerCase()

  return (
    sku === 'nudoor-light' ||
    sku === 'nudoor-composite' ||
    sku === 'nudoor-premium' ||
    title === 'nudoor light' ||
    title === 'nudoor composite' ||
    title === 'nudoor premium'
  )
}

function canDeleteProduct(
  product: Product,
  options?: { isGroupedRow?: boolean }
) {
  if (!product.id) return false
  if (options?.isGroupedRow) return false
  if (isNuDoorProduct(product)) return false
  return true
}

function buildDisplayProducts(products: Product[]): DisplayProduct[] {
  const nudoorProducts = products.filter(isNuDoorProduct)
  const otherProducts = products.filter((product) => !isNuDoorProduct(product))

  const mappedOthers: DisplayProduct[] = otherProducts.map((product) => ({
    ...product,
    displayId: product.id || product.sku,
    displaySku: product.sku,
    displayTitle: product.title,
    childProducts: [],
    sourceProductIds: product.id ? [product.id] : [],
  }))

  if (nudoorProducts.length === 0) {
    return mappedOthers
  }

  const nudoorBase =
    nudoorProducts.find((product) => product.sku.toLowerCase() === 'nudoor-light') ||
    nudoorProducts[0]

  const nudoorGroup: DisplayProduct = {
    ...nudoorBase,
    displayId: 'nudoor-group',
    displaySku: 'nudoor',
    displayTitle: 'NuDoor',
    childProducts: nudoorProducts,
    sourceProductIds: nudoorProducts
      .map((product) => product.id)
      .filter((id): id is string => Boolean(id)),
  }

  return [nudoorGroup, ...mappedOthers]
}

export default function AdminProductsPage() {
  const { toast } = useToast()

  const {
    data: productsData,
    isLoading: isLoadingProducts,
    error: productsError,
    mutate: mutateProducts,
  } = useSWR<RawProduct[]>(
    '/api/admin/products?includeInactive=true',
    fetcher
  )

  const variantsApiUrl = '/api/admin/product-variants?includeInactive=true'

  const {
    data: variantsData,
    isLoading: isLoadingVariants,
    error: variantsError,
    mutate: mutateVariants,
  } = useSWR<RawVariant[]>(variantsApiUrl, fetcher)

  const { data: categoriesData } = useSWR<{ id: string; name: string }[]>(
    '/api/categories',
    fetcher
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>(
    {}
  )

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

  const [multipleImageFiles, setMultipleImageFiles] = useState<File[]>([])
  const multiImageInputRef = useRef<HTMLInputElement>(null)
  const [existingProductImages, setExistingProductImages] = useState<any[]>([])

  const products = useMemo(() => {
    return Array.isArray(productsData) ? productsData.map(normalizeProduct) : []
  }, [productsData])

  const variants = useMemo(() => {
    return Array.isArray(variantsData) ? variantsData.map(normalizeVariant) : []
  }, [variantsData])

  const displayProducts = useMemo(() => {
    return buildDisplayProducts(products)
  }, [products])

  const variantsByProductId = useMemo(() => {
  const grouped: Record<string, Variant[]> = {}

  const getCoreRank = (variant: Variant) => {
    const core = (variant.core_type || '').toLowerCase()

    if (core.includes('horizontal')) return 0
    if (core.includes('vertical')) return 1
    return 2
  }

  const getThickness = (variant: Variant) => {
    return variant.thickness_mm ?? Number.POSITIVE_INFINITY
  }

  for (const variant of variants) {
    if (!variant.product_id) continue
    if (!grouped[variant.product_id]) grouped[variant.product_id] = []
    grouped[variant.product_id].push(variant)
  }

  for (const productId of Object.keys(grouped)) {
    grouped[productId] = grouped[productId].sort((a, b) => {
      const coreRankDiff = getCoreRank(a) - getCoreRank(b)
      if (coreRankDiff !== 0) return coreRankDiff

      const thicknessDiff = getThickness(a) - getThickness(b)
      if (thicknessDiff !== 0) return thicknessDiff

      return a.sku.localeCompare(b.sku)
    })
  }

  return grouped
}, [variants])

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return displayProducts

    return displayProducts.filter((product) => {
      const selfMatch =
        product.displayTitle.toLowerCase().includes(q) ||
        product.displaySku.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q)

      const childMatch = product.childProducts.some((child) => {
        return (
          child.title.toLowerCase().includes(q) ||
          child.sku.toLowerCase().includes(q)
        )
      })

      const variantMatch = product.sourceProductIds.some((productId) => {
        const productVariants = variantsByProductId[productId] || []
        return productVariants.some((variant) => {
          return (
            variant.sku.toLowerCase().includes(q) ||
            variant.core_type.toLowerCase().includes(q) ||
            variant.finish.toLowerCase().includes(q) ||
            variant.grade.toLowerCase().includes(q)
          )
        })
      })

      return selfMatch || childMatch || variantMatch
    })
  }, [displayProducts, searchQuery, variantsByProductId])

  const toggleExpanded = (displayId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [displayId]: !prev[displayId],
    }))
  }

  const fetchProductImages = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/images`)
      if (res.ok) {
        const data = await res.json()
        setExistingProductImages(data.images || [])
      }
    } catch (error) {
      console.error('Failed to fetch product images:', error)
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
    setImagePreview(product.image || null)
    setMultipleImageFiles([])
    setExistingProductImages([])

    if (product.id) {
      fetchProductImages(product.id)
    }

    setIsProductModalOpen(true)
  }

  const handleOpenVariantEdit = (variant: Variant) => {
    setCurrentVariant(variant)
    setIsVariantModalOpen(true)
  }

  const handleOpenDelete = (id: string) => {
    setProductToDelete(id)
    setIsDeleteAlertOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setCurrentProduct({ ...currentProduct, image: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleMultipleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: `${file.name} is larger than 5MB`,
          variant: 'destructive',
        })
        return false
      }
      return true
    })

    setMultipleImageFiles((prev) => [...prev, ...validFiles])
  }

  const handleRemoveMultipleImage = (index: number) => {
    setMultipleImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let imageUrl = currentProduct.image
      let savedProductId = currentProduct.id

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)

        const uploadRes = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json().catch(() => null)

        if (!uploadRes.ok) {
          throw new Error(uploadData?.error || 'Failed to upload image')
        }

        imageUrl = uploadData.url
      }

      const productToSave = {
        ...currentProduct,
        image: imageUrl,
        price: currentProduct.price,
      }

      const isEditing = !!currentProduct.id
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productToSave),
      })

      const savedProduct = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(savedProduct?.error || 'Failed to save product')
      }

      savedProductId = savedProduct.id

      if (multipleImageFiles.length > 0 && savedProductId) {
        const formData = new FormData()
        multipleImageFiles.forEach((file) => formData.append('images', file))

        await fetch(`/api/products/${savedProductId}/images`, {
          method: 'POST',
          body: formData,
        })
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

      toast({
        title: 'Success',
        description: `Product ${isEditing ? 'updated' : 'created'} successfully.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

    const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVariantSaving(true)

    try {
      const payload = {
        id: currentVariant.id,
        product: currentVariant.product_id,
        sku: currentVariant.sku,
        thickness_mm: currentVariant.thickness_mm,
        length_mm: currentVariant.length_mm,
        width_mm: currentVariant.width_mm,
        finish: currentVariant.finish,
        grade: currentVariant.grade,
        unit: currentVariant.unit,
        moq: currentVariant.moq,
        currency: 'USD',
        unit_price: currentVariant.is_price_on_request
          ? null
          : currentVariant.unit_price,
        unit_price_old: currentVariant.unit_price_old,
        is_active: currentVariant.is_active,
        is_price_on_request: currentVariant.is_price_on_request,
        price_notes: currentVariant.price_notes,
        core_type: currentVariant.core_type,
      }

      const res = await fetch('/api/admin/product-variants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })

      const savedVariant = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(savedVariant?.error || 'Failed to save variant')
      }

      await mutateVariants(
        (current) => {
          if (!Array.isArray(current)) return current

          return current.map((variant) =>
            variant.id === savedVariant.id ? savedVariant : variant
          )
        },
        false
      )

      await mutateVariants()

      setIsVariantModalOpen(false)
      setCurrentVariant(INITIAL_VARIANT)

      toast({
        title: 'Success',
        description: 'Variant updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsVariantSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    try {
      const res = await fetch(`/api/admin/products?id=${productToDelete}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete product')
      }

      await mutateProducts()

      toast({
        title: 'Deleted',
        description: 'Product marked as inactive.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Could not delete product',
        variant: 'destructive',
      })
    } finally {
      setIsDeleteAlertOpen(false)
      setProductToDelete(null)
    }
  }

  const isLoading = isLoadingProducts || isLoadingVariants
  const error = productsError || variantsError

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Products</h1>
          <p className="mt-1 text-muted-foreground">
            {filteredProducts.length} products · {variants.length} variants
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by product, SKU, finish, core..."
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Product
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Base Price
                  </th>
                  <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {filteredProducts.map((product, index) => {
                  const allProductVariants = product.sourceProductIds.flatMap(
                    (productId) => variantsByProductId[productId] || []
                  )

                  const expanded = !!expandedProducts[product.displayId]
                  const hasExpandableContent =
                    product.childProducts.length > 0 || allProductVariants.length > 0
                  const isNuDoorGroup = product.displayId === 'nudoor-group'

                  return (
                    <React.Fragment key={product.displayId || `${product.sku}-${index}`}>
                      <tr className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-mono text-foreground">
                          <div className="flex items-center gap-2">
                            {hasExpandableContent ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(product.displayId)}
                                className="rounded p-0.5 hover:bg-muted"
                                aria-label={
                                  expanded ? 'Collapse item' : 'Expand item'
                                }
                              >
                                {expanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="inline-block w-5" />
                            )}

                            <span>{product.displaySku || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.displayTitle}
                                className="h-10 w-10 rounded border border-border object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}

                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {product.displayTitle || 'Untitled product'}
                              </p>

                              {isNuDoorGroup ? (
                                <p className="text-xs text-muted-foreground">
                                  NuDoor Light • NuDoor Composite • NuDoor Premium
                                </p>
                              ) : allProductVariants.length > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  {allProductVariants.length} variation
                                  {allProductVariants.length === 1 ? '' : 's'}
                                </p>
                              ) : product.size ? (
                                <p className="text-xs text-muted-foreground">
                                  {product.size}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  No variants
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                          {product.categories?.name || product.category || '-'}
                        </td>

                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                          {product.price > 0
                            ? `USD ${product.price.toLocaleString()}`
                            : 'Quote'}
                        </td>

                        <td className="hidden px-4 py-3 text-center md:table-cell">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs',
                              product.is_active
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {product.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(product)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}

                            {canDeleteProduct(product, { isGroupedRow: isNuDoorGroup }) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleOpenDelete(product.id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expanded &&
                        isNuDoorGroup &&
                        product.childProducts.map((child) => (
                          <tr
                            key={`child-${child.id || child.sku}`}
                            className="border-t border-border bg-muted/10"
                          >
                            <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                              <span className="ml-7">{child.sku || '-'}</span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {child.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  NuDoor model
                                </p>
                              </div>
                            </td>

                            <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                              {child.categories?.name || child.category || '-'}
                            </td>

                            <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                              {child.price > 0
                                ? `USD ${child.price.toLocaleString()}`
                                : 'Quote'}
                            </td>

                            <td className="hidden px-4 py-3 text-center md:table-cell">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs',
                                  child.is_active
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {child.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {child.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleOpenEdit(child)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}

                                {canDeleteProduct(child) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleOpenDelete(child.id!)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}

                      {expanded &&
                        allProductVariants.map((variant) => (
                          <tr
                            key={variant.id}
                            className="border-t border-border bg-muted/20"
                          >
                            <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                              <span className="ml-7">{variant.sku || '-'}</span>
                            </td>

                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  Variant
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatVariantSize(variant)}
                                  {variant.core_type ? ` · ${variant.core_type}` : ''}
                                  {variant.finish ? ` · ${variant.finish}` : ''}
                                  {variant.grade ? ` · ${variant.grade}` : ''}
                                </p>
                              </div>
                            </td>

                            <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                              {variant.unit || '-'}
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
                                  variant.is_active
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {variant.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenVariantEdit(variant)}
                              >
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
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentProduct.id ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below. Required fields must be populated to save.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/50">
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
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
                  <Input
                    ref={fileInputRef}
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a product image. PNG, JPG, or WEBP supported.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={currentProduct.sku}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, sku: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={currentProduct.title}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, title: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={currentProduct.category_id}
                  onValueChange={(value) => {
                    const cat = (categoriesData ?? []).find((c) => c.id === value)
                    setCurrentProduct({
                      ...currentProduct,
                      category_id: value,
                      category: cat?.name ?? '',
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categoriesData ?? []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Base Price (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentProduct.price}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      price: Number(e.target.value) || 0,
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This is the base USD price. Other currencies are calculated
                  automatically on the website.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="length">Length (mm)</Label>
                <Input
                  id="length"
                  type="number"
                  min="0"
                  value={currentProduct.length_mm ?? ''}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      length_mm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  min="0"
                  value={currentProduct.width_mm ?? ''}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      width_mm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thickness">Thickness (mm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  min="0"
                  value={currentProduct.thickness_mm ?? ''}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      thickness_mm: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ply">Ply</Label>
                <Input
                  id="ply"
                  value={currentProduct.ply}
                  onChange={(e) =>
                    setCurrentProduct({ ...currentProduct, ply: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="moq">MOQ</Label>
                <Input
                  id="moq"
                  type="number"
                  min="1"
                  value={currentProduct.moq}
                  onChange={(e) =>
                    setCurrentProduct({
                      ...currentProduct,
                      moq: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={currentProduct.description}
                onChange={(e) =>
                  setCurrentProduct({
                    ...currentProduct,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="active"
                checked={currentProduct.is_active}
                onCheckedChange={(checked) =>
                  setCurrentProduct({ ...currentProduct, is_active: checked })
                }
              />
              <Label htmlFor="active">Is Active (Visible in Store)</Label>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Product Gallery Images</Label>

              {currentProduct.id && existingProductImages.length > 0 && (
                <div className="mb-4 border-b pb-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Existing Images ({existingProductImages.length})
                  </p>
                  <div className="grid max-h-40 grid-cols-3 gap-2 overflow-y-auto">
                    {existingProductImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-border bg-muted"
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text || 'Product image'}
                          className="h-full w-full object-cover"
                        />
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

              <div className="space-y-3">
                <Input
                  ref={multiImageInputRef}
                  id="multiImages"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMultipleImageChange}
                  className="cursor-pointer"
                />

                {multipleImageFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Selected: {multipleImageFiles.length} new image(s)
                    </p>

                    <div className="grid max-h-32 grid-cols-3 gap-2 overflow-y-auto">
                      {multipleImageFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-border bg-muted"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMultipleImage(index)}
                            className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProductModalOpen(false)}
              >
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

      <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
            <DialogDescription>
              Update this individual variation. Price here should stay in base USD.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVariant} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-sku">Variant SKU</Label>
                <Input
                  id="variant-sku"
                  value={currentVariant.sku}
                  onChange={(e) =>
                    setCurrentVariant({ ...currentVariant, sku: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-unit">Unit</Label>
                <Input
                  id="variant-unit"
                  value={currentVariant.unit}
                  onChange={(e) =>
                    setCurrentVariant({ ...currentVariant, unit: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-length">Length (mm)</Label>
                <Input
                  id="variant-length"
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
                <Label htmlFor="variant-width">Width (mm)</Label>
                <Input
                  id="variant-width"
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
                <Label htmlFor="variant-thickness">Thickness (mm)</Label>
                <Input
                  id="variant-thickness"
                  type="number"
                  value={currentVariant.thickness_mm ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      thickness_mm:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-core">Core Type</Label>
                <Input
                  id="variant-core"
                  value={currentVariant.core_type}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      core_type: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-finish">Finish</Label>
                <Input
                  id="variant-finish"
                  value={currentVariant.finish}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      finish: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-grade">Grade</Label>
                <Input
                  id="variant-grade"
                  value={currentVariant.grade}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      grade: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-moq">MOQ</Label>
                <Input
                  id="variant-moq"
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
                <Label htmlFor="variant-price">Base Price (USD)</Label>
                <Input
                  id="variant-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentVariant.unit_price ?? ''}
                  disabled={currentVariant.is_price_on_request}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      unit_price:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This is the base USD price for this variation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variant-old-price">Old Price (USD)</Label>
                <Input
                  id="variant-old-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentVariant.unit_price_old ?? ''}
                  onChange={(e) =>
                    setCurrentVariant({
                      ...currentVariant,
                      unit_price_old:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant-notes">Price Notes</Label>
              <Textarea
                id="variant-notes"
                rows={3}
                value={currentVariant.price_notes}
                onChange={(e) =>
                  setCurrentVariant({
                    ...currentVariant,
                    price_notes: e.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="variant-active"
                checked={currentVariant.is_active}
                onCheckedChange={(checked) =>
                  setCurrentVariant({ ...currentVariant, is_active: checked })
                }
              />
              <Label htmlFor="variant-active">Variant is active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="variant-quote"
                checked={currentVariant.is_price_on_request}
                onCheckedChange={(checked) =>
                  setCurrentVariant({
                    ...currentVariant,
                    is_price_on_request: checked,
                    unit_price: checked ? null : currentVariant.unit_price,
                  })
                }
              />
              <Label htmlFor="variant-quote">Price on request / Quote only</Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVariantModalOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isVariantSaving}>
                {isVariantSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the product by setting it to inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}