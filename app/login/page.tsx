'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Prüfe ob bereits eingeloggt
    async function checkAuth() {
      const user = await getCurrentUser()
      if (user) {
        // Redirect basierend auf Rolle
        if (user.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/portal')
        }
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen')
      }

      console.log('Login erfolgreich, User:', data.user)

      // Setze Session im Supabase Client
      if (data.session && data.session.access_token && data.session.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })

        if (sessionError) {
          console.error('Error setting session:', sessionError)
          throw new Error('Fehler beim Setzen der Session')
        }

        // Cookies sofort synchronisieren, bevor Redirect (AuthSessionProvider läuft erst danach)
        await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        })
      } else {
        console.error('Keine Session-Daten erhalten:', data)
        throw new Error('Session-Daten fehlen')
      }

      // Redirect basierend auf Rolle
      if (data.user && data.user.role === 'admin') {
        console.log('Redirect zu Admin Dashboard')
        window.location.href = '/admin/dashboard' // Verwende window.location für vollständigen Reload
      } else if (data.user) {
        console.log('Redirect zu Portal')
        window.location.href = '/portal'
      } else {
        throw new Error('Benutzerdaten konnten nicht geladen werden')
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
      <div className="w-full max-w-md">
        <Link 
          href="/" 
          className="inline-flex items-center text-sage-600 hover:text-sage-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Startseite
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Anmelden</CardTitle>
            <CardDescription className="text-center">
              Melden Sie sich mit Ihren Zugangsdaten an
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="ihre@email.de"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-sage-600 hover:bg-sage-700"
              disabled={loading}
            >
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </Button>

            <div className="text-center">
              <Link href="/login/forgot-password" className="text-sm text-sage-600 hover:text-sage-700">
                Passwort vergessen?
              </Link>
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  )
}


