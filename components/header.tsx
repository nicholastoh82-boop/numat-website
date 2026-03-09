'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { cn } from '@/lib/utils'
import CountrySelector from '@/components/country-selector'
import { useCurrency } from '@/components/providers/currency-provider'

const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'ESG', href: '/esg' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { items, openCart } = useCartStore()
  const { selectedCountry } = useCurrency()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group select-none">
          <div className="relative h-10 w-40 sm:h-12 sm:w-48 transition-transform duration-300 group-hover:opacity-90">
            <Image
              src="/logo.png"
              alt="Brand Logo"
              fill
              className="object-contain object-left"
              priority
              sizes="(max-width: 768px) 160px, 192px"
            />
          </div>
        </Link>

        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-primary after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex">
            <CountrySelector />
          </div>

          <div className="hidden xl:block rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {selectedCountry.name} · {selectedCountry.currency}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted"
            onClick={openCart}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm animate-in zoom-in">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Button>

          <Link href="/cart" className="hidden sm:block">
            <Button className="bg-primary text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5 hover:bg-primary/90">
              Get Quote
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </nav>

      <div
        className={cn(
          'overflow-hidden border-b border-border/50 transition-all duration-300 ease-in-out lg:hidden',
          mobileMenuOpen ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-1 bg-background/95 px-4 pb-6 backdrop-blur">
          <div className="px-2 py-3">
            <CountrySelector />
          </div>

          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}

          <div className="px-2 pt-4">
            <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Get Quote
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}