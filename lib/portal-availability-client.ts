import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { fetchVacationPeriodsFromNewsbar } from '@/lib/portal-vacation-fallback'
import { readApiResponse } from '@/lib/read-api-response'
import type { ServiceType } from '@/lib/types'

export type PortalAvailabilityClientSnapshot = {
  vacationPeriods: Array<{ start_date: string; end_date: string; label: string }>
  closedDates: string[]
  publicHolidays: Array<{ date: string; name?: string }>
}

type FetchAvailabilityOptions = {
  fromDate: string
  toDate: string
  serviceTypes?: ServiceType[]
}

/**
 * Portal-Verfügbarkeit wie auf /portal/bookings: API + Newsbar-Ferien parallel.
 */
export async function fetchPortalAvailabilitySnapshot(
  options: FetchAvailabilityOptions
): Promise<PortalAvailabilityClientSnapshot> {
  const { fromDate, toDate, serviceTypes = [] } = options
  const baseQuery = `from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`
  const apiPath =
    serviceTypes.length > 0
      ? `/api/portal/bookings/availability?service_types=${serviceTypes.join(',')}&${baseQuery}`
      : `/api/portal/bookings/availability?${baseQuery}`

  const [apiResponse, newsbarVacationPeriods] = await Promise.all([
    authenticatedFetch(apiPath),
    fetchVacationPeriodsFromNewsbar(fromDate, toDate),
  ])

  const { data, error } = await readApiResponse<{
    vacationPeriods?: PortalAvailabilityClientSnapshot['vacationPeriods']
    closedDates?: string[]
    publicHolidays?: PortalAvailabilityClientSnapshot['publicHolidays']
    error?: string
  }>(apiResponse)

  const apiVacationPeriods = data?.vacationPeriods ?? []
  const vacationPeriods = mergeVacationPeriods(apiVacationPeriods, newsbarVacationPeriods)
  const closedDates = data?.closedDates ?? []
  const publicHolidays = data?.publicHolidays ?? []

  if (error && vacationPeriods.length === 0 && closedDates.length === 0) {
    throw new Error(error)
  }

  return { vacationPeriods, closedDates, publicHolidays }
}

function mergeVacationPeriods(
  fromApi: PortalAvailabilityClientSnapshot['vacationPeriods'],
  fromNewsbar: PortalAvailabilityClientSnapshot['vacationPeriods']
): PortalAvailabilityClientSnapshot['vacationPeriods'] {
  if (fromApi.length === 0) return fromNewsbar
  if (fromNewsbar.length === 0) return fromApi

  const byKey = new Map<string, PortalAvailabilityClientSnapshot['vacationPeriods'][number]>()
  for (const period of [...fromApi, ...fromNewsbar]) {
    byKey.set(`${period.start_date}:${period.end_date}`, period)
  }
  return [...byKey.values()].sort((a, b) => a.start_date.localeCompare(b.start_date))
}
