'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  ACCOUNT_DELETION_CONFIRMATION,
  type CustomerDeletionPreview,
} from '@/lib/customer-deletion'
import { mapPortalApiError } from '@/lib/portal-api-errors'
import { signOut } from '@/lib/auth'

export function AccountDeletionSection() {
  const router = useRouter()
  const { toast } = useToast()
  const [preview, setPreview] = useState<CustomerDeletionPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      setLoadingPreview(true)
      try {
        const response = await authenticatedFetch('/api/portal/account')
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(data.error || 'Lösch-Vorschau konnte nicht geladen werden')
        }
        if (!cancelled) {
          setPreview(data.preview || null)
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Fehler',
            description: mapPortalApiError(
              error instanceof Error ? error.message : 'Lösch-Vorschau konnte nicht geladen werden'
            ),
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) {
          setLoadingPreview(false)
        }
      }
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [toast])

  async function handleDeleteAccount() {
    if (confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
      toast({
        title: 'Bestätigung erforderlich',
        description: `Bitte gib exakt „${ACCOUNT_DELETION_CONFIRMATION}" ein.`,
        variant: 'destructive',
      })
      return
    }

    setDeleting(true)
    try {
      const response = await authenticatedFetch('/api/portal/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: ACCOUNT_DELETION_CONFIRMATION }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Konto konnte nicht gelöscht werden')
      }

      try {
        await signOut()
      } catch {
        // Session ist nach Auth-Löschung ohnehin ungültig.
      }

      setDialogOpen(false)
      router.push('/konto-geloescht')
    } catch (error) {
      toast({
        title: 'Fehler',
        description: mapPortalApiError(
          error instanceof Error ? error.message : 'Konto konnte nicht gelöscht werden'
        ),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-800">Konto löschen</CardTitle>
        <CardDescription>
          Hier kannst du dein Kundenkonto dauerhaft löschen. Diese Aktion kann nicht rückgängig
          gemacht werden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingPreview ? (
          <p className="text-sm text-sage-600">Lade Informationen zur Löschung…</p>
        ) : preview ? (
          <div className="space-y-4 text-sm text-sage-700">
            <div>
              <p className="font-medium text-sage-900">Folgende Daten werden gelöscht:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {preview.deletedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {preview.willAnonymize && preview.retainedItems.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="font-medium">Aufbewahrungspflicht des Betreibers</p>
                <p className="mt-1">
                  Aufgrund gesetzlicher Aufbewahrungspflichten (Rechnungen und ggf. Vertrag)
                  bleiben bestimmte Daten anonymisiert erhalten, bis voraussichtlich{' '}
                  {preview.retentionUntil
                    ? new Date(`${preview.retentionUntil}T12:00:00`).toLocaleDateString('de-DE')
                    : 'zum Ablauf der gesetzlichen Frist'}
                  .
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {preview.retainedItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {!preview.willAnonymize && (
              <p>
                Es liegen keine abrechnungsrelevanten Daten vor, die eine gesetzliche
                Aufbewahrung erfordern. Dein Konto wird vollständig gelöscht.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-sage-600">
            Informationen zur Löschung konnten nicht geladen werden.
          </p>
        )}

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={loadingPreview || !preview}>
              Konto endgültig löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konto wirklich endgültig löschen?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-sage-700">
                  <p>
                    Dein Portal-Zugang wird sofort entfernt. Personenbezogene Daten werden
                    gelöscht
                    {preview?.willAnonymize
                      ? ', abrechnungsrelevante Unterlagen bleiben anonymisiert aufbewahrt.'
                      : '.'}
                  </p>
                  <div>
                    <Label htmlFor="account-delete-confirmation">
                      Zur Bestätigung bitte „{ACCOUNT_DELETION_CONFIRMATION}" eingeben
                    </Label>
                    <Input
                      id="account-delete-confirmation"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      className="mt-2"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => void handleDeleteAccount()}
                disabled={deleting || confirmation !== ACCOUNT_DELETION_CONFIRMATION}
                loading={deleting}
              >
                {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
