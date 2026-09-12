import Link from 'next/link'

export default function KontoGeloeschtPage() {
  return (
    <main className="min-h-screen bg-sage-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-xl border border-sage-200 bg-white p-8 shadow-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold text-sage-900">Konto gelöscht</h1>
        <p className="text-sage-700">
          Dein Kundenkonto wurde gelöscht. Dein Portal-Zugang ist nicht mehr verfügbar.
        </p>
        <p className="text-sm text-sage-600">
          Falls abrechnungsrelevante Unterlagen aufbewahrt werden mussten, wurden diese
          anonymisiert und nur so lange gespeichert, wie es gesetzlich erforderlich ist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  )
}
