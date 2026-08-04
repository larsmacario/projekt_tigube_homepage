'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { useAdminMetrics } from '@/components/admin/admin-metrics-provider'
import type { PetCarePlanChange } from '@/lib/types'

export default function AdminCarePlansPage() {
  const [changes, setChanges] = useState<PetCarePlanChange[]>([])
  const [loading, setLoading] = useState(true)
  const { refreshMetrics } = useAdminMetrics()

  const loadChanges = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/admin/care-plan-changes')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Laden')
      setChanges(data.changes || [])
    } catch (error) {
      console.error(error)
      setChanges([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChanges()
  }, [loadChanges])

  async function markSeen(id: string) {
    const response = await authenticatedFetch(`/api/admin/care-plan-changes/${id}/seen`, {
      method: 'POST',
    })
    if (!response.ok) return
    setChanges((prev) =>
      prev.map((change) =>
        change.id === id ? { ...change, seen_at: new Date().toISOString() } : change
      )
    )
    await refreshMetrics()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Pflegepläne</h1>
        <p className="mt-2 text-sage-600">
          Änderungen an Futter- und Medikamentenplänen durch Kunden oder Admins.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Änderungsprotokoll</CardTitle>
          <CardDescription>
            Ungelesene Einträge erscheinen als Badge in der Navigation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-sage-600">Lade…</p>
          ) : changes.length === 0 ? (
            <p className="text-sm text-sage-600">Keine Änderungen vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-sage-200 text-left">
                    <th className="py-2 pr-4">Datum</th>
                    <th className="py-2 pr-4">Kunde</th>
                    <th className="py-2 pr-4">Tier</th>
                    <th className="py-2 pr-4">Änderung</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change) => {
                    const customerName = change.customer
                      ? `${change.customer.vorname || ''} ${change.customer.nachname || ''}`.trim()
                      : '–'
                    return (
                      <tr key={change.id} className="border-b border-sage-100 align-top">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {new Date(change.changed_at).toLocaleString('de-DE')}
                        </td>
                        <td className="py-3 pr-4">{customerName || change.customer?.email || '–'}</td>
                        <td className="py-3 pr-4">{change.pet?.name || '–'}</td>
                        <td className="py-3 pr-4">{change.summary}</td>
                        <td className="py-3 pr-4">
                          {change.seen_at ? (
                            <Badge variant="outline">Gelesen</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300">Neu</Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/customers/${change.customer_id}`}>Ansehen</Link>
                            </Button>
                            {change.pet_id && (
                              <Button asChild size="sm" variant="outline">
                                <Link
                                  href={`/admin/customers/${change.customer_id}/pets/${change.pet_id}/care-plan/print`}
                                  target="_blank"
                                >
                                  Drucken
                                </Link>
                              </Button>
                            )}
                            {!change.seen_at && (
                              <Button size="sm" onClick={() => void markSeen(change.id)}>
                                Als gelesen
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
