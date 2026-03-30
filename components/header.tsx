'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useCurrency } from '@/components/providers/currency-provider'
import { COUNTRY_OPTIONS } from '@/lib/currency'

const navLinks = [
  { label: 'Products', href: '/products' },
  { label: 'Applications', href: '/applications' },
  { label: 'Technical Resources', href: '/technical-resources' },
  { label: 'Compare', href: '/compare' },
  { label: 'News', href: '/news' },
  { label: 'Certifications', href: '/testing' },
  { label: 'ESG', href: '/esg' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const LOGO_SRC = '/logo.png'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { selectedCountry, setSelectedCountryCode } = useCurrency()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-[#e7e1d8]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8 xl:gap-10">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src={LOGO_SRC}
              alt="Numat Bamboo"
              width={170}
              height={52}
              priority
              className="h-auto w-[130px] sm:w-[150px] lg:w-[165px]"
            />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname?.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium tracking-[0.01em] transition-colors',
                    isActive ? 'text-stone-900' : 'text-stone-700 hover:text-stone-900'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Desktop right — currency only */}
        <div className="hidden items-center lg:flex">
          <div className="relative flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 shadow-sm">
            <Image
              src={selectedCountry.flagSrc}
              alt={`${selectedCountry.name} flag`}
              width={18}
              height={18}
              className="h-[18px] w-[18px] rounded-full object-cover"
            />
            <select
              aria-label="Select country and currency"
              value={selectedCountry.code}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              className="appearance-none bg-transparent pl-0 pr-7 text-sm font-medium text-stone-800 outline-none"
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.currency})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white p-2 text-stone-800 shadow-sm lg:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-stone-200 bg-[#e7e1d8] lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">

            {/* Currency selector */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-3 shadow-sm">
              <Image
                src={selectedCountry.flagSrc}
                alt={`${selectedCountry.name} flag`}
                width={18}
                height={18}
                className="h-[18px] w-[18px] rounded-full object-cover"
              />
              <div className="relative w-full">
                <select
                  aria-label="Select country and currency"
                  value={selectedCountry.code}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className="w-full appearance-none bg-transparent pr-7 text-sm font-medium text-stone-800 outline-none"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname?.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-700 hover:bg-white/70 hover:text-stone-900'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}