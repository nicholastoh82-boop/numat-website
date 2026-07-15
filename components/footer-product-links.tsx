'use client'

import Link from 'next/link'
import useSWR from 'swr'

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

// Fixed links pinned under the board list.
const tailLinks = [
  { name: 'All products and pricing', href: '/products' },
  { name: 'Compare vs Plywood', href: '/compare' },
  { name: 'Request a Sample', href: '/request-samples' },
  { name: 'Request a Quote', href: '/request-quote' },
]

/**
 * Product column of the footer.
 *
 * Split out of footer.tsx as its own client component on purpose. The footer is
 * a server component on most pages and should stay that way, so only this list
 * pays for the fetch.
 *
 * Reads the live list from Supabase rather than a hardcoded array, so adding or
 * retiring a board in the admin panel moves the footer with it. The nav asks for
 * the same '/api/products' key and SWR dedupes by key, so on any page rendering
 * both this costs no extra request.
 *
 * Ordering matches the nav and the homepage: featured first, then cheapest to
 * dearest.
 */
export default function FooterProductLinks() {
  const { data } = useSWR<ApiProduct[]>('/api/products', fetcher, {
    revalidateOnFocus: false,
  })

  const products = (Array.isArray(data) ? [...data] : [])
    .filter((product) => Boolean(product.slug))
    .sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
      return (a.starting_price_php ?? 0) - (b.starting_price_php ?? 0)
    })

  const links = [
    ...products.map((product) => ({
      name: product.name,
      href: `/products/${product.slug}`,
    })),
    ...tailLinks,
  ]

  return (
    <ul className="mt-5 space-y-3">
      {links.map((link) => (
        <li key={link.name}>
          <Link
            href={link.href}
            className="text-sm text-white/68 transition-colors hover:text-white"
          >
            {link.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
