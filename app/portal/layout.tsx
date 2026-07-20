'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { AuthSessionProvider } from '@/components/auth/auth-session-provider'
import { AppShell } from '@/components/layout/app-shell'
import { NewsBar } from '@/components/news-bar'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth'
import { portalNavItems, portalShellConfig } from '@/lib/portal-nav'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser()
      if (currentUser?.role === 'customer') {
        setUser(currentUser)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout API failed', e)
    }
    await signOut()
    router.push('/login')
  }

  return (
    <AuthSessionProvider>
      <AuthGuard requiredRole="customer">
        <AppShell
          title={portalShellConfig.title}
          homeHref={portalShellConfig.homeHref}
          navItems={portalNavItems}
          userEmail={user?.email}
          onLogout={handleLogout}
          banner={<NewsBar />}
        >
          {children}
        </AppShell>
      </AuthGuard>
    </AuthSessionProvider>
  )
}
