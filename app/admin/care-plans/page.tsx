'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCheck, Eye, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { useAdminMetrics } from '@/components/admin/admin-metrics-provider'
import type { PetCarePlanChangeGroup } from '@/lib/types'

export default function AdminCarePlansPage() {
  const [groups, setGroups] = useState<PetCarePlanChangeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const { refreshMetrics } = useAdminMetrics()

  const loadChanges = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/admin/care-plan-changes')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Laden')
      setGroups(data.groups || [])
    } catch (error) {
      console.error(error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChanges()
  }, [loadChanges])

  async function markSeen(petId: string) {
    const response = await authenticatedFetch(`/api/admin/care-plan-changes/pet/${petId}/seen`, {
      method: 'POST',
    })
    if (!response.ok) return

    const now = new Date().toISOString()
    setGroups((prev) =>
      prev.map((group) =>
        group.pet_id === petId
          ? {
              ...group,
              has_unseen: false,
              unseen_count: 0,
              changes: group.changes.map((change) => ({
                ...change,
                seen_at: change.seen_at ?? now,
              })),
            }
          : group
      )
    )
    await refreshMetrics()
  }

  function printHref(group: PetCarePlanChangeGroup): string {
    const base = `/admin/customers/${group.customer_id}/pets/${group.pet_id}/care-plan/print`
    if (group.current_change_id) {
      return `${base}?version=${group.current_change_id}`
    }
    return base
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
            Ungelesene Einträge erscheinen als Badge in der Navigation – gebündelt pro Tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-sage-600">Lade…</p>
          ) : groups.length === 0 ? (
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
                  {groups.map((group) => {
                    const customerName = group.customer
                      ? `${group.customer.vorname || ''} ${group.customer.nachname || ''}`.trim()
                      : '–'
                    const olderChanges = group.changes.slice(1)

                    return (
                      <tr key={group.pet_id} className="border-b border-sage-100 align-top">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <div>{new Date(group.latest_at).toLocaleString('de-DE')}</div>
                          {group.version_count > 1 && (
                            <div className="text-xs text-sage-500">
                              ({group.version_count} Versionen)
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {customerName || group.customer?.email || '–'}
                        </td>
                        <td className="py-3 pr-4">{group.pet?.name || '–'}</td>
                        <td className="py-3 pr-4">
                          <p>{group.current_summary}</p>
                          {olderChanges.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-sage-500">
                              {olderChanges.map((change) => (
                                <li key={change.id}>
                                  {new Date(change.changed_at).toLocaleString('de-DE')}:{' '}
                                  {change.summary}
                                  {change.archived_at && ' · Archiv'}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {group.has_unseen ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300">
                              Neu
                            </Badge>
                          ) : (
                            <Badge variant="outline">Gelesen</Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-auto sm:px-3"
                            >
                              <Link
                                href={`/admin/customers/${group.customer_id}`}
                                aria-label="Ansehen"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline sm:ml-2">Ansehen</span>
                              </Link>
                            </Button>
                            {group.pet_id && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-auto sm:px-3"
                              >
                                <Link
                                  href={printHref(group)}
                                  target="_blank"
                                  aria-label="Drucken"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span className="hidden sm:inline sm:ml-2">Drucken</span>
                                </Link>
                              </Button>
                            )}
                            {group.has_unseen && (
                              <Button
                                size="sm"
                                className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-auto sm:px-3"
                                aria-label="Als gelesen markieren"
                                onClick={() => void markSeen(group.pet_id)}
                              >
                                <CheckCheck className="h-4 w-4" />
                                <span className="hidden sm:inline sm:ml-2">Als gelesen</span>
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
