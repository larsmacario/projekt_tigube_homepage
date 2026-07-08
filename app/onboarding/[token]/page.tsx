'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Contact } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [lead, setLead] = useState<Partial<Contact> | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'verify' | 'register'>('verify')

  useEffect(() => {
    if (token) {
      verifyToken()
    }
  }, [token])

  async function verifyToken() {
    try {
      console.log('Verifying token:', token)
      const response = await fetch('/api/onboarding/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      console.log('Response status:', response.status, response.statusText)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      type VerifyJson = { error?: string; message?: string; lead?: Partial<Contact> }
      let data: VerifyJson = {}
      let responseText = ''
      
      try {
        responseText = await response.text()
        console.log('Response text:', responseText)
        
        if (responseText) {
          try {
            data = JSON.parse(responseText) as VerifyJson
            console.log('Parsed data:', data)
          } catch (parseError) {
            console.error('JSON parse error:', parseError)
            console.error('Response text that failed to parse:', responseText)
            data = { error: 'Ungültige JSON-Antwort vom Server' }
          }
        } else {
          console.error('Empty response body')
          data = { error: 'Leere Antwort vom Server' }
        }
      } catch (readError) {
        console.error('Error reading response:', readError)
        data = { error: 'Fehler beim Lesen der Server-Antwort' }
      }

      if (!response.ok) {
        console.error('Token verification error:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          responseText: responseText
        })
        const errorMessage = data.error || data.message || `Fehler ${response.status}: ${response.statusText || 'Ungültiger Token'}`
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (!data.lead) {
        console.error('No lead data in response:', data)
        setError('Keine Kundendaten gefunden')
        setLoading(false)
        return
      }

      setLead(data.lead)
      setEmail(data.lead.email)
      setStep('register')
    } catch (error: any) {
      console.error('Error verifying token:', error)
      setError(error.message || 'Fehler bei der Token-Validierung')
    } finally {
      setLoading(false)
    }
  }

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

    try {
      const response = await fetch('/api/auth/register', {
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

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (sessionError) throw sessionError

      // Redirect direkt zur Profil-Seite, um das Onboarding fortzusetzen
      router.push('/portal/profile?onboarding=true')
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  if (step === 'verify' && error) {
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
              Bitte kontaktieren Sie uns, wenn das Problem weiterhin besteht.
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
            Willkommen bei Tierisch Gut Betreut!
          </CardTitle>
          <CardDescription className="text-center">
            Erstellen Sie Ihr Kundenkonto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lead && (
            <div className="mb-6 p-4 bg-sage-50 rounded-lg">
              <p className="text-sm text-sage-700">
                <strong>Ihre Daten:</strong>
              </p>
              <p className="text-sm text-sage-600 mt-1">
                {lead.vorname} {lead.nachname}
              </p>
              <p className="text-sm text-sage-600">{lead.email}</p>
            </div>
          )}

          {lead?.user_id ? (
            <div className="space-y-4">
              <div className="bg-sage-50 border border-sage-200 text-sage-800 px-4 py-3 rounded text-center text-sm">
                Ihr Kundenkonto wurde bereits erfolgreich erstellt. Sie können sich direkt anmelden, um Ihr Onboarding fortzusetzen.
              </div>
              <Button
                onClick={() => router.push('/login?redirectTo=/portal/profile?onboarding=true')}
                className="w-full bg-sage-600 hover:bg-sage-700"
              >
                Zur Anmeldung
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
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
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-sage-600 hover:bg-sage-700"
              >
                Konto erstellen
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

