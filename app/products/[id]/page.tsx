import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduct } from '@/lib/products/get-product'
import ProductPageClient from './ProductPageClient'

// Dynamic: prices come from Supabase and a new board must appear without a
// redeploy. Known limitation, present before this change too: an unknown slug
// renders the 404 page under a 200 rather than a real 404 status. Pinning
// dynamicParams to false would fix the status but would also mean a board added
// in the admin panel 404s until the next deploy, which is the worse trade.
export const revalidate = 0

const SITE = 'https://numatbamboo.com'

/**
 * Trim the Supabase description down to something a search result can show.
 * The stored copy runs to several lines for some boards, and a meta
 * description past roughly 160 characters just gets cut off mid word.
 */
function metaDescription(raw: string, name: string): string {
  const flat = raw.replace(/\s+/g, ' ').trim()
  if (!flat) {
    return `${name}, an engineered bamboo panel made in the Philippines by NUMAT.`
  }
  if (flat.length <= 155) return flat
  const cut = flat.slice(0, 155)
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '))
  return `${cut.slice(0, lastStop > 80 ? lastStop : 155).trim()}...`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return {
      title: 'Product not found | NUMAT Bamboo',
      robots: { index: false, follow: true },
    }
  }

  const url = `${SITE}/products/${product.slug || id}`
  const title = `${product.name} | Engineered Bamboo Panel | NUMAT`
  const description = metaDescription(product.description, product.name)
  const image = product.image_url?.startsWith('http')
    ? product.image_url
    : `${SITE}${product.image_url || '/placeholder-product.jpg'}`

  return {
    title,
    description,
    // Every product page used to inherit the homepage canonical and og:url, so
    // sharing a board previewed as the homepage and the three pages competed
    // with each other in search. Each one points at itself now.
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'NUMAT Bamboo',
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) notFound()

  // Handed to the client component as initial state, so the board name, price
  // and specs are in the served HTML rather than appearing only once JS runs.
  return <ProductPageClient initialProduct={product} />
}
