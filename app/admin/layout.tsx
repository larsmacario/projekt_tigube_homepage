'use client'

import { AuthGuard } from '@/components/auth/auth-guard'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login')
        return
      }
      setUser(currentUser)
    }
    loadUser()
  }, [router])

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-sage-50">
        <nav className="bg-white border-b border-sage-200">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/admin/dashboard" className="text-xl font-bold text-sage-900">
                  Admin
                </Link>
                <div className="flex space-x-4">
                  <Link
                    href="/admin/dashboard"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/leads"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Leads
                  </Link>
                  <Link
                    href="/admin/customers"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Kunden
                  </Link>
                  <Link
                    href="/admin/newsbar"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    NewsBar
                  </Link>
                  <Link
                    href="/admin/properties"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Eigenschaften
                  </Link>
                  <Link
                    href="/admin/prices"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Preise
                  </Link>
                  <Link
                    href="/admin/bookings"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    Buchungen
                  </Link>
                  <Link
                    href="/admin/newsletter"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    E-Mails
                  </Link>
                  <Link
                    href="/admin/cms"
                    className="px-3 py-2 rounded-md text-sm font-medium text-sage-700 hover:bg-sage-100"
                  >
                    CMS
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
  )
}


