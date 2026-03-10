'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import CountrySelector from '@/components/country-selector'
import { useCurrency } from '@/components/providers/currency-provider'

const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'Applications', href: '/applications' },
  { name: 'Technical Resources', href: '/technical-resources' },
  { name: 'Certifications', href: '/testing' },
  { name: 'ESG', href: '/esg' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { selectedCountry } = useCurrency()

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f7f1e7]/92 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="group select-none">
            <div className="relative h-10 w-[170px] sm:h-11 sm:w-[190px]">
              <Image
                src="/logo.png"
                alt="NUMAT logo"
                fill
                priority
                sizes="(max-width: 768px) 170px, 190px"
                className="object-contain object-left transition-opacity duration-300 group-hover:opacity-90"
              />
            </div>
          </Link>

          <div className="hidden lg:flex lg:items-center lg:gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <CountrySelector />
          </div>

          <div className="hidden xl:flex items-center rounded-full border border-black/8 bg-white/75 px-3.5 py-2 text-xs font-medium text-foreground/65 shadow-sm">
            {selectedCountry.name} · {selectedCountry.currency}
          </div>

          <Link href="/request-samples" className="hidden sm:block">
            <Button
              variant="outline"
              className="h-10 rounded-full border-black/10 bg-white/80 px-5 hover:bg-white"
            >
              Order Samples
            </Button>
          </Link>

          <Link href="/request-quote" className="hidden sm:block">
            <Button className="h-10 rounded-full bg-[#16361f] px-5 text-primary-foreground shadow-sm hover:bg-[#204a2b]">
              Request Quote
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border border-black/8 bg-white/75 hover:bg-white lg:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out lg:hidden',
          mobileMenuOpen ? 'max-h-[44rem] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t border-black/5 bg-[#f7f1e7]/98 px-4 pb-6 pt-3 backdrop-blur-xl">
          <div className="mb-3 px-1">
            <CountrySelector />
          </div>

          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-white/80 hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="grid gap-3 px-1 pt-4">
            <Link href="/request-samples" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="outline"
                className="w-full rounded-full border-black/10 bg-white/80 hover:bg-white"
              >
                Order Samples
              </Button>
            </Link>

            <Link href="/request-quote" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full rounded-full bg-[#16361f] text-primary-foreground hover:bg-[#204a2b]">
                Request Quote
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}