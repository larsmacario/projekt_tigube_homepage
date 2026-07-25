'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { AuthSessionProvider } from '@/components/auth/auth-session-provider'
import { AdminAppShell } from '@/components/admin/admin-app-shell'
import { AdminMetricsProvider } from '@/components/admin/admin-metrics-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth'

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
        <AdminMetricsProvider>
          <AdminAppShell userEmail={user?.email} onLogout={handleLogout}>
            {children}
          </AdminAppShell>
        </AdminMetricsProvider>
      </AuthGuard>
    </AuthSessionProvider>
  )
}
