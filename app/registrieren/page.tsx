'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export default function RegistrierenPage() {
  const router = useRouter()
  const [kundennummer, setKundennummer] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/register-by-kundennummer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kundennummer, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registrierung fehlgeschlagen')
      }

      if (!data.session?.access_token || !data.session?.refresh_token) {
        throw new Error('Konto erstellt, aber keine Sitzung erhalten. Bitte melde dich an.')
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (sessionError) throw sessionError

      router.push('/portal/profile?onboarding=true')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">
            Kundenkonto aktivieren
          </CardTitle>
          <CardDescription className="text-center">
            Lege dein Passwort fest und starte direkt mit dem Onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-sage-600 text-center">
            Deine Kundennummer findest du auf deiner Rechnung.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="kundennummer">Kundennummer</Label>
              <Input
                id="kundennummer"
                value={kundennummer}
                onChange={(e) => setKundennummer(e.target.value)}
                required
                autoComplete="off"
                placeholder="z. B. 10001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="deine@email.de"
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
                minLength={8}
                autoComplete="new-password"
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Passwort wiederholen"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-sage-600 hover:bg-sage-700"
              disabled={loading}
            >
              {loading ? 'Wird erstellt…' : 'Konto erstellen & Onboarding starten'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-sm text-sage-600">
            <Link href="/login" className="hover:text-sage-800 underline">
              Bereits aktiviert? Zur Anmeldung
            </Link>
            <Link href="/login/forgot-password" className="hover:text-sage-800 underline">
              Passwort vergessen?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
