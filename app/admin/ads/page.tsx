import { PortalAdsManager } from '@/components/admin/portal-ads-manager'

export default function AdminAdsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Ads</h1>
        <p className="mt-2 text-sage-600">
          Rotierende Werbebanner für die Sidebar im Kundenportal verwalten – Bilder, Links und
          Rotations-Einstellungen.
        </p>
      </div>
      <PortalAdsManager />
    </div>
  )
}
