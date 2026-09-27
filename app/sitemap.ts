import { MetadataRoute } from 'next'
import { getPublicSiteUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicSiteUrl()

  // Die 7 öffentlichen Seiten, die gecrawlt werden sollen
  const routes = [
    '',
    '/hundepension',
    '/katzenbetreuung',
    '/kundenstimmen',
    '/impressum',
    '/datenschutz',
    '/agb',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/kundenstimmen' ? 'weekly' : 'monthly',
    priority: 
      route === '' 
        ? 1.0 
        : (route.startsWith('/impressum') || route.startsWith('/datenschutz') || route.startsWith('/agb')) 
          ? 0.3 
          : 0.8,
  }))
}
