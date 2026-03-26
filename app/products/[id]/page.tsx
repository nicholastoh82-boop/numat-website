'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
} from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import CartDrawer from '@/components/cart-drawer'
import ProductDetailImage from '@/components/products/product-detail-image'
import { useCurrency } from '@/components/providers/currency-provider'
import { toast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/cart-store'
import {
  detectProductFamily,
  getConfiguratorOptions,
  validateConfiguredQuantity,
  type ProductFamily,
} from '@/lib/product-config'

const DOST_PDF_PATH = '/docs/DOST%20Results.pdf'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  category: string | null
  unit?: string | null
  base_price_usd?: number | null
  sku?: string | null
  thickness_mm?: number | null
  ply_count?: number | null
  dimensions?: string | null
  min_order_qty?: number | null
  variants?: Array<{
    id: string
    sku: string
    thickness_mm: number | null
    ply_count: number | null
    dimensions: string | null
    base_price_usd: number | null
    unit: string
    min_order_qty: number
    core_type: string | null
    size_label: string | null
    is_price_on_request: boolean
    price_notes: string | null
  }>
}

type ProductListItem = {
  id: string
  name: string
  slug?: string
  category?: string | { id?: string; name?: string } | null
  categories?: { id: string; name: string } | null
  created_at?: string | null
  base_price_usd?: number | null
}

type Category = {
  id: string
  name: string
  slug?: string
  created_at?: string
  is_active?: boolean
  display_order?: number | null
}

type SelectOption = {
  label: string
  value: string
}

type ResolvedQuoteState = {
  productLabel: string
  model: string
  coreType: string
  thickness: string
  ply: string
  length: string
  dimensions: string
  moq: number
  unit: string
  priceUsd: number | null
  inStock: boolean
  stockMessage: string
  sku: string
  variantId: string | null
  isPriceOnRequest: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error || 'Failed to load data.')
  }

  return data
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeCategorySlug(input: string): string {
  const raw = slugify(input)

  const aliasMap: Record<string, string> = {
    door: 'nudoor',
    nudoor: 'nudoor',

    flooring: 'nufloor',
    floor: 'nufloor',
    nufloor: 'nufloor',

    wall: 'nuwall',
    'wall-panelling': 'nuwall',
    'wall-paneling': 'nuwall',
    nuwall: 'nuwall',

    nubam: 'nubam-boards',
    'nubam-boards': 'nubam-boards',
    veneer: 'nubam-boards',

    diy: 'nuslat',
    'diy-project': 'nuslat',
    'diy-projects': 'nuslat',
    nuslat: 'nuslat',

    furniture: 'furniture',
  }

  return aliasMap[raw] ?? raw
}

function normalizeCategoryName(input: string): string {
  const normalizedSlug = normalizeCategorySlug(input)

  const labelMap: Record<string, string> = {
    nudoor: 'NuDoor',
    nufloor: 'NuFloor',
    nuwall: 'NuWall',
    'nubam-boards': 'NuBam Boards',
    nuslat: 'NuSlat',
    furniture: 'Furniture',
  }

  return labelMap[normalizedSlug] ?? input
}

function getProductCategoryLabel(product: Product | null): string {
  if (!product?.category) return 'Product'
  return normalizeCategoryName(product.category)
}

function getProductCategorySlugFromListItem(product: ProductListItem): string {
  const raw =
    typeof product.category === 'string'
      ? product.category
      : product.category?.name || product.categories?.name || ''

  return normalizeCategorySlug(raw)
}

function cleanText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function normalizeValue(input: string | null | undefined) {
  return (input || '').trim().toLowerCase()
}

function formatThicknessLabel(value: number | null | undefined) {
  return typeof value === 'number' ? `${value}mm` : ''
}

function formatPlyLabel(value: number | null | undefined) {
  return typeof value === 'number' ? `${value} Ply` : ''
}

function getUniqueOptions(values: Array<string | null | undefined>): SelectOption[] {
  return Array.from(new Set(values.map((v) => (v || '').trim()).filter(Boolean))).map((value) => ({
    label: value,
    value,
  }))
}

function getDisplayProductName(name: string, family: ProductFamily) {
  if (family === 'nudoor' && name.trim().toLowerCase() === 'nudoor light') {
    return 'NuDoor'
  }
  return name
}

function getNuDoorModelLabel(name: string) {
  const raw = name.trim().toLowerCase()

  if (raw === 'nudoor light') return 'NuDoor Light'
  if (raw === 'nudoor composite') return 'NuDoor Composite'
  if (raw === 'nudoor premium') return 'NuDoor Premium'

  return name
}

function splitDescriptionContent(
  description: string | null,
  productName: string,
  family: ProductFamily
) {
  if (family === 'nuwall') {
    return {
      intro:
        'NuWall engineered bamboo panels manufactured for structural integrity and aesthetic performance.',
      specsText: '',
      highlights: [] as string[],
    }
  }

  const cleaned = cleanText(description)

  if (!cleaned) {
    return {
      intro: `${productName} is designed for sustainable performance, reliable quality, and modern architectural or interior applications.`,
      specsText: '',
      highlights: [] as string[],
    }
  }

  const withoutLabels = cleaned
    .replace(/key benefits\s*:?\s*/gi, ' | ')
    .replace(/applications?\s*:?\s*/gi, ' | ')
    .replace(/specifications?\s*:?\s*/gi, ' | ')
    .replace(/\s*[•·]\s*/g, ' | ')

  const parts = withoutLabels
    .split('|')
    .map((part) => cleanText(part))
    .filter(Boolean)

  const intro = parts[0] || cleaned
  const remaining = parts.slice(1)

  const specLike: string[] = []
  const highlights: string[] = []

  for (const item of remaining) {
    const lower = item.toLowerCase()

    const isSpec =
      lower.includes('thickness') ||
      lower.includes('size') ||
      lower.includes('dimension') ||
      lower.includes('standard size') ||
      lower.includes('custom sizing') ||
      /\b\d+\s*mm\b/i.test(item)

    if (isSpec) {
      specLike.push(item)
      continue
    }

    if (item.toLowerCase() !== intro.toLowerCase()) {
      highlights.push(item)
    }
  }

  const dedupedHighlights = Array.from(
    new Set(
      highlights.filter(
        (item) =>
          item &&
          item.toLowerCase() !== intro.toLowerCase() &&
          !specLike.some((spec) => spec.toLowerCase() === item.toLowerCase())
      )
    )
  )

  const specsText = Array.from(new Set(specLike)).join(' • ')

  return {
    intro,
    specsText,
    highlights: dedupedHighlights,
  }
}

function getProductUseCases(family: ProductFamily): string[] {
  switch (family) {
    case 'nubam-boards':
      return ['Furniture manufacturing', 'Interior fit-outs', 'Cabinetry']
    case 'nuwall':
      return ['Wall panels', 'Interior surfaces', 'Architectural finishes']
    case 'nudoor':
      return ['Residential doors', 'Commercial interiors', 'Premium fit-out projects']
    case 'nufloor':
      return ['Residential flooring', 'Commercial flooring', 'Sustainable interiors']
    case 'nuslat':
      return ['Feature walls', 'Decorative detailing', 'Custom joinery']
    case 'furniture':
      return ['Custom furniture', 'Built-in joinery', 'Interior applications']
    default:
      return ['Interior applications', 'Architectural projects', 'Sustainable build use']
  }
}

function getProductFeatureHighlights(family: ProductFamily): string[] {
  switch (family) {
    case 'nubam-boards':
    case 'nuwall':
      return ['Engineered strength', 'Premium finish quality', 'Moisture-resistant performance']
    case 'nudoor':
      return ['Elegant finish', 'Durable construction', 'Ready for premium projects']
    case 'nufloor':
      return ['Clean modern look', 'Stable construction', 'Sustainable material choice']
    case 'nuslat':
      return ['Lightweight format', 'Design flexibility', 'In-stock option available']
    case 'furniture':
      return ['Custom quote workflow', 'Interior-ready material', 'Design flexibility']
    default:
      return ['Engineered bamboo', 'Sustainable material', 'Project-ready quality']
  }
}

function getFamilyBadge(family: ProductFamily, categoryLabel: string): string {
  if (family === 'other') return categoryLabel
  return normalizeCategoryName(categoryLabel)
}

function getSelectionRows(resolved: ResolvedQuoteState) {
  const rows = [
    resolved.model ? { label: 'Model', value: resolved.model } : null,
    resolved.coreType && resolved.coreType !== '—'
      ? { label: 'Core Type', value: resolved.coreType }
      : null,
    resolved.thickness && resolved.thickness !== '—'
      ? { label: 'Thickness', value: resolved.thickness }
      : null,
    resolved.ply && resolved.ply !== '—' ? { label: 'Ply', value: resolved.ply } : null,
    resolved.length ? { label: 'Length', value: resolved.length } : null,
    resolved.dimensions && resolved.dimensions !== '—'
      ? { label: 'Dimensions', value: resolved.dimensions }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return rows
}

function formatDimensions(value: string) {
  return value.replace(/\s*x\s*/gi, ' × ')
}

function OptionPills({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}) {
  if (!options.length) return null

  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = value === opt.value

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'border-[#16361f] bg-[#16361f] text-white shadow-sm'
                  : 'border-black/10 bg-white text-foreground hover:border-black/20 hover:bg-stone-50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const productId = params?.id

  const { formatConvertedFromUsd } = useCurrency()
  const { addItem, openCart } = useCartStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [product, setProduct] = useState<Product | null>(null)

  const [selectedCoreType, setSelectedCoreType] = useState('Horizontal')
  const [selectedThickness, setSelectedThickness] = useState('')
  const [selectedPly, setSelectedPly] = useState('')
  const [selectedModel, setSelectedModel] = useState('premium')
  const [selectedLength, setSelectedLength] = useState('8ft')
  const [quantity, setQuantity] = useState(1)

  const { data: categories } = useSWR<Category[]>('/api/categories', fetcher, {
    fallbackData: [],
  })

  const { data: allProducts } = useSWR<ProductListItem[]>('/api/products', fetcher, {
    fallbackData: [],
  })

  useEffect(() => {
    if (!productId) {
      setError('Missing product ID in route.')
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadProduct() {
      try {
        setLoading(true)
        setError('')
        setProduct(null)

        const res = await fetch(`/api/products/${productId}`, { cache: 'no-store' })
        const data = await res.json()

        if (!isMounted) return

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load product.')
        }

        if (!data || !data.id) {
          throw new Error('API returned empty product data.')
        }

        setProduct(data)
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        setError(message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadProduct()

    return () => {
      isMounted = false
    }
  }, [productId])

  const family: ProductFamily = useMemo(() => {
    if (!product) return 'other'
    return detectProductFamily(product.name, product.category)
  }, [product])

  const displayProductName = useMemo(
    () => getDisplayProductName(product?.name || '', family),
    [product?.name, family]
  )

  const options = useMemo(() => getConfiguratorOptions(family), [family])

  const pricedVariants = useMemo(
    () =>
      (product?.variants ?? []).filter(
        (variant) =>
          !variant.is_price_on_request &&
          typeof variant.base_price_usd === 'number' &&
          Number.isFinite(variant.base_price_usd) &&
          variant.base_price_usd > 0
      ),
    [product?.variants]
  )

  const useVariantDrivenConfig =
    pricedVariants.length > 0 &&
    (family === 'nubam-boards' || family === 'nuwall' || family === 'nuslat')

  const nudoorModelProducts = useMemo(() => {
    if (family !== 'nudoor') return []

    return (allProducts ?? [])
      .filter((item) => getProductCategorySlugFromListItem(item) === 'nudoor')
      .sort((a, b) => {
        const orderMap: Record<string, number> = {
          'nudoor light': 0,
          'nudoor composite': 1,
          'nudoor premium': 2,
        }

        const aOrder = orderMap[a.name.trim().toLowerCase()] ?? 999
        const bOrder = orderMap[b.name.trim().toLowerCase()] ?? 999

        if (aOrder !== bOrder) return aOrder - bOrder

        return getNuDoorModelLabel(a.name).localeCompare(getNuDoorModelLabel(b.name))
      })
  }, [allProducts, family])

  const variantCoreTypeOptions = useMemo(() => {
    if (!useVariantDrivenConfig) return []
    return getUniqueOptions(pricedVariants.map((v) => v.core_type))
  }, [useVariantDrivenConfig, pricedVariants])

  const variantThicknessOptions = useMemo(() => {
    if (!useVariantDrivenConfig) return []

    if (family === 'nuslat') {
      return getUniqueOptions(pricedVariants.map((v) => formatThicknessLabel(v.thickness_mm)))
    }

    const scoped =
      family === 'nubam-boards' || family === 'nuwall'
        ? pricedVariants.filter((v) =>
            selectedCoreType ? normalizeValue(v.core_type) === normalizeValue(selectedCoreType) : true
          )
        : pricedVariants

    return getUniqueOptions(scoped.map((v) => formatThicknessLabel(v.thickness_mm))).sort(
      (a, b) => Number(a.value.replace('mm', '')) - Number(b.value.replace('mm', ''))
    )
  }, [useVariantDrivenConfig, pricedVariants, family, selectedCoreType])

  const variantPlyOptions = useMemo(() => {
    if (!useVariantDrivenConfig) return []

    const scoped = pricedVariants.filter((v) => {
      if (family === 'nuslat') {
        const thicknessMatch = selectedThickness
          ? formatThicknessLabel(v.thickness_mm) === selectedThickness
          : true
        return thicknessMatch
      }

      const coreMatch =
        family === 'nubam-boards' || family === 'nuwall'
          ? selectedCoreType
            ? normalizeValue(v.core_type) === normalizeValue(selectedCoreType)
            : true
          : true

      const thicknessMatch = selectedThickness
        ? formatThicknessLabel(v.thickness_mm) === selectedThickness
        : true

      return coreMatch && thicknessMatch
    })

    return getUniqueOptions(scoped.map((v) => formatPlyLabel(v.ply_count))).sort(
      (a, b) => Number(a.value.replace(/\D/g, '')) - Number(b.value.replace(/\D/g, ''))
    )
  }, [useVariantDrivenConfig, pricedVariants, family, selectedCoreType, selectedThickness])

  const variantLengthOptions = useMemo(() => {
    if (!useVariantDrivenConfig || family !== 'nuslat') return []
    return getUniqueOptions(pricedVariants.map((v) => v.size_label))
  }, [useVariantDrivenConfig, pricedVariants, family])

  const coreTypeOptions: SelectOption[] =
    useVariantDrivenConfig && (family === 'nubam-boards' || family === 'nuwall')
      ? variantCoreTypeOptions
      : 'coreTypes' in options
      ? options.coreTypes ?? []
      : []

  const thicknessOptionsForBoards: SelectOption[] =
    useVariantDrivenConfig && (family === 'nubam-boards' || family === 'nuwall')
      ? variantThicknessOptions
      : 'thicknesses' in options && typeof options.thicknesses === 'function'
      ? (options.thicknesses(selectedCoreType) ?? []).sort(
          (a, b) => Number(a.value.replace('mm', '')) - Number(b.value.replace('mm', ''))
        )
      : []

  const plyOptionsForBoards: SelectOption[] =
    useVariantDrivenConfig && (family === 'nubam-boards' || family === 'nuwall')
      ? variantPlyOptions
      : 'plys' in options && typeof options.plys === 'function'
      ? (options.plys(selectedCoreType, selectedThickness) ?? []).sort(
          (a, b) => Number(a.value.replace(/\D/g, '')) - Number(b.value.replace(/\D/g, ''))
        )
      : []

  const floorThicknessOptions: SelectOption[] =
    'thicknesses' in options && Array.isArray(options.thicknesses)
      ? [...options.thicknesses].sort(
          (a, b) => Number(a.value.replace('mm', '')) - Number(b.value.replace('mm', ''))
        )
      : []

  const slatThicknessOptions: SelectOption[] =
    useVariantDrivenConfig && family === 'nuslat'
      ? variantThicknessOptions.sort(
          (a, b) => Number(a.value.replace('mm', '')) - Number(b.value.replace('mm', ''))
        )
      : 'thicknesses' in options && Array.isArray(options.thicknesses)
      ? [...options.thicknesses].sort(
          (a, b) => Number(a.value.replace('mm', '')) - Number(b.value.replace('mm', ''))
        )
      : []

  const slatLengthOptions: SelectOption[] =
    useVariantDrivenConfig && family === 'nuslat'
      ? variantLengthOptions
      : 'lengths' in options
      ? options.lengths ?? []
      : []

  useEffect(() => {
    if (useVariantDrivenConfig && (family === 'nubam-boards' || family === 'nuwall')) {
      const firstCore = coreTypeOptions[0]?.value ?? ''
      const firstThickness = thicknessOptionsForBoards[0]?.value ?? ''
      const firstPly = plyOptionsForBoards[0]?.value ?? ''

      if (!selectedCoreType && firstCore) setSelectedCoreType(firstCore)
      if (!selectedThickness && firstThickness) setSelectedThickness(firstThickness)
      if (!selectedPly && firstPly) setSelectedPly(firstPly)
      return
    }

    if (useVariantDrivenConfig && family === 'nuslat') {
      const firstThickness = slatThicknessOptions[0]?.value ?? ''
      const firstLength = slatLengthOptions[0]?.value ?? ''

      if (!selectedThickness && firstThickness) setSelectedThickness(firstThickness)
      if (!selectedLength && firstLength) setSelectedLength(firstLength)
      return
    }

    if (family === 'nufloor') {
      const firstThickness = floorThicknessOptions[0]?.value ?? '12mm'
      if (!selectedThickness && firstThickness) setSelectedThickness(firstThickness)
    }

    if (family === 'nuslat') {
      if (!selectedThickness) setSelectedThickness('5mm')
      if (!selectedLength) setSelectedLength('8ft')
    }
  }, [
    useVariantDrivenConfig,
    family,
    selectedCoreType,
    selectedThickness,
    selectedPly,
    selectedLength,
    coreTypeOptions,
    thicknessOptionsForBoards,
    plyOptionsForBoards,
    floorThicknessOptions,
    slatThicknessOptions,
    slatLengthOptions,
  ])

  useEffect(() => {
    if (useVariantDrivenConfig && (family === 'nubam-boards' || family === 'nuwall')) {
      const firstPly = plyOptionsForBoards[0]?.value ?? ''
      if (firstPly && !plyOptionsForBoards.find((p) => p.value === selectedPly)) {
        setSelectedPly(firstPly)
      }
      return
    }

    if (family === 'nufloor') {
      setSelectedPly('3 Ply')
    }
  }, [useVariantDrivenConfig, family, plyOptionsForBoards, selectedPly])

  useEffect(() => {
    if (family === 'nubam-boards' || family === 'nuwall') setQuantity(10)
    if (family === 'nudoor') setQuantity(1)
    if (family === 'nufloor') setQuantity(20)
    if (family === 'nuslat') setQuantity(500)
    if (family === 'furniture') setQuantity(1)
  }, [family])

  const selectedVariant = useMemo(() => {
    if (!useVariantDrivenConfig) return null

    return (
      pricedVariants.find((variant) => {
        if (family === 'nuslat') {
          const thicknessMatch = selectedThickness
            ? formatThicknessLabel(variant.thickness_mm) === selectedThickness
            : true

          const lengthMatch = selectedLength
            ? normalizeValue(variant.size_label) === normalizeValue(selectedLength)
            : true

          return thicknessMatch && lengthMatch
        }

        if (
          (family === 'nubam-boards' || family === 'nuwall') &&
          selectedCoreType &&
          normalizeValue(variant.core_type) !== normalizeValue(selectedCoreType)
        ) {
          return false
        }

        if (selectedThickness && formatThicknessLabel(variant.thickness_mm) !== selectedThickness) {
          return false
        }

        if (selectedPly && formatPlyLabel(variant.ply_count) !== selectedPly) {
          return false
        }

        return true
      }) ?? null
    )
  }, [
    useVariantDrivenConfig,
    pricedVariants,
    family,
    selectedCoreType,
    selectedThickness,
    selectedPly,
    selectedLength,
  ])

  const fallbackResolved = useMemo((): ResolvedQuoteState => {
    return {
      productLabel: displayProductName || '',
      model:
        family === 'nudoor'
          ? getNuDoorModelLabel(product?.name || '')
          : selectedModel || '',
      coreType: family === 'nudoor' ? 'Horizontal' : selectedCoreType || '',
      thickness: family === 'nufloor' ? selectedThickness || '—' : selectedThickness || '',
      ply: family === 'nufloor' ? '3 Ply' : selectedPly || '',
      length: family === 'nudoor' ? '8ft' : selectedLength || '',
      dimensions: product?.dimensions || '2440mm x 1220mm',
      moq: product?.min_order_qty || 1,
      unit: product?.unit || 'sheet',
      priceUsd: product?.base_price_usd ?? null,
      inStock: true,
      stockMessage: product?.base_price_usd != null ? '' : 'Request Quote',
      sku: product?.sku || '',
      variantId: null,
      isPriceOnRequest: product?.base_price_usd == null,
    }
  }, [product, displayProductName, family, selectedModel, selectedCoreType, selectedThickness, selectedPly, selectedLength])

  const resolved: ResolvedQuoteState = useMemo(() => {
    if (useVariantDrivenConfig && selectedVariant) {
      return {
        productLabel: displayProductName || '',
        model: selectedVariant.size_label || '',
        coreType: selectedVariant.core_type || '',
        thickness: formatThicknessLabel(selectedVariant.thickness_mm) || '—',
        ply: formatPlyLabel(selectedVariant.ply_count) || '—',
        length: family === 'nuslat' ? selectedVariant.size_label || selectedLength || '' : '',
        dimensions: selectedVariant.dimensions || product?.dimensions || '—',
        moq: selectedVariant.min_order_qty || product?.min_order_qty || 1,
        unit: selectedVariant.unit || product?.unit || 'sheet',
        priceUsd: selectedVariant.base_price_usd,
        inStock: true,
        stockMessage: '',
        sku: selectedVariant.sku || product?.sku || '',
        variantId: selectedVariant.id,
        isPriceOnRequest: false,
      }
    }

    return fallbackResolved
  }, [useVariantDrivenConfig, selectedVariant, product, family, selectedLength, displayProductName, fallbackResolved])

  const totalUsd = resolved.priceUsd != null ? resolved.priceUsd * quantity : null
  const familyQuantityError = validateConfiguredQuantity(family, quantity)
  const quantityError =
    quantity < resolved.moq
      ? `Minimum order quantity is ${resolved.moq} ${resolved.unit}.`
      : familyQuantityError

  const allCategories = useMemo(() => {
    const source = categories ?? []
    const dedupedMap = new Map<string, Category>()

    for (const category of source) {
      if (category.is_active === false) continue

      const normalizedSlug = normalizeCategorySlug(category.slug || category.name)
      const normalizedName = normalizeCategoryName(category.name)

      if (!dedupedMap.has(normalizedSlug)) {
        dedupedMap.set(normalizedSlug, {
          ...category,
          name: normalizedName,
          slug: normalizedSlug,
        })
      }
    }

    return Array.from(dedupedMap.values()).sort((a, b) => {
      const ao = a.display_order ?? 999999
      const bo = b.display_order ?? 999999
      if (ao !== bo) return ao - bo
      return a.name.localeCompare(b.name)
    })
  }, [categories])

  const categoryRepresentativeProducts = useMemo(() => {
    const map = new Map<string, ProductListItem>()

    for (const item of allProducts ?? []) {
      const slug = getProductCategorySlugFromListItem(item)
      if (!slug) continue
      if (!map.has(slug)) {
        map.set(slug, item)
      }
    }

    return map
  }, [allProducts])

  const categoryLabel = getProductCategoryLabel(product)

  const descriptionContent = useMemo(
    () =>
      splitDescriptionContent(
        product?.description ?? null,
        displayProductName || 'This product',
        family
      ),
    [product, displayProductName, family]
  )

  const useCases = useMemo(() => getProductUseCases(family), [family])
  const featureHighlights = useMemo(() => getProductFeatureHighlights(family), [family])
  const selectionRows = useMemo(() => getSelectionRows(resolved), [resolved])

  function buildSpecs() {
    const lines = [
      resolved.model ? `Model: ${resolved.model}` : '',
      resolved.coreType && resolved.coreType !== '—' ? `Core Type: ${resolved.coreType}` : '',
      resolved.thickness && resolved.thickness !== '—' ? `Thickness: ${resolved.thickness}` : '',
      resolved.ply && resolved.ply !== '—' ? `Ply: ${resolved.ply}` : '',
      resolved.length ? `Length: ${resolved.length}` : '',
      resolved.dimensions && resolved.dimensions !== '—' ? `Dimensions: ${resolved.dimensions}` : '',
      `MOQ: ${resolved.moq} ${resolved.unit}`,
    ].filter(Boolean)

    return lines.join(' | ')
  }

  function handleAddToQuote() {
    if (!product) return

    if (quantityError) {
      toast({
        title: 'Quantity issue',
        description: quantityError,
        variant: 'destructive',
      })
      return
    }

    addItem({
      id: resolved.variantId || product.id,
      name: resolved.productLabel,
      specs: buildSpecs(),
      quantity,
      unitPrice: resolved.priceUsd,
      minOrderQty: resolved.moq,
      unit: resolved.unit,
      imageUrl: product.image_url || '/Bamboo-Board.png',
      isPriceOnRequest: resolved.isPriceOnRequest || resolved.priceUsd == null,
      family,
      dimensions: resolved.dimensions,
      thickness: resolved.thickness,
      ply: resolved.ply,
      coreType: resolved.coreType,
      model: resolved.model,
      length: resolved.length,
      stockMessage: resolved.stockMessage,
    })

    toast({
      title: 'Added to quote',
      description:
        resolved.priceUsd != null
          ? `${quantity} × ${resolved.productLabel} added to your quote cart.`
          : `${quantity} × ${resolved.productLabel} added as a price-on-request item.`,
    })

    openCart()
  }

  function decrementQty() {
    const next =
      family === 'nufloor'
        ? Math.max(resolved.moq, quantity - 20)
        : Math.max(resolved.moq, quantity - 1)

    setQuantity(next)
  }

  function incrementQty() {
    const next = family === 'nufloor' ? quantity + 20 : quantity + 1
    setQuantity(next)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <CartDrawer />
        <main className="flex-1 bg-[#f7f2e8]">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-12">
            <div className="rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
              <p className="text-muted-foreground">Loading product...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <CartDrawer />
        <main className="flex-1 bg-[#f7f2e8]">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8 lg:py-12">
            <div className="rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
              <div className="text-xl font-semibold text-red-700">
                {error || 'Product not found.'}
              </div>
              <div className="mt-4">
                <Link
                  href="/products"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to products
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />
      <main className="flex-1 bg-[#f7f2e8] pb-28 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-col gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to products
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Products</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{categoryLabel}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{displayProductName}</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => router.push('/products')}
                className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-foreground"
              >
                All Products
              </button>

              {allCategories.map((category) => {
                const slug = normalizeCategorySlug(category.slug || category.name)
                const label = normalizeCategoryName(category.name)
                const isActive = slug === normalizeCategorySlug(product.category || '')
                const targetProduct = categoryRepresentativeProducts.get(slug)

                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => {
                      if (targetProduct?.id) {
                        router.push(`/products/${targetProduct.id}`)
                      } else {
                        router.push(`/products?category=${slug}`)
                      }
                    }}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                      isActive
                        ? 'bg-[#16361f] text-white'
                        : 'border border-black/10 bg-white text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="space-y-8">
              <div className="overflow-hidden rounded-[34px] border border-black/8 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="relative min-h-[320px] bg-[#efe7d9] sm:min-h-[420px] lg:min-h-[620px]">
                    <ProductDetailImage product={product} />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                  </div>

                  <div className="p-6 lg:p-8 xl:p-10">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-[#16361f]/15 bg-[#16361f]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#16361f]">
                        {getFamilyBadge(family, categoryLabel)}
                      </span>
                    </div>

                    {family !== 'nuwall' ? (
                      <h1 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl xl:text-5xl">
                        {displayProductName}
                      </h1>
                    ) : (
                      <h1 className="sr-only">{displayProductName}</h1>
                    )}

                    <p
                      className={`${
                        family !== 'nuwall' ? 'mt-5' : 'mt-2'
                      } max-w-2xl text-base leading-8 text-muted-foreground`}
                    >
                      {descriptionContent.intro}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {featureHighlights.map((item) => (
                        <span
                          key={item}
                          className="inline-flex rounded-full border border-black/8 bg-stone-50 px-3.5 py-2 text-sm text-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="mt-8 rounded-[26px] border border-black/8 bg-[#faf6ef] p-5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-6 border-b border-black/8 pb-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            MOQ
                          </p>
                          <p className="text-right text-base font-semibold text-foreground">
                            {resolved.moq} {resolved.unit}
                          </p>
                        </div>

                        <div className="flex items-start justify-between gap-6 border-b border-black/8 pb-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Dimensions
                          </p>
                          <p className="max-w-[220px] text-right text-base font-semibold leading-7 text-foreground">
                            {formatDimensions(resolved.dimensions)}
                          </p>
                        </div>

                        <div className="flex items-start justify-between gap-6">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Unit Price
                          </p>
                          <p className="text-right text-base font-semibold text-foreground">
                            {resolved.priceUsd != null
                              ? formatConvertedFromUsd(resolved.priceUsd)
                              : resolved.stockMessage || 'Request Quote'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold text-foreground">Best For</h2>
                  </div>

                  <div className="space-y-3">
                    {useCases.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <p className="text-sm leading-7 text-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold text-foreground">Product Overview</h2>
                  </div>

                  <p className="text-sm leading-7 text-foreground/75">
                    Built for modern projects that require a balance of durability,
                    clean aesthetics, and sustainable material sourcing.
                  </p>
                </div>
              </div>

              {descriptionContent.highlights.length > 0 && (
                <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm lg:p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-foreground">Key Highlights</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Main benefits and application strengths
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {descriptionContent.highlights.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="rounded-[24px] border border-black/8 bg-[#faf6ef] p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-[#16361f]" />
                          <p className="text-sm leading-7 text-foreground">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm lg:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-foreground">Configure Your Product</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select the required specifications below to prepare your quote.
                  </p>
                </div>

                <div className="space-y-8">
                  {(family === 'nubam-boards' || family === 'nuwall') && (
                    <>
                      <OptionPills
                        label="Core Type"
                        value={selectedCoreType}
                        onChange={setSelectedCoreType}
                        options={coreTypeOptions}
                      />

                      <OptionPills
                        label="Thickness"
                        value={selectedThickness}
                        onChange={setSelectedThickness}
                        options={thicknessOptionsForBoards}
                      />

                      <OptionPills
                        label="Ply"
                        value={selectedPly}
                        onChange={setSelectedPly}
                        options={plyOptionsForBoards}
                      />
                    </>
                  )}

                  {family === 'nudoor' && nudoorModelProducts.length > 0 && (
                    <div>
                      <label className="mb-3 block text-sm font-medium text-foreground">
                        Model
                      </label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {nudoorModelProducts.map((item) => {
                          const label = getNuDoorModelLabel(item.name)
                          const isActive = item.id === product.id

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => router.push(`/products/${item.id}`)}
                              className={`rounded-[24px] border p-4 text-left transition ${
                                isActive
                                  ? 'border-[#16361f] bg-[#16361f] text-white shadow-sm'
                                  : 'border-black/10 bg-white hover:border-black/20 hover:bg-stone-50'
                              }`}
                            >
                              <p className="text-sm font-semibold">{label}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {family === 'nufloor' && (
                    <>
                      <OptionPills
                        label="Thickness"
                        value={selectedThickness}
                        onChange={setSelectedThickness}
                        options={floorThicknessOptions}
                      />

                      <div className="rounded-[24px] border border-black/8 bg-[#faf6ef] p-4 text-sm leading-7 text-foreground/80">
                        <span className="font-medium text-foreground">Standard build:</span> {selectedPly || '3 Ply'}
                        <br />
                        <span className="font-medium text-foreground">Dimensions:</span>{' '}
                        {resolved.dimensions && resolved.dimensions !== '—'
                          ? formatDimensions(resolved.dimensions)
                          : '1220mm × 153mm'}
                      </div>
                    </>
                  )}

                  {family === 'nuslat' && (
                    <>
                      <OptionPills
                        label="Thickness"
                        value={selectedThickness}
                        onChange={setSelectedThickness}
                        options={slatThicknessOptions}
                      />

                      <OptionPills
                        label="Length"
                        value={selectedLength}
                        onChange={setSelectedLength}
                        options={slatLengthOptions}
                      />
                    </>
                  )}

                  <div className="rounded-[26px] border border-black/8 bg-[#faf6ef] p-5">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <label className="mb-3 block text-sm font-medium text-foreground">
                          Quantity
                        </label>

                        <div className="inline-flex items-center rounded-full border border-black/10 bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={decrementQty}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-stone-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <div className="min-w-[72px] px-3 text-center text-base font-semibold text-foreground">
                            {quantity}
                          </div>

                          <button
                            type="button"
                            onClick={incrementQty}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition hover:bg-stone-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 text-sm text-muted-foreground">
                          MOQ: {resolved.moq} {resolved.unit}
                          {family === 'nufloor' ? ' | Must be in multiples of 20' : ''}
                        </div>

                        {quantityError && (
                          <p className="mt-2 text-sm text-red-600">{quantityError}</p>
                        )}
                      </div>

                      <div className="rounded-[22px] border border-black/8 bg-white p-4 sm:min-w-[220px]">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Estimated total
                        </p>
                        <p className="mt-2 text-xl font-semibold text-foreground">
                          {totalUsd != null
                            ? formatConvertedFromUsd(totalUsd)
                            : resolved.stockMessage || 'Request Quote'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-black/8 bg-white p-6 shadow-sm lg:p-8">
                <div className="mb-5">
                  <h2 className="text-2xl font-semibold text-foreground">Third-party testing</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ASTM D1037 mechanical testing (ranges published to avoid cherry-picking).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-black/8 bg-[#faf6ef] px-3 py-1 text-foreground/80">
                    MOR: 22.77–69.44 MPa
                  </span>
                  <span className="rounded-full border border-black/8 bg-[#faf6ef] px-3 py-1 text-foreground/80">
                    MOE: 2211.82–10256.71 MPa
                  </span>
                  <span className="rounded-full border border-black/8 bg-[#faf6ef] px-3 py-1 text-foreground/80">
                    Compression: 25.19–30.46 MPa
                  </span>
                  <span className="rounded-full border border-black/8 bg-[#faf6ef] px-3 py-1 text-foreground/80">
                    Hardness: 3918.33–7377.33 N
                  </span>
                </div>

                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  Results apply to the specific samples submitted for testing (Oct–Nov 2025) and are
                  provided for reference. Values may vary by product configuration, thickness, moisture
                  content, and manufacturing lot.
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href="/testing"
                    className="font-semibold text-primary hover:underline underline-offset-4"
                  >
                    View testing page
                  </Link>
                  <a
                    href={DOST_PDF_PATH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline underline-offset-4"
                  >
                    Download DOST results (PDF)
                  </a>
                </div>
              </div>
            </section>

            <aside className="hidden xl:block">
              <div className="sticky top-24 rounded-[30px] bg-[#16241a] p-6 text-white shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
                <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                  Configuration summary
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[22px] bg-white/6 p-4">
                    <p className="text-sm text-white/50">Product</p>
                    <p className="mt-1 text-lg font-semibold">{resolved.productLabel}</p>
                  </div>

                  {selectionRows.length > 0 && (
                    <div className="rounded-[22px] bg-white/6 p-4">
                      <p className="text-sm text-white/50">Selected configuration</p>
                      <div className="mt-3 space-y-2.5 text-sm">
                        {selectionRows.map((row) => (
                          <div
                            key={`${row.label}-${row.value}`}
                            className="flex items-start justify-between gap-4"
                          >
                            <span className="text-white/50">{row.label}</span>
                            <span className="text-right font-medium text-white">
                              {row.label === 'Dimensions'
                                ? formatDimensions(row.value)
                                : row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/45">MOQ</p>
                      <p className="mt-2 text-sm font-medium">
                        {resolved.moq} {resolved.unit}
                      </p>
                    </div>

                    <div className="rounded-[22px] bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/45">
                        Quantity
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {quantity} {resolved.unit}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-amber-400/10 p-4">
                    <p className="text-sm text-amber-100/80">Unit Price</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {resolved.priceUsd != null
                        ? formatConvertedFromUsd(resolved.priceUsd)
                        : resolved.stockMessage || 'Request Quote'}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-emerald-400/10 p-4">
                    <p className="text-sm text-emerald-100/80">Estimated Total</p>
                    <p className="mt-1 text-xl font-semibold">
                      {totalUsd != null
                        ? formatConvertedFromUsd(totalUsd)
                        : resolved.stockMessage || 'Request Quote'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToQuote}
                    disabled={!!quantityError}
                    className="mt-2 w-full rounded-full bg-white px-4 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add to Quote
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-white/96 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Estimated total
              </p>
              <p className="truncate text-base font-semibold text-foreground">
                {totalUsd != null
                  ? formatConvertedFromUsd(totalUsd)
                  : resolved.stockMessage || 'Request Quote'}
              </p>
              <p className="text-xs text-muted-foreground">
                MOQ {resolved.moq} {resolved.unit}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddToQuote}
              disabled={!!quantityError}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16361f] px-5 py-3 font-semibold text-white transition hover:bg-[#204a2b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Quote
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}