'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'customer'
  redirectTo?: string
}

export function AuthGuard({ children, requiredRole, redirectTo = '/login' }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function verifyUser() {
      try {
        const currentUser = await getCurrentUser()

        if (!currentUser) {
          router.push(redirectTo)
          return null
        }

        if (requiredRole && currentUser.role !== requiredRole) {
          if (currentUser.role === 'admin') {
            router.push('/admin/dashboard')
          } else {
            router.push('/portal')
          }
          return null
        }

        return currentUser
      } catch (error) {
        console.error('Auth check error:', error)
        router.push(redirectTo)
        return null
      }
    }

    async function checkAuth() {
      const currentUser = await verifyUser()
      if (currentUser) {
        setUser(currentUser)
      }
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          router.push(redirectTo)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const currentUser = await verifyUser()
          if (currentUser) {
            setUser(currentUser)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [requiredRole, redirectTo, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-sage-50 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600" />
        <p className="text-sm text-sage-700 text-center max-w-md">
          Sie sind nicht angemeldet oder die Sitzung ist abgelaufen. Sie werden weitergeleitet …
        </p>
      </div>
    )
  }

  return <>{children}</>
}
