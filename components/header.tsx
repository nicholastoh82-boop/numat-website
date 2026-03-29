'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { useCurrency } from '@/components/providers/currency-provider'
import { COUNTRY_OPTIONS } from '@/lib/currency'

const navLinks = [
  { label: 'Products', href: '/products' },
  { label: 'Applications', href: '/applications' },
  { label: 'Technical Resources', href: '/technical-resources' },
  { label: 'News', href: '/news' },
  { label: 'Certifications', href: '/testing' },
  { label: 'ESG', href: '/esg' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const primaryNavLinks = navLinks.slice(0, 5)
const moreNavLinks = navLinks.slice(5)

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

          <nav className="hidden items-center gap-4 lg:flex xl:gap-5">
            {primaryNavLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname?.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-[13px] font-medium tracking-[0.01em] transition-colors xl:text-sm',
                    isActive ? 'text-stone-900' : 'text-stone-700 hover:text-stone-900'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}

            {/* More dropdown */}
            <div className="relative group">
              <button className="inline-flex items-center gap-1 text-[13px] font-medium text-stone-700 transition-colors hover:text-stone-900 xl:text-sm">
                More
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <div className="absolute left-0 top-full z-50 mt-2 hidden min-w-[160px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg group-hover:block">
                {moreNavLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href))
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'block px-4 py-3 text-sm font-medium transition-colors hover:bg-stone-50',
                        isActive ? 'text-stone-900 bg-stone-50' : 'text-stone-700'
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 lg:flex">
          {/* Request Samples button */}
          {/* Request Samples button */}
          <Link
            href="/request-samples"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition duration-200 hover:-translate-y-0.5 xl:px-4 xl:text-sm',
              pathname === '/request-samples'
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-emerald-800 bg-white text-emerald-800 hover:bg-emerald-50'
            )}
          >
            <PackageCheck className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
            <span className="hidden xl:inline">Request Samples</span>
            <span className="xl:hidden">Samples</span>
          </Link>

          {/* Currency selector */}
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

            {/* Request Samples button — mobile */}
            <Link
              href="/request-samples"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-800 bg-white px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              <PackageCheck className="h-4 w-4" />
              Request Samples
            </Link>

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