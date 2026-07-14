import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tierischgutbetreut.de'
  const baseUrl = rawUrl.replace('https:/t', 'https://t')

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
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
