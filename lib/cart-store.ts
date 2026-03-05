'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  specs: string
  quantity: number
  unitPrice: number
  minOrderQty: number
  unit: string
  imageUrl?: string | null
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
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

// Discount tiers based on total quantity
function calculateDiscountPercent(totalQuantity: number): number {
  if (totalQuantity >= 500) return 15
  if (totalQuantity >= 200) return 10
  if (totalQuantity >= 100) return 7
  if (totalQuantity >= 50) return 5
  if (totalQuantity >= 20) return 3
  return 0
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item: CartItem) => {
        const items = get().items
        const existingItem = items.find(i => i.id === item.id)

        if (existingItem) {
          set({
            items: items.map(i =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          })
        } else {
          set({ items: [...items, item] })
        }
      },

      removeItem: (id: string) => {
        set({ items: get().items.filter(item => item.id !== id) })
      },

      updateQuantity: (id: string, quantity: number) => {
        const item = get().items.find(i => i.id === id)
        if (!item) return
        
        if (quantity < item.minOrderQty) {
          get().removeItem(id)
          return
        }
        
        set({
          items: get().items.map(i =>
            i.id === id ? { ...i, quantity } : i
          )
        })
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      getSubtotal: () => get().items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),

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
      }
    }),
    {
      name: 'numat-cart'
    }
  )
)
