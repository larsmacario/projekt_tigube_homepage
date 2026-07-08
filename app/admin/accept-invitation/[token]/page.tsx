'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [invite, setInvite] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      verifyToken()
    }
  }, [token])

  async function verifyToken() {
    try {
      const response = await fetch('/api/admin/invites/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Ungültiger oder abgelaufener Einladungslink')
        setLoading(false)
        return
      }

      setInvite(data.invite)
      setEmail(data.invite.email)
    } catch (err: any) {
      console.error('Error verifying token:', err)
      setError('Fehler bei der Überprüfung des Einladungslinks')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/admin/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registrierung fehlgeschlagen')
      }

      if (!data.session?.access_token || !data.session?.refresh_token) {
        throw new Error('Konto erstellt, aber keine Sitzung erhalten. Bitte melde dich an.')
      }

      // Session im Supabase Client setzen
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (sessionError) throw sessionError

      setSuccess(true)
      
      // Weiterleiten zum Admin Dashboard nach kurzem Delay
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  if (loading && !invite && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-red-600">
              Fehler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sage-600">{error}</p>
            <p className="text-center text-sm text-sage-500 mt-4">
              Bitte wenden Sie sich an die Administration, um eine neue Einladung zu erhalten.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sage-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Admin-Konto einrichten
          </CardTitle>
          <CardDescription className="text-center">
            Legen Sie Ihr Passwort fest, um Ihren Zugang freizuschalten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="bg-sage-50 border border-sage-200 text-sage-800 px-4 py-3 rounded text-center text-sm">
              Konto erfolgreich eingerichtet! Weiterleitung zum Dashboard...
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {invite && (
                <div className="mb-4 p-4 bg-sage-50 border border-sage-100 rounded-lg">
                  <p className="text-sm text-sage-700">
                    <strong>Einladung für:</strong>
                  </p>
                  <p className="text-sm text-sage-600 mt-1">
                    {invite.vorname} {invite.nachname}
                  </p>
                  <p className="text-sm text-sage-600">{invite.email}</p>
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
                  disabled
                  className="bg-sage-100"
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
                  placeholder="Mindestens 8 Zeichen"
                  minLength={8}
                  disabled={loading}
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
                  placeholder="Passwort wiederholen"
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-sage-600 hover:bg-sage-700"
              >
                {loading ? 'Konto wird erstellt...' : 'Konto erstellen'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
