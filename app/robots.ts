import { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/portal/',
          '/api/',
          '/signature/',
          '/login/',
          '/onboarding/',
          '/rechtliches/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
