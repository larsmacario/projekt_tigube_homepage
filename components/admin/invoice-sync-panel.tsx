'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { InvoiceSyncCandidate } from '@/lib/types'
import { Loader2, RefreshCw } from 'lucide-react'

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE')
}

export function InvoiceSyncPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [candidates, setCandidates] = useState<InvoiceSyncCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const loadCandidates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(
        '/api/admin/integrations/sevdesk/invoice-candidates'
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Kandidaten konnten nicht geladen werden')
      }
      setCandidates(data.candidates ?? [])
      const readyIds = (data.candidates ?? [])
        .filter((candidate: InvoiceSyncCandidate) => candidate.blockers.length === 0)
        .map((candidate: InvoiceSyncCandidate) => candidate.requestGroupId)
      setSelectedIds(readyIds)
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Laden fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  async function handleSync() {
    if (selectedIds.length === 0) {
      toast({
        title: 'Keine Auswahl',
        description: 'Bitte mindestens eine Buchungsanfrage auswählen.',
        variant: 'destructive',
      })
      return
    }

    setSyncing(true)
    try {
      const response = await authenticatedFetch('/api/admin/integrations/sevdesk/sync-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestGroupIds: selectedIds }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Sync fehlgeschlagen')
      }

      toast({
        title: 'Rechnungs-Sync abgeschlossen',
        description: `${data.synced?.length ?? 0} Entwürfe erstellt, ${data.failed?.length ?? 0} Fehler.`,
      })
      await loadCandidates()
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Sync fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  function toggleSelection(id: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((value) => value !== id)
    )
  }

  const readyCount = candidates.filter((candidate) => candidate.blockers.length === 0).length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>SevDesk-Rechnungsentwürfe</CardTitle>
            <CardDescription className="mt-1">
              Abgeschlossene Buchungsanfragen als Entwurf nach SevDesk übertragen. Versand erfolgt
              manuell in SevDesk.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadCandidates()} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Aktualisieren</span>
            </Button>
            <Button onClick={() => void handleSync()} disabled={syncing || selectedIds.length === 0}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entwürfe erstellen ({selectedIds.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sage-600 py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Lade Rechnungskandidaten…
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-sage-600">Keine offenen Rechnungskandidaten gefunden.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-sage-600">
              {readyCount} von {candidates.length} Anfragen sind bereit für den Export.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Kunde</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Positionen</TableHead>
                  <TableHead>Summe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hinweise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => {
                  const isReady = candidate.blockers.length === 0
                  return (
                    <TableRow key={candidate.requestGroupId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(candidate.requestGroupId)}
                          disabled={!isReady}
                          onCheckedChange={(checked) =>
                            toggleSelection(candidate.requestGroupId, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{candidate.customerName}</div>
                        <div className="text-xs text-sage-500">
                          {candidate.kundennummer || 'Keine Kundennummer'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(candidate.startDate)} – {formatDate(candidate.endDate)}
                      </TableCell>
                      <TableCell>{candidate.lineItemCount}</TableCell>
                      <TableCell>{formatEuro(candidate.lineItemTotal)}</TableCell>
                      <TableCell>
                        <Badge variant={isReady ? 'default' : 'secondary'}>
                          {candidate.sevdeskInvoiceSyncStatus === 'failed'
                            ? 'Fehlgeschlagen'
                            : isReady
                              ? 'Bereit'
                              : 'Blockiert'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-sage-600 max-w-xs">
                        {candidate.blockers.length > 0
                          ? candidate.blockers.join(' · ')
                          : 'Bereit für SevDesk-Entwurf'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
