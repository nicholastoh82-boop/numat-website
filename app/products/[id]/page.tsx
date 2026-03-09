'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCurrency } from '@/components/providers/currency-provider'
import { toast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/cart-store'
import {
  detectProductFamily,
  getConfiguratorOptions,
  resolveConfiguredVariant,
  validateConfiguredQuantity,
  type ProductFamily,
} from '@/lib/product-config'

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

type SelectOption = {
  label: string
  value: string
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const productId = params?.id

  console.log('PAGE productId:', productId)

  const { formatConvertedFromUsd } = useCurrency()
  const { addItem, openCart } = useCartStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [debugData, setDebugData] = useState<any>(null)

  const [selectedCoreType, setSelectedCoreType] = useState('Horizontal')
  const [selectedThickness, setSelectedThickness] = useState('')
  const [selectedPly, setSelectedPly] = useState('')
  const [selectedModel, setSelectedModel] = useState('premium')
  const [selectedLength, setSelectedLength] = useState('8ft')
  const [quantity, setQuantity] = useState(1)

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

        console.log('FETCH status:', res.status)
        console.log('FETCH data:', data)

        if (!isMounted) return

        setDebugData({
          productId,
          status: res.status,
          data,
        })

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
        console.error('PRODUCT PAGE ERROR:', err)
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

  const options = useMemo(() => getConfiguratorOptions(family), [family])

  const coreTypeOptions: SelectOption[] =
    'coreTypes' in options ? options.coreTypes ?? [] : []

  const thicknessOptionsForBoards: SelectOption[] =
    'thicknesses' in options && typeof options.thicknesses === 'function'
      ? options.thicknesses(selectedCoreType) ?? []
      : []

  const plyOptionsForBoards: SelectOption[] =
    'plys' in options && typeof options.plys === 'function'
      ? options.plys(selectedCoreType, selectedThickness) ?? []
      : []

  const floorThicknessOptions: SelectOption[] =
    'thicknesses' in options && Array.isArray(options.thicknesses)
      ? options.thicknesses ?? []
      : []

  const modelOptions: SelectOption[] =
    'models' in options ? options.models ?? [] : []

  const slatThicknessOptions: SelectOption[] =
    'thicknesses' in options && Array.isArray(options.thicknesses)
      ? options.thicknesses ?? []
      : []

  const slatLengthOptions: SelectOption[] =
    'lengths' in options ? options.lengths ?? [] : []

  useEffect(() => {
    if (family === 'nubam-boards' || family === 'nuwall') {
      const firstThickness = thicknessOptionsForBoards[0]?.value ?? ''
      if (!selectedThickness && firstThickness) {
        setSelectedThickness(firstThickness)
      }
    }

    if (family === 'nufloor' && !selectedThickness) {
      setSelectedThickness('12mm')
    }

    if (family === 'nuslat') {
      if (!selectedThickness) setSelectedThickness('5mm')
      if (!selectedLength) setSelectedLength('8ft')
    }
  }, [family, selectedThickness, selectedLength, thicknessOptionsForBoards])

  useEffect(() => {
    if (family === 'nubam-boards' || family === 'nuwall') {
      const firstPly = plyOptionsForBoards[0]?.value ?? ''
      if (
        firstPly &&
        selectedPly !== firstPly &&
        !plyOptionsForBoards.find((p: SelectOption) => p.value === selectedPly)
      ) {
        setSelectedPly(firstPly)
      }
    }

    if (family === 'nufloor') {
      setSelectedPly('3 Ply')
    }
  }, [family, plyOptionsForBoards, selectedPly])

  useEffect(() => {
    if (family === 'nubam-boards' || family === 'nuwall') setQuantity(10)
    if (family === 'nudoor') setQuantity(1)
    if (family === 'nufloor') setQuantity(20)
    if (family === 'nuslat') setQuantity(500)
  }, [family])

  const resolved = useMemo(() => {
    return resolveConfiguredVariant({
      family,
      productName: product?.name || '',
      selectedCoreType,
      selectedThickness,
      selectedPly,
      selectedModel,
      selectedLength,
    })
  }, [
    family,
    product?.name,
    selectedCoreType,
    selectedThickness,
    selectedPly,
    selectedModel,
    selectedLength,
  ])

  const totalUsd = resolved.priceUsd != null ? resolved.priceUsd * quantity : null
  const quantityError = validateConfiguredQuantity(family, quantity)

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
    if (!resolved.inStock || resolved.priceUsd == null) return

    if (quantityError) {
      toast({
        title: 'Quantity issue',
        description: quantityError,
        variant: 'destructive',
      })
      return
    }

    addItem({
      id: `${product.id}-${resolved.model || resolved.coreType || 'cfg'}-${resolved.thickness}-${resolved.ply}-${resolved.length}`,
      name: resolved.productLabel,
      specs: buildSpecs(),
      quantity,
      unitPrice: resolved.priceUsd,
      minOrderQty: resolved.moq,
      unit: resolved.unit,
      imageUrl: product.image_url,
      family,
      dimensions: resolved.dimensions,
      thickness: resolved.thickness,
      ply: resolved.ply,
      coreType: resolved.coreType,
      model: resolved.model,
      length: resolved.length,
      stockMessage: resolved.stockMessage,
    })

    openCart()
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <pre>Loading product...</pre>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 text-xl font-semibold text-red-700">
          {error || 'Product not found.'}
        </div>
        <pre className="overflow-auto rounded-xl bg-slate-100 p-4 text-sm">
{JSON.stringify(
  {
    productId,
    error,
    product,
    debugData,
  },
  null,
  2
)}
        </pre>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to products
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm uppercase tracking-[0.14em] text-muted-foreground">
            {product.category || 'Product'}
          </p>

          <h1 className="text-4xl font-semibold">{product.name}</h1>

          {product.description && (
            <p className="mt-4 max-w-3xl text-muted-foreground">{product.description}</p>
          )}

          <div className="mt-8 space-y-5">
            {(family === 'nubam-boards' || family === 'nuwall') && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">Core Type</label>
                  <select
                    value={selectedCoreType}
                    onChange={(e) => setSelectedCoreType(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {coreTypeOptions.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Thickness</label>
                  <select
                    value={selectedThickness}
                    onChange={(e) => setSelectedThickness(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {thicknessOptionsForBoards.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Ply</label>
                  <select
                    value={selectedPly}
                    onChange={(e) => setSelectedPly(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {plyOptionsForBoards.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {family === 'nudoor' && (
              <div>
                <label className="mb-2 block text-sm font-medium">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                >
                  {modelOptions.map((opt: SelectOption) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {family === 'nufloor' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">Thickness</label>
                  <select
                    value={selectedThickness}
                    onChange={(e) => setSelectedThickness(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {floorThicknessOptions.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                  Ply: 3 Ply
                  <br />
                  Dimensions: 1220mm x 153mm
                </div>
              </>
            )}

            {family === 'nuslat' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">Thickness</label>
                  <select
                    value={selectedThickness}
                    onChange={(e) => setSelectedThickness(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {slatThicknessOptions.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Length</label>
                  <select
                    value={selectedLength}
                    onChange={(e) => setSelectedLength(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {slatLengthOptions.map((opt: SelectOption) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!resolved.inStock && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    No stock. Only 5mm at 8ft is currently available.
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">Quantity</label>
              <input
                type="number"
                min={resolved.moq}
                step={family === 'nufloor' ? 20 : 1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || resolved.moq)}
                className="w-full rounded-xl border px-4 py-3"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                MOQ: {resolved.moq} {resolved.unit}
                {family === 'nufloor' ? ' | Must be in multiples of 20' : ''}
              </p>
              {quantityError && <p className="mt-1 text-sm text-red-600">{quantityError}</p>}
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Configuration Summary
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">Product</p>
              <p className="mt-1 text-lg font-semibold">{resolved.productLabel}</p>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">Dimensions</p>
              <p className="mt-1 font-medium">{resolved.dimensions}</p>
            </div>

            {resolved.coreType && resolved.coreType !== '—' && (
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Core Type</p>
                <p className="mt-1 font-medium">{resolved.coreType}</p>
              </div>
            )}

            {resolved.thickness && resolved.thickness !== '—' && (
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Thickness</p>
                <p className="mt-1 font-medium">{resolved.thickness}</p>
              </div>
            )}

            {resolved.ply && resolved.ply !== '—' && (
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Ply</p>
                <p className="mt-1 font-medium">{resolved.ply}</p>
              </div>
            )}

            {resolved.length && (
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Length</p>
                <p className="mt-1 font-medium">{resolved.length}</p>
              </div>
            )}

            <div className="rounded-2xl bg-amber-400/10 p-4">
              <p className="text-sm text-amber-100/80">Unit Price</p>
              <p className="mt-1 text-2xl font-semibold">
                {resolved.priceUsd != null
                  ? formatConvertedFromUsd(resolved.priceUsd)
                  : resolved.stockMessage || 'Request Quote'}
              </p>
            </div>

            <div className="rounded-2xl bg-green-400/10 p-4">
              <p className="text-sm text-green-100/80">Estimated Total</p>
              <p className="mt-1 text-xl font-semibold">
                {totalUsd != null
                  ? formatConvertedFromUsd(totalUsd)
                  : resolved.stockMessage || 'Request Quote'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddToQuote}
              disabled={!resolved.inStock || !!quantityError}
              className="mt-2 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to Quote
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}