import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getProductSlugs } from '@/lib/products/get-product'
import { technicalResourceDetails } from '@/lib/technical-resources-content'
import { solutions } from '@/lib/solutions-data'

export const revalidate = 3600

const BASE = 'https://numatbamboo.com'

/** Published blog slugs. Returns empty rather than throwing, a sitemap that is
 *  short by a few URLs beats a sitemap that 500s. */
async function getBlogSlugs(): Promise<{ slug: string; updated: Date }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return []
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await supabase
      .from('news')
      .select('slug, published_at')
      .eq('status', 'published')
    return (data ?? [])
      .filter((row) => Boolean(row.slug))
      .map((row) => ({
        slug: row.slug as string,
        updated: row.published_at ? new Date(row.published_at) : new Date(),
      }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: BASE, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${BASE}/products`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${BASE}/applications`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE}/solutions`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE}/technical-resources`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE}/testing`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${BASE}/esg`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE}/compare`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE}/about`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${BASE}/blog`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${BASE}/faq`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${BASE}/contact`, priority: 0.6, changeFrequency: 'yearly' as const },
    { url: `${BASE}/request-quote`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${BASE}/shipping`, priority: 0.5, changeFrequency: 'yearly' as const },
  ]

  // Product and blog pages were missing entirely, so the only board Google was
  // told about was the /products listing. Pulled live rather than hardcoded, so
  // retiring a board in the admin panel drops it from the sitemap too.
  const [productSlugs, blogPosts] = await Promise.all([getProductSlugs(), getBlogSlugs()])

  const now = new Date()

  return [
    ...staticPages.map((page) => ({
      url: page.url,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...productSlugs.map((slug) => ({
      url: `${BASE}/products/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    ...blogPosts.map((post) => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: post.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...technicalResourceDetails.map((item) => ({
      url: `${BASE}/technical-resources/${item.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...solutions.map((item) => ({
      url: `${BASE}/solutions/${item.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
