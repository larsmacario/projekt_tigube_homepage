'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Archive, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PetCarePlanLegacyVersion } from '@/components/admin/pet-care-plan-legacy-version'
import { PetCarePlanPrintView } from '@/components/portal/pet-care-plan-print'
import { pdfInputFromVersion } from '@/lib/care-plan-pdf-from-group'
import { canArchiveVersion, hasCarePlanSnapshot } from '@/lib/care-plan-versions'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  buildPetCarePlanPdf,
  downloadPetCarePlanPdf,
  petCarePlanPdfFilename,
} from '@/lib/pet-care-plan-pdf'
import type { PetCarePlanChange, PetCarePlanVersion } from '@/lib/types'

type PetCarePlanVersionViewerProps = {
  petId: string
  customerId: string
  petName: string
  customerName?: string
  liveCarePlan: unknown
}

function VersionToolbar({
  versions,
  activeIndex,
  activeVersion,
  archiveAllowed,
  archiving,
  downloadingPdf,
  onNavigate,
  onArchive,
  onDownloadPdf,
}: {
  versions: PetCarePlanVersion[]
  activeIndex: number
  activeVersion: PetCarePlanVersion | null
  archiveAllowed: boolean
  archiving: boolean
  downloadingPdf: boolean
  onNavigate: (versionId: string) => void
  onArchive: () => void
  onDownloadPdf: () => void
}) {
  if (versions.length === 0) return null

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-2 border-b border-sage-200 pb-4 px-8 pt-8">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={activeIndex >= versions.length - 1}
        aria-label="Ältere Version"
        onClick={() => onNavigate(versions[activeIndex + 1].id)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline sm:ml-2">Zurück</span>
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
        onClick={() => onNavigate(versions[activeIndex - 1].id)}
      >
        <span className="hidden sm:inline sm:mr-2">Vor</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
      {activeVersion?.is_current && (
        <Badge className="bg-green-100 text-green-900 border-green-300">Aktuell</Badge>
      )}
      {activeVersion?.archived_at && <Badge variant="outline">Archiv</Badge>}
      {!activeVersion?.care_plan_snapshot && (
        <Badge variant="outline">Nur Zusammenfassung</Badge>
      )}
      {archiveAllowed && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={archiving}
          onClick={onArchive}
        >
          <Archive className="mr-2 h-4 w-4" />
          Archivieren
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        className="ml-auto"
        disabled={downloadingPdf}
        onClick={onDownloadPdf}
      >
        <Printer className="mr-2 h-4 w-4" />
        {downloadingPdf ? 'PDF wird erstellt…' : 'PDF'}
      </Button>
    </div>
  )
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
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const autoDownloadDone = useRef(false)

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
  const shouldAutoDownload = searchParams.get('download') === '1'

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

  const downloadActiveVersionPdf = useCallback(async () => {
    if (!activeVersion) {
      const blob = await buildPetCarePlanPdf({
        petName,
        customerName,
        carePlan: liveCarePlan,
      })
      downloadPetCarePlanPdf(blob, petCarePlanPdfFilename({ petName }))
      return
    }

    setDownloadingPdf(true)
    try {
      const input = pdfInputFromVersion({
        petName,
        customerName,
        carePlanSnapshot: activeVersion.care_plan_snapshot,
        changedAt: activeVersion.changed_at,
        summary: activeVersion.summary,
      })
      const blob = await buildPetCarePlanPdf(input)
      downloadPetCarePlanPdf(blob, petCarePlanPdfFilename(input))
    } catch (error) {
      console.error(error)
      alert('PDF konnte nicht erstellt werden.')
    } finally {
      setDownloadingPdf(false)
    }
  }, [activeVersion, customerName, liveCarePlan, petName])

  useEffect(() => {
    if (!shouldAutoDownload || loading || autoDownloadDone.current) return
    autoDownloadDone.current = true
    void downloadActiveVersionPdf()
  }, [shouldAutoDownload, loading, downloadActiveVersionPdf])

  function navigateToVersion(versionId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('version', versionId)
    params.delete('download')
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

  const activeChange = changes.find((change) => change.id === activeVersion?.id) ?? null
  const archiveAllowed =
    activeChange != null && canArchiveVersion(activeChange, changes)

  const toolbar = (
    <VersionToolbar
      versions={versions}
      activeIndex={activeIndex}
      activeVersion={activeVersion}
      archiveAllowed={archiveAllowed}
      archiving={archiving}
      downloadingPdf={downloadingPdf}
      onNavigate={navigateToVersion}
      onArchive={() => void archiveCurrentVersion()}
      onDownloadPdf={() => void downloadActiveVersionPdf()}
    />
  )

  if (versions.length === 0) {
    return (
      <PetCarePlanPrintView
        petName={petName}
        customerName={customerName}
        carePlan={liveCarePlan}
        onDownloadPdf={downloadActiveVersionPdf}
        downloadingPdf={downloadingPdf}
      />
    )
  }

  if (activeVersion && !hasCarePlanSnapshot(activeVersion)) {
    return (
      <div>
        {toolbar}
        <PetCarePlanLegacyVersion
          petName={petName}
          customerName={customerName}
          changedAt={activeVersion.changed_at}
          summary={activeVersion.summary}
        />
      </div>
    )
  }

  const carePlan = activeVersion?.care_plan_snapshot ?? liveCarePlan

  return (
    <PetCarePlanPrintView
      petName={petName}
      customerName={customerName}
      carePlan={carePlan}
      standDate={activeVersion?.changed_at}
      toolbar={toolbar}
      onDownloadPdf={downloadActiveVersionPdf}
      downloadingPdf={downloadingPdf}
    />
  )
}
