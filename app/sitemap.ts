import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://numatbamboo.com'

  const staticPages = [
    { url: baseUrl, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/products`, priority: 0.9, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/applications`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/technical-resources`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/testing`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/esg`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/compare`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/about`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/news`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/contact`, priority: 0.6, changeFrequency: 'yearly' as const },
    { url: `${baseUrl}/request-quote`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/request-samples`, priority: 0.8, changeFrequency: 'monthly' as const },
  ]

  return staticPages.map((page) => ({
    url: page.url,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
