import {
  defaultKundenportalData,
  type KundenportalPickupRow,
} from '@/lib/cms/portal-defaults'

export function resolvePickupTimesRows(
  rows: KundenportalPickupRow[] | undefined | null
): KundenportalPickupRow[] {
  if (rows?.length) return rows
  return defaultKundenportalData.pickupTimesList ?? []
}
