'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { BookingRequest } from '@/lib/types'
import {
  WEEK_GRID_FIRST_HOUR,
  WEEK_GRID_LAST_HOUR,
  clampMinutesToGrid,
  type WeekCalendarEvent,
} from '@/lib/booking-week-calendar-events'
import { toIsoDate } from '@/lib/vacation-dates'
import { isDateInVacationPeriods } from '@/lib/booking-availability'

const HOUR_HEIGHT_PX = 40
const TIME_GRID_TOP_PADDING_PX = 14
const TIMEZONE_LABEL = 'GMT+02'

const weekDayShort = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type BookingWeekTimeGridProps = {
  weekDates: Date[]
  events: WeekCalendarEvent[]
  vacationPeriods?: Array<{ start_date: string; end_date: string; label: string }>
  closedDates?: string[]
  getStatusColor: (status: string) => string
  onSelectBooking?: (booking: BookingRequest) => void
  onSelectDate?: (date: Date) => void
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function hourLineTopPx(hour: number): number {
  return TIME_GRID_TOP_PADDING_PX + (hour - WEEK_GRID_FIRST_HOUR) * HOUR_HEIGHT_PX
}

function eventPositionStyle(startMinutes: number, endMinutes: number): {
  top: string
  height: string
} {
  const { startMinutes: s, endMinutes: e } = clampMinutesToGrid(startMinutes, endMinutes)
  const gridStart = WEEK_GRID_FIRST_HOUR * 60
  const topPx =
    TIME_GRID_TOP_PADDING_PX + ((s - gridStart) / 60) * HOUR_HEIGHT_PX
  const heightPx = Math.max(((e - s) / 60) * HOUR_HEIGHT_PX, 22)
  return { top: `${topPx}px`, height: `${heightPx}px` }
}

export function BookingWeekTimeGrid({
  weekDates,
  events,
  vacationPeriods = [],
  closedDates = [],
  getStatusColor,
  onSelectBooking,
  onSelectDate,
}: BookingWeekTimeGridProps) {
  const hours = useMemo(() => {
    const list: number[] = []
    for (let h = WEEK_GRID_FIRST_HOUR; h < WEEK_GRID_LAST_HOUR; h++) {
      list.push(h)
    }
    return list
  }, [])

  const gridHeightPx =
    hours.length * HOUR_HEIGHT_PX + TIME_GRID_TOP_PADDING_PX + HOUR_HEIGHT_PX / 2

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { allDay: WeekCalendarEvent[]; timed: WeekCalendarEvent[] }>()
    for (const date of weekDates) {
      map.set(toIsoDate(date), { allDay: [], timed: [] })
    }
    for (const event of events) {
      const bucket = map.get(event.isoDate)
      if (!bucket) continue
      if (event.kind === 'allDay') {
        bucket.allDay.push(event)
      } else {
        bucket.timed.push(event)
      }
    }
    return map
  }, [events, weekDates])

  return (
    <div className="overflow-x-auto rounded-lg border border-sage-200 bg-white">
      <div className="min-w-[720px]">
        <div
          className="grid border-b border-sage-200"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
        >
          <div className="border-r border-sage-200 px-1.5 py-2 text-[10px] text-muted-foreground">
            {TIMEZONE_LABEL}
          </div>
          {weekDates.map((date, idx) => {
            const iso = toIsoDate(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isVacation = isDateInVacationPeriods(iso, vacationPeriods)
            const isClosed = !isVacation && closedDates.includes(iso)

            return (
              <button
                key={iso}
                type="button"
                className={cn(
                  'border-r border-sage-200 px-2 py-2 text-left last:border-r-0',
                  isToday && 'bg-sage-50',
                  isVacation && 'bg-amber-50',
                  isClosed && 'bg-sage-100'
                )}
                onClick={() => {
                  if (!isVacation && !isClosed) onSelectDate?.(date)
                }}
              >
                <div className="text-[11px] font-medium uppercase text-muted-foreground">
                  {weekDayShort[idx]}
                </div>
                <div
                  className={cn(
                    'text-2xl font-normal tabular-nums text-sage-900',
                    isToday && 'font-semibold'
                  )}
                >
                  {date.getDate()}
                </div>
              </button>
            )
          })}
        </div>

        <div
          className="grid border-b border-sage-200"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
        >
          <div className="flex min-h-[44px] items-center border-r border-sage-200 px-1.5 py-2 text-[10px] leading-snug text-muted-foreground">
            Ganztägig
          </div>
          {weekDates.map((date) => {
            const iso = toIsoDate(date)
            const { allDay } = eventsByDate.get(iso) ?? { allDay: [], timed: [] }
            const isVacation = isDateInVacationPeriods(iso, vacationPeriods)
            const isClosed = !isVacation && closedDates.includes(iso)

            return (
              <div
                key={`allday-${iso}`}
                className={cn(
                  'min-h-[44px] space-y-1 border-r border-sage-200 p-1.5 last:border-r-0',
                  isVacation && 'bg-amber-50/80',
                  isClosed && 'bg-sage-100/80'
                )}
              >
                {isVacation && (
                  <span className="block truncate text-[10px] font-medium text-amber-900">
                    Betriebsferien
                  </span>
                )}
                {isClosed && !isVacation && (
                  <span className="block truncate text-[10px] font-medium text-sage-700">
                    Geschlossen
                  </span>
                )}
                {allDay.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className={cn(
                      'block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] font-medium',
                      getStatusColor(event.booking.status),
                      'opacity-80'
                    )}
                    onClick={() => onSelectBooking?.(event.booking)}
                    title={event.label}
                  >
                    {event.label}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden border-t border-sage-200">
          <div
            className="grid"
            style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))' }}
          >
          <div className="relative border-r border-sage-200" style={{ height: gridHeightPx }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] leading-none tabular-nums text-muted-foreground"
                style={{ top: hourLineTopPx(hour) }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {weekDates.map((date) => {
            const iso = toIsoDate(date)
            const { timed } = eventsByDate.get(iso) ?? { allDay: [], timed: [] }
            const isVacation = isDateInVacationPeriods(iso, vacationPeriods)
            const isClosed = !isVacation && closedDates.includes(iso)

            return (
              <div
                key={`grid-${iso}`}
                className={cn(
                  'relative border-r border-sage-200 last:border-r-0',
                  isVacation && 'bg-amber-50/40',
                  isClosed && 'bg-sage-100/40'
                )}
                style={{ height: gridHeightPx }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-sage-100"
                    style={{ top: hourLineTopPx(hour) }}
                  />
                ))}

                {timed.map((event) => {
                  const pos = eventPositionStyle(event.startMinutes, event.endMinutes)
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={cn(
                        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm',
                        getStatusColor(event.booking.status)
                      )}
                      style={{ top: pos.top, height: pos.height, minHeight: 22 }}
                      onClick={() => onSelectBooking?.(event.booking)}
                      title={event.label}
                    >
                      <span className="font-semibold">{event.label}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
