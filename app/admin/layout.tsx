'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { AuthSessionProvider } from '@/components/auth/auth-session-provider'
import { AppShell } from '@/components/layout/app-shell'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth'
import { adminNavItems, adminShellConfig } from '@/lib/admin-nav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser()
      if (currentUser?.role === 'admin') {
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
      <AuthGuard requiredRole="admin">
        <AppShell
          title={adminShellConfig.title}
          homeHref={adminShellConfig.homeHref}
          navItems={adminNavItems}
          userEmail={user?.email}
          onLogout={handleLogout}
        >
          {children}
        </AppShell>
      </AuthGuard>
    </AuthSessionProvider>
  )
}
