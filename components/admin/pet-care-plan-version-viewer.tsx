'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Archive, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PetCarePlanPrintView } from '@/components/portal/pet-care-plan-print'
import { canArchiveVersion } from '@/lib/care-plan-versions'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { PetCarePlanChange, PetCarePlanVersion } from '@/lib/types'

type PetCarePlanVersionViewerProps = {
  petId: string
  customerId: string
  petName: string
  customerName?: string
  liveCarePlan: unknown
}

export function PetCarePlanVersionViewer({
  petId,
  customerId,
  petName,
  customerName,
  liveCarePlan,
}: PetCarePlanVersionViewerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [versions, setVersions] = useState<PetCarePlanVersion[]>([])
  const [changes, setChanges] = useState<PetCarePlanChange[]>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/admin/pets/${petId}/care-plan/versions`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Laden')

      setVersions(data.versions || [])
      setChanges(data.changes || [])
    } catch (error) {
      console.error(error)
      setVersions([])
      setChanges([])
    } finally {
      setLoading(false)
    }
  }, [petId])

  useEffect(() => {
    void loadVersions()
  }, [loadVersions])

  const selectedVersionId = searchParams.get('version')

  const selectedIndex = useMemo(() => {
    if (versions.length === 0) return -1
    if (selectedVersionId) {
      const index = versions.findIndex((version) => version.id === selectedVersionId)
      if (index >= 0) return index
    }
    return versions.findIndex((version) => version.is_current)
  }, [selectedVersionId, versions])

  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0
  const activeVersion = versions[activeIndex] ?? null

  function navigateToVersion(versionId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('version', versionId)
    router.replace(
      `/admin/customers/${customerId}/pets/${petId}/care-plan/print?${params.toString()}`
    )
  }

  async function archiveCurrentVersion() {
    if (!activeVersion) return
    setArchiving(true)
    try {
      const response = await authenticatedFetch(
        `/api/admin/care-plan-changes/${activeVersion.id}/archive`,
        { method: 'POST' }
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Archivieren fehlgeschlagen')
      }
      await loadVersions()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Archivieren fehlgeschlagen')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return <p className="p-8 text-center text-sage-600">Lade Pflegeplan…</p>
  }

  const carePlan =
    activeVersion?.care_plan_snapshot ??
    (versions.length === 0 ? liveCarePlan : null)

  const showVersionNav = versions.length > 0
  const activeChange = changes.find((change) => change.id === activeVersion?.id) ?? null
  const archiveAllowed =
    activeChange != null && canArchiveVersion(activeChange, changes)

  const toolbar = showVersionNav ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={activeIndex >= versions.length - 1}
        aria-label="Ältere Version"
        onClick={() => navigateToVersion(versions[activeIndex + 1].id)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-sage-700 tabular-nums">
        Version {activeIndex + 1} von {versions.length}
        {activeVersion && (
          <> · {new Date(activeVersion.changed_at).toLocaleString('de-DE')}</>
        )}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={activeIndex <= 0}
        aria-label="Neuere Version"
        onClick={() => navigateToVersion(versions[activeIndex - 1].id)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {activeVersion?.is_current && (
        <Badge className="bg-green-100 text-green-900 border-green-300">Aktuell</Badge>
      )}
      {activeVersion?.archived_at && (
        <Badge variant="outline">Archiv</Badge>
      )}
      {archiveAllowed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={archiving}
          onClick={() => void archiveCurrentVersion()}
        >
          <Archive className="mr-2 h-4 w-4" />
          Archivieren
        </Button>
      )}
    </div>
  ) : (
    <p className="text-sm text-sage-600">
      Für ältere Einträge ohne gespeicherten Plan steht nur der aktuelle Live-Plan zur Verfügung.
    </p>
  )

  return (
    <PetCarePlanPrintView
      petName={petName}
      customerName={customerName}
      carePlan={carePlan}
      standDate={activeVersion?.changed_at}
      toolbar={toolbar}
    />
  )
}
