'use client'

import { usePathname } from 'next/navigation'
import { NewsBar } from '@/components/news-bar'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Ausblenden für Onboarding, Login und Portal/Admin (die haben eigene Layouts)
  const hideNavAndFooter = pathname?.startsWith('/onboarding') || 
                           pathname?.startsWith('/login') ||
                           pathname?.startsWith('/portal') ||
                           pathname?.startsWith('/admin') ||
                           pathname?.startsWith('/signature')

  if (hideNavAndFooter) {
    return <>{children}</>
  }

  return (
    <>
      <NewsBar />
      <Navigation />
      {children}
      <Footer />
    </>
  )
}

