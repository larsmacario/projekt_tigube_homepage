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
    let cancelled = false

    async function verifyUser(): Promise<User | null> {
      try {
        const currentUser = await getCurrentUser()

        if (!currentUser) {
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
        return null
      }
    }

    async function checkAuth() {
      const currentUser = await verifyUser()
      if (cancelled) return

      if (currentUser) {
        setUser(currentUser)
        setLoading(false)
        return
      }

      setLoading(false)
      router.push(redirectTo)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Kein async/await im Callback – verhindert Supabase-Auth-Deadlock
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push(redirectTo)
        return
      }

      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
        session
      ) {
        setTimeout(() => {
          if (cancelled) return
          verifyUser().then((currentUser) => {
            if (cancelled) return
            if (currentUser) {
              setUser(currentUser)
              setLoading(false)
            }
          })
        }, 0)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
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
