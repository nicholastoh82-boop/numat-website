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
          '/auth/',
          '/cart/',
          '/crm/',
          '/finance/',
          '/portal/',
          '/quote/confirmation',
          '/request-quote/confirmation',
          '/sead-portal',
          '/unsubscribe/',
          '/ve-report',
        ],
      },
    ],
    sitemap: 'https://numatbamboo.com/sitemap.xml',
  }
}
