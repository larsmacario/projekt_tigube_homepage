import { weekdaysFromSelectedDates } from '@/lib/booking-appointment-plan'
import type { DayCareMode } from '@/lib/types'
import { startOfDay, toIsoDate } from '@/lib/vacation-dates'

export type DayCareRepeatMode = 'none' | 'weekly' | 'biweekly'

export type DayCareScheduleUI = {
  repeat: DayCareRepeatMode
  unbefristet: boolean
  endDate?: Date
}

export function dayCareModeFromSchedule(repeat: DayCareRepeatMode): DayCareMode {
  return repeat === 'none' ? 'once' : 'recurring'
}

export function buildRecurringConfigFromSchedule(
  dates: Date[],
  schedule: DayCareScheduleUI
): {
  weekdays: number[]
  startDate?: Date
  endDate?: Date
  unbefristet?: boolean
  intervalWeeks?: 1 | 2
} | null {
  if (schedule.repeat === 'none') return null
  if (dates.length === 0) return { weekdays: [], startDate: undefined }

  const normalized = dates.map((d) => startOfDay(d)).sort((a, b) => a.getTime() - b.getTime())
  const weekdays = weekdaysFromSelectedDates(normalized, (d) => toIsoDate(d))
  const unbefristet = schedule.unbefristet !== false && !schedule.endDate

  return {
    weekdays,
    startDate: normalized[0],
    endDate: unbefristet ? undefined : schedule.endDate,
    unbefristet,
    intervalWeeks: schedule.repeat === 'biweekly' ? 2 : 1,
  }
}
