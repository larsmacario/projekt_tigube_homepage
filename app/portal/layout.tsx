'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { AuthSessionProvider } from '@/components/auth/auth-session-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { NewsBar } from '@/components/news-bar'
import Link from 'next/link'

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
      <div className="min-h-screen bg-sage-50">
        <NewsBar />
        <nav className="bg-white border-b border-sage-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/portal" className="text-xl font-bold text-sage-900">
                  Mein Kundenportal
                </Link>
                <div className="flex space-x-4">
                  <Link
                    href="/portal"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Übersicht
                  </Link>
                  <Link
                    href="/portal/profile"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Profil
                  </Link>
                  <Link
                    href="/portal/pets"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Tiere
                  </Link>
                  <Link
                    href="/portal/documents"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Dokumente
                  </Link>
                  <Link
                    href="/portal/prices"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Preise
                  </Link>
                  <Link
                    href="/portal/bookings"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Buchungen
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {user && (
                  <span className="text-sm text-sage-600">{user.email}</span>
                )}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-sage-300 text-sage-700 hover:bg-sage-50"
                >
                  Abmelden
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      </AuthGuard>
    </AuthSessionProvider>
  )
}


