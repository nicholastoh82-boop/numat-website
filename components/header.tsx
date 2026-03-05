'use client'

import Link from 'next/link'
import Image from 'next/image' // Added Import
import { useState } from 'react'
import { Menu, X, ShoppingCart, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/cart-store'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'ESG', href: '/esg' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { items, openCart } = useCartStore()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">

        {/* --- ENHANCED LOGO START --- */}
        <Link href="/" className="flex items-center gap-2 group select-none">
          {/* Using a container to control size strictly */}
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
        {/* --- ENHANCED LOGO END --- */}

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all hover:after:w-full"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-muted"
            onClick={openCart}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold shadow-sm animate-in zoom-in">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Button>

          {/* Get Quote CTA */}
          <Link href="/cart" className="hidden sm:block">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5">
              Get Quote
            </Button>
          </Link>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-b border-border/50',
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-6 space-y-1 bg-background/95 backdrop-blur">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block px-4 py-3 text-base font-medium text-foreground hover:bg-muted hover:text-primary rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-4 px-2">
            <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Get Quote
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}