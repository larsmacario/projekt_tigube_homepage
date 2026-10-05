import { getVacationPeriodsInRange } from '@/lib/booking-availability'
import { readApiResponse } from '@/lib/read-api-response'
import type { VacationDate } from '@/lib/vacation-dates'

/** Client-side fallback when availability API returns no vacation periods. */
export async function fetchVacationPeriodsFromNewsbar(
  fromDate: string,
  toDate: string
): Promise<Array<{ start_date: string; end_date: string; label: string }>> {
  const response = await fetch('/api/newsbar')
  const { data } = await readApiResponse<{ vacationDates?: VacationDate[] }>(response)
  const rawDates = data?.vacationDates ?? []
  return getVacationPeriodsInRange(rawDates, fromDate, toDate)
}
