'use client'

type PetCarePlanLegacyVersionProps = {
  petName: string
  customerName?: string
  changedAt: string
  summary: string
}

export function PetCarePlanLegacyVersion({
  petName,
  customerName,
  changedAt,
  summary,
}: PetCarePlanLegacyVersionProps) {
  return (
    <div className="print-care-plan mx-auto max-w-4xl p-8 text-black bg-white">
      <header className="mb-6 border-b border-black pb-4">
        <h1 className="text-2xl font-bold">Futter- & Medikamentenplan</h1>
        <p className="mt-2 text-sm">Tier: {petName}</p>
        {customerName && <p className="text-sm">Besitzer: {customerName}</p>}
        <p className="text-sm">
          Stand: {new Date(changedAt).toLocaleString('de-DE')}
        </p>
      </header>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">Plan zu diesem Zeitpunkt nicht vollständig gespeichert</p>
        <p className="mt-1">
          Für diese ältere Version liegt nur die Änderungs-Zusammenfassung vor, nicht der
          vollständige Pflegeplan.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">Änderung</h2>
        <p className="text-sm whitespace-pre-wrap">{summary}</p>
      </div>
    </div>
  )
}
