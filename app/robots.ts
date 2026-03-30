import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/cart/',
          '/request-quote/confirmation',
        ],
      },
    ],
    sitemap: 'https://numatbamboo.com/sitemap.xml',
  }
}
