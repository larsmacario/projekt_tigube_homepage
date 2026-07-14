import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tierischgutbetreut.de'
  const baseUrl = rawUrl.replace('https:/t', 'https://t')

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
