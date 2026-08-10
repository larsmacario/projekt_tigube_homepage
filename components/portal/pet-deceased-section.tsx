'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDeceasedLabel, isPetDeceased } from '@/lib/pet-lifecycle'

type PetDeceasedSectionProps = {
  idPrefix?: string
  deceasedAt: string | null
  onChange: (deceasedAt: string | null) => void
  onPersist?: (deceasedAt: string | null) => Promise<void>
  disabled?: boolean
  persisting?: boolean
}

export function PetDeceasedSection({
  idPrefix = 'pet',
  deceasedAt,
  onChange,
  onPersist,
  disabled = false,
  persisting = false,
}: PetDeceasedSectionProps) {
  const [markDialogOpen, setMarkDialogOpen] = useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const deceased = isPetDeceased({ deceased_at: deceasedAt })

  function openMarkDialog() {
    setPendingDate(deceasedAt || today)
    setMarkDialogOpen(true)
  }

  async function confirmMarkDeceased() {
    if (!pendingDate.trim()) return
    onChange(pendingDate)
    setMarkDialogOpen(false)
    if (onPersist) {
      await onPersist(pendingDate)
    }
  }

  async function confirmReactivate() {
    onChange(null)
    setReactivateDialogOpen(false)
    if (onPersist) {
      await onPersist(null)
    }
  }

  if (deceased && deceasedAt) {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-4 space-y-3">
        <Badge variant="secondary" className="font-normal">
          {formatDeceasedLabel(deceasedAt)}
        </Badge>
        <p className="text-sm text-muted-foreground">
          Dieses Tier kann nicht mehr gebucht werden und erhält keine Impf-Erinnerungen.
          Die Daten bleiben in Ihrem Profil erhalten.
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReactivateDialogOpen(true)}
          >
            Wieder als aktiv markieren
          </Button>
        )}

        <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tier wieder als aktiv markieren?</AlertDialogTitle>
              <AlertDialogDescription>
                Das Tier wird wieder für Buchungen und Impf-Erinnerungen berücksichtigt.
                Der Verstorben-Status wird entfernt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReactivate} disabled={persisting}>
              Wieder aktiv setzen
            </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        Falls Ihr Tier verstorben ist oder nicht mehr bei Ihnen lebt, können Sie das hier
        dokumentieren. Das Tier bleibt in Ihrem Profil sichtbar.
      </p>
      {!disabled && (
        <Button type="button" variant="outline" size="sm" onClick={openMarkDialog}>
          Tier ist verstorben / von uns gegangen
        </Button>
      )}

      <AlertDialog open={markDialogOpen} onOpenChange={setMarkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tier als verstorben markieren</AlertDialogTitle>
            <AlertDialogDescription>
              Unser herzliches Beileid. Bitte geben Sie an, wann Ihr Tier verstorben ist
              oder nicht mehr bei Ihnen gelebt hat. Das Tier bleibt in Ihrem Profil erhalten,
              kann aber nicht mehr gebucht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor={`${idPrefix}-deceased-at`}>Datum</Label>
            <Input
              id={`${idPrefix}-deceased-at`}
              type="date"
              max={today}
              value={pendingDate}
              onChange={(e) => setPendingDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkDeceased} disabled={!pendingDate.trim() || persisting}>
              Speichern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
