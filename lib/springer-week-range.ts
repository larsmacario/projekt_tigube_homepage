import { addWeeks, endOfWeek, startOfWeek } from 'date-fns'
import { iterateIsoDateRange } from '@/lib/booking-availability'
import { toIsoDate } from '@/lib/vacation-dates'

export type SpringerWeekRange = {
  from: Date
  to: Date
}

/** Mo–So der kommenden Kalenderwoche (relativ zu reference). */
export function getDefaultSpringerWeekRange(reference: Date = new Date()): SpringerWeekRange {
  const from = addWeeks(startOfWeek(reference, { weekStartsOn: 1 }), 1)
  const to = endOfWeek(from, { weekStartsOn: 1 })
  return { from, to }
}

/** Verschiebt einen Mo–So-Bereich um deltaWeeks (-1, 0, 1). deltaWeeks=0 → Default. */
export function shiftSpringerWeekRange(
  range: SpringerWeekRange,
  deltaWeeks: -1 | 0 | 1
): SpringerWeekRange {
  if (deltaWeeks === 0) {
    return getDefaultSpringerWeekRange()
  }

  const from = startOfWeek(addWeeks(range.from, deltaWeeks), { weekStartsOn: 1 })
  const to = endOfWeek(from, { weekStartsOn: 1 })
  return { from, to }
}

/** Sortierte ISO-Datumsliste für from–to (inklusive). */
export function iterateWeekDates(from: Date, to: Date): string[] {
  return iterateIsoDateRange(toIsoDate(from), toIsoDate(to))
}
