'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useCurrency } from '@/components/providers/currency-provider'
import { COUNTRY_OPTIONS } from '@/lib/currency'
import NewsletterTopBar from '@/components/newsletter-top-bar'

type NavChild = { label: string; href: string; description?: string }
type NavItem = { label: string; href?: string; children?: NavChild[] }

type ApiProduct = {
  id: string
  name: string
  slug: string
  is_featured: boolean
  starting_price_php: number | null
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// The Products group is built from Supabase at render time, so adding or
// retiring a board in the admin panel moves the nav with it instead of leaving
// a hardcoded list to drift. Everything below it is fixed.
const staticNavItems: NavItem[] = [
  { label: 'Applications', href: '/applications' },
  {
    label: 'Resources',
    children: [
      { label: 'Technical Resources', href: '/technical-resources' },
      { label: 'Testing', href: '/testing' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    label: 'Company',
    children: [
      { label: 'About', href: '/about' },
      { label: 'Investor Relations', href: '/esg' },
      { label: 'Contact', href: '/contact' },
    ],
  },
]

// Pinned to the bottom of the Products group, under the board links.
const productTailLinks: NavChild[] = [
  { label: 'All products and pricing', href: '/products' },
  { label: 'Compare vs Plywood', href: '/compare', description: 'Cost across reuse cycles' },
]

const LOGO_SRC = '/logo.png'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null)
  const { selectedCountry, setSelectedCountryCode, formatConvertedFromPhp } = useCurrency()
  const navRef = useRef<HTMLDivElement>(null)

  const { data: productsData } = useSWR<ApiProduct[]>('/api/products', fetcher, {
    revalidateOnFocus: false,
  })

  // Featured first, then cheapest to dearest, matching the homepage ordering.
  // Price shown converts from the PHP base at the same daily rate as the rest
  // of the site.
  const navItems: NavItem[] = useMemo(() => {
    const list = Array.isArray(productsData) ? [...productsData] : []
    list.sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
      return (a.starting_price_php ?? 0) - (b.starting_price_php ?? 0)
    })

    const productLinks: NavChild[] = list
      .filter((product) => Boolean(product.slug))
      .map((product) => ({
        label: product.name,
        href: `/products/${product.slug}`,
        description: product.starting_price_php
          ? `From ${formatConvertedFromPhp(product.starting_price_php)} a board`
          : undefined,
      }))

    return [
      { label: 'Products', children: [...productLinks, ...productTailLinks] },
      ...staticNavItems,
    ]
  }, [productsData, formatConvertedFromPhp])

  // Close the desktop dropdown on outside click and on Escape.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenGroup(null)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    setOpenGroup(null)
    setMobileMenuOpen(false)
  }, [pathname])

  const isChildActive = (children: NavChild[]) =>
    children.some((child) => pathname === child.href || pathname?.startsWith(`${child.href}/`))

  return (
    // The newsletter bar and the nav travel together as one sticky unit, so the
    // bar follows the scroll instead of being left behind at the top of the
    // page. Once the visitor subscribes or dismisses it, NewsletterTopBar
    // unmounts itself and the nav alone keeps sticking to the top.
    <div className="sticky top-0 z-50">
      <NewsletterTopBar />
      <header className="w-full border-b border-stone-200 bg-[#e7e1d8]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8 xl:gap-10" ref={navRef}>
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src={LOGO_SRC}
              alt="NuMat Bamboo"
              width={170}
              height={52}
              priority
              className="h-auto w-[130px] sm:w-[150px] lg:w-[165px]"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex xl:gap-2">
            {navItems.map((item) => {
              if (!item.children) {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href ?? ''))
                return (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className={cn(
                      'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium tracking-[0.01em] transition-colors',
                      isActive
                        ? 'text-stone-900'
                        : 'text-stone-700 hover:bg-white/60 hover:text-stone-900'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              }

              const isOpen = openGroup === item.label
              const isActive = isChildActive(item.children)

              return (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenGroup(isOpen ? null : item.label)}
                    className={cn(
                      'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium tracking-[0.01em] transition-colors',
                      isActive || isOpen
                        ? 'bg-white/70 text-stone-900'
                        : 'text-stone-700 hover:bg-white/60 hover:text-stone-900'
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                      {item.children.map((child) => {
                        const childActive =
                          pathname === child.href || pathname?.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'block rounded-xl px-3 py-2.5 transition-colors',
                              childActive ? 'bg-stone-100' : 'hover:bg-stone-50'
                            )}
                          >
                            <span className="block text-sm font-semibold text-stone-900">
                              {child.label}
                            </span>
                            {child.description && (
                              <span className="mt-0.5 block text-xs leading-5 text-stone-500">
                                {child.description}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Desktop right: currency plus sample call to action */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="relative flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 shadow-sm">
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
              className="appearance-none bg-transparent pl-0 pr-6 text-sm font-medium text-stone-800 outline-none"
            >
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.currency})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
          </div>

          <Link
            href="/request-samples"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-900"
          >
            Request Sample
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
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

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                if (!item.children) {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname?.startsWith(item.href ?? ''))
                  return (
                    <Link
                      key={item.label}
                      href={item.href!}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-700 hover:bg-white/70 hover:text-stone-900'
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                }

                const isOpen = openMobileGroup === item.label

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenMobileGroup(isOpen ? null : item.label)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-white/70"
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="ml-3 flex flex-col border-l border-stone-300 pl-3">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-white/70 hover:text-stone-900"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <Link
              href="/request-samples"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Request Sample
            </Link>
          </div>
        </div>
      )}
    </header>
    </div>
  )
}
