'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  specs: string
  quantity: number
  unitPrice: number | null
  minOrderQty: number
  unit: string
  imageUrl?: string | null
  isPriceOnRequest?: boolean

  family?: string
  dimensions?: string
  thickness?: string
  ply?: string
  coreType?: string
  model?: string
  length?: string
  stockMessage?: string
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (idOrKey: string) => void
  updateQuantity: (idOrKey: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  getTotalItems: () => number
  getSubtotal: () => number
  getDiscount: () => number
  getTotal: () => number
  getDiscountPercent: () => number
}

function calculateDiscountPercent(totalQuantity: number): number {
  if (totalQuantity >= 500) return 15
  if (totalQuantity >= 200) return 10
  if (totalQuantity >= 100) return 7
  if (totalQuantity >= 50) return 5
  if (totalQuantity >= 20) return 3
  return 0
}

export function getCartItemKey(item: Pick<CartItem, 'id' | 'specs' | 'unitPrice' | 'unit' | 'isPriceOnRequest'>) {
  return [
    item.id,
    item.specs || '',
    item.unit || '',
    item.unitPrice ?? 'price-on-request',
    item.isPriceOnRequest ? 'por' : 'priced',
  ].join('::')
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item: CartItem) => {
        const items = get().items
        const newItemKey = getCartItemKey(item)

        const existingItem = items.find((i) => getCartItemKey(i) === newItemKey)

        if (existingItem) {
          set({
            items: items.map((i) =>
              getCartItemKey(i) === newItemKey
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                ...item,
                unitPrice:
                  typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
                    ? item.unitPrice
                    : null,
                isPriceOnRequest: item.isPriceOnRequest ?? item.unitPrice == null,
              },
            ],
          })
        }
      },

      removeItem: (idOrKey: string) => {
        set({
          items: get().items.filter((item) => {
            const key = getCartItemKey(item)
            return key !== idOrKey && item.id !== idOrKey
          }),
        })
      },

      updateQuantity: (idOrKey: string, quantity: number) => {
        const item = get().items.find((i) => {
          const key = getCartItemKey(i)
          return key === idOrKey || i.id === idOrKey
        })

        if (!item) return

        const safeQuantity = Math.max(item.minOrderQty, quantity)

        set({
          items: get().items.map((i) => {
            const key = getCartItemKey(i)
            if (key === idOrKey || i.id === idOrKey) {
              return { ...i, quantity: safeQuantity }
            }
            return i
          }),
        })
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      getSubtotal: () =>
        get().items.reduce((sum, item) => {
          if (typeof item.unitPrice !== 'number' || !Number.isFinite(item.unitPrice)) {
            return sum
          }
          return sum + item.quantity * item.unitPrice
        }, 0),

      getDiscountPercent: () => {
        const totalItems = get().getTotalItems()
        return calculateDiscountPercent(totalItems)
      },

      getDiscount: () => {
        const subtotal = get().getSubtotal()
        const discountPercent = get().getDiscountPercent()
        return Math.round(subtotal * (discountPercent / 100))
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        const discount = get().getDiscount()
        return subtotal - discount
      },
    }),
    {
      name: 'numat-cart',
    }
  )
)