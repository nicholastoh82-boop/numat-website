'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { useCurrency } from '@/components/providers/currency-provider'

type ApiVariant = {
  id: string
  sku: string
  size_label: string | null
  ply_count: number | null
  unit: string
  moq: number
  base_price_php: number | null
  is_price_on_request: boolean
}

type ApiProduct = {
  id: string
  name: string
  slug: string
  image_url: string | null
  is_featured: boolean
  starting_price_php: number | null
  variants?: ApiVariant[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

/**
 * Product picker for the standalone /request-quote page.
 *
 * QuoteForm reads its line items from the cart store, which is right when the
 * cart drawer renders it. But /request-quote renders it on its own, so the cart
 * is empty, and the homepage hero links straight here. A visitor filled in every
 * field, pressed submit, got "Cart is empty. Add products first." and had no way
 * forward. There was nothing on the page to add a product with.
 *
 * This adds straight into the cart store rather than keeping its own state, so
 * the totals, the currency conversion and the submit payload all keep working
 * untouched.
 */
export default function QuoteProductPicker() {
  const { data } = useSWR<ApiProduct[]>('/api/products', fetcher, { revalidateOnFocus: false })
  const { addItem } = useCartStore()
  const { formatConvertedFromPhp } = useCurrency()
  const [qty, setQty] = useState<Record<string, number>>({})

  const products = (Array.isArray(data) ? [...data] : []).sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
    return (a.starting_price_php ?? 0) - (b.starting_price_php ?? 0)
  })

  if (products.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-stone-200 bg-white p-7 text-sm text-stone-500">
        Loading products...
      </div>
    )
  }

  function add(product: ApiProduct) {
    const v = product.variants?.[0]
    const moq = v?.moq ?? 1
    const quantity = Math.max(qty[product.id] ?? moq, moq)
    addItem({
      id: v?.id || product.id,
      variantId: v?.id ?? null,
      sku: v?.sku ?? null,
      name: product.name,
      specs: v?.size_label ? `${v.size_label}${v.ply_count ? `, ${v.ply_count} ply` : ''}` : '',
      quantity,
      unitPrice: v?.is_price_on_request ? null : (v?.base_price_php ?? product.starting_price_php ?? null),
      minOrderQty: moq,
      unit: v?.unit ?? 'piece',
      imageUrl: product.image_url,
      isPriceOnRequest: v?.is_price_on_request ?? false,
    })
  }

  return (
    <div className="rounded-[1.75rem] border border-stone-200 bg-white p-7 shadow-sm">
      <div className="flex items-start gap-2.5">
        <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div>
          <h2 className="text-base font-bold text-stone-950">What would you like quoted?</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Pick at least one board. You can add more than one.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {products.map((product) => {
          const v = product.variants?.[0]
          const moq = v?.moq ?? 1
          const n = Math.max(qty[product.id] ?? moq, moq)
          const price = v?.is_price_on_request
            ? 'Price on request'
            : formatConvertedFromPhp(v?.base_price_php ?? product.starting_price_php)

          return (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 px-4 py-3.5"
            >
              <div className="min-w-[9rem]">
                <p className="text-sm font-semibold text-stone-950">{product.name}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {v?.size_label ?? ''} · {price} a {v?.unit ?? 'piece'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-stone-200">
                  <button
                    type="button"
                    aria-label={`Decrease ${product.name} quantity`}
                    onClick={() => setQty({ ...qty, [product.id]: Math.max(n - 1, moq) })}
                    className="px-2.5 py-2 text-stone-500 transition hover:text-stone-900"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-semibold text-stone-900">{n}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${product.name} quantity`}
                    onClick={() => setQty({ ...qty, [product.id]: n + 1 })}
                    className="px-2.5 py-2 text-stone-500 transition hover:text-stone-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={() => add(product)}
                  className="h-10 rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-900"
                >
                  Add
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
