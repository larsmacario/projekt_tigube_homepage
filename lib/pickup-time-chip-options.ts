import { expandRecurringDayCareDates } from '@/lib/day-care-interval'
import { getBookingHorizonEndIso } from '@/lib/booking-horizon'
import type { DayCareScheduleUI } from '@/lib/portal-day-care-schedule'
import { isWeekendOrPublicHoliday } from '@/lib/pickup-time-surcharge'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

function buildHalfHourSlotsInWindow(startHour: number, endHourInclusive: number): string[] {
  const options: string[] = []
  for (let h = startHour; h <= endHourInclusive; h++) {
    for (const m of [0, 30]) {
      if (h === endHourInclusive && m > 0) break
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return options
}

export function weekdayPickupChipOptions(): string[] {
  return [
    ...buildHalfHourSlotsInWindow(7, 8),
    ...buildHalfHourSlotsInWindow(12, 14),
    ...buildHalfHourSlotsInWindow(17, 18),
  ]
}

export function weekendOrHolidayPickupChipOptions(): string[] {
  return [
    ...buildHalfHourSlotsInWindow(9, 10),
    ...buildHalfHourSlotsInWindow(17, 18),
  ]
}

export function isWeekendOrHolidayIsoDate(isoDate: string, publicHolidays: Set<string>): boolean {
  return isWeekendOrPublicHoliday(isoDate, publicHolidays)
}

export function pickupChipOptionsForIsoDate(
  isoDate: string,
  publicHolidays: Set<string>
): string[] {
  if (isWeekendOrHolidayIsoDate(isoDate, publicHolidays)) {
    return weekendOrHolidayPickupChipOptions()
  }
  return weekdayPickupChipOptions()
}

export function pickupChipOptionsUnionForDates(
  isoDates: string[],
  publicHolidays: Set<string>
): string[] {
  const set = new Set<string>()
  for (const date of isoDates) {
    for (const time of pickupChipOptionsForIsoDate(date, publicHolidays)) {
      set.add(time)
    }
  }
  if (set.size === 0) {
    return weekdayPickupChipOptions()
  }
  return [...set].sort()
}

export function pickupChipOptionsForSpan(
  span: { start: string; end: string } | null | undefined,
  publicHolidays: Set<string>,
  role: 'drop_off' | 'pick_up'
): string[] {
  if (!span) return weekdayPickupChipOptions()
  const iso = role === 'drop_off' ? span.start : span.end
  return pickupChipOptionsForIsoDate(iso, publicHolidays)
}

/** Fallback when no booking context is available. */
export function defaultPickupChipOptions(): string[] {
  return weekdayPickupChipOptions()
}

export function collectDayCareIsoDatesForWizard(input: {
  onceDates: Date[]
  schedule: DayCareScheduleUI | undefined
  recurring:
    | {
        weekdays: number[]
        startDate?: Date
        endDate?: Date
        unbefristet?: boolean
        intervalWeeks?: 1 | 2
      }
    | undefined
}): string[] {
  if (input.schedule?.repeat && input.schedule.repeat !== 'none') {
    const cfg = input.recurring
    if (!cfg?.startDate) return []
    const start = toIsoDate(startOfDay(cfg.startDate))
    const end =
      cfg.endDate != null
        ? toIsoDate(startOfDay(cfg.endDate))
        : cfg.unbefristet !== false
          ? getBookingHorizonEndIso()
          : start
    return expandRecurringDayCareDates(
      start,
      end,
      cfg.weekdays,
      cfg.intervalWeeks === 2 ? 2 : 1
    )
  }
  return input.onceDates.map((d) => toIsoDate(startOfDay(d)))
}
