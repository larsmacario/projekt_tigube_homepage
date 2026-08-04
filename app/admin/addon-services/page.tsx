import { AddonServicesManager } from '@/components/admin/addon-services-manager'

export default function AdminAddonServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Zusatzleistungen</h1>
        <p className="mt-2 text-sage-600">
          Leistungen für den Buchungs-Wizard – unabhängig vom Preis-Katalog. Ohne aktive
          Leistungen entfällt der Zusatzleistungs-Schritt automatisch.
        </p>
      </div>
      <AddonServicesManager />
    </div>
  )
}
