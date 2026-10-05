'use client'

import { useMemo, type ComponentProps } from 'react'
import { de as deDayPicker } from 'react-day-picker/locale'
import { DayButton, type DateRange, type Matcher } from 'react-day-picker'

import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isDateInVacationPeriods } from '@/lib/booking-availability'
import {
  BOOKING_CALENDAR_TIME_ZONE,
  isoDateFromCalendarDay,
} from '@/lib/vacation-dates'

export type BookingVacationPeriod = {
  start_date: string
  end_date: string
  label?: string
}

export const bookingRangeCalendarClassName =
  'rounded-xl bg-white [--cell-size:2.35rem] sm:[--cell-size:2.75rem] md:[--cell-size:3.15rem] lg:[--cell-size:3.35rem] !border border-sage-200/80 p-2 sm:p-3 transition-all !ring-0 !ring-offset-0 focus:!ring-0 focus:!ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 [&_*]:!ring-0 [&_*]:!ring-offset-0 [&_*]:focus:!ring-0 [&_*]:focus-visible:!ring-0 [&_.rdp-day_today]:!bg-transparent'

export const bookingRangeCalendarClassNames = {
  today: '!bg-transparent',
  week: 'mt-2 flex w-full gap-0',
  day: 'relative flex-1 overflow-hidden p-0.5',
  outside: 'invisible pointer-events-none',
  day_button:
    '!ring-0 !ring-offset-0 focus:!ring-0 focus-visible:!ring-0 data-[range-middle=true]:!bg-accent data-[range-start=true]:!bg-primary data-[range-end=true]:!bg-primary',
}

export type BookingPublicHoliday = {
  date: string
  name?: string
}

export function createBookingVacationDayButton(
  vacationPeriods: BookingVacationPeriod[],
  closedDates: string[],
  publicHolidayByDate: Map<string, string> = new Map()
) {
  return function BookingVacationDayButton({
    day,
    modifiers,
    className,
    ...props
  }: ComponentProps<typeof DayButton>) {
    const isoDate = isoDateFromCalendarDay(day)
    const isVacation = isDateInVacationPeriods(isoDate, vacationPeriods)
    const isClosed = !isVacation && closedDates.includes(isoDate)
    const holidayName = publicHolidayByDate.get(isoDate)
    const isHoliday = Boolean(holidayName) && !isVacation
    const isPast = Boolean(modifiers.disabled) && !isVacation && !isClosed

    return (
      <Button
        type="button"
        variant="ghost"
        disabled={isPast || isVacation || isClosed}
        data-day={isoDate}
        data-selected-single={
          modifiers.selected &&
          !modifiers.range_start &&
          !modifiers.range_end &&
          !modifiers.range_middle
        }
        data-range-start={modifiers.range_start}
        data-range-end={modifiers.range_end}
        data-range-middle={modifiers.range_middle}
        className={cn(
          'flex h-[--cell-size] min-h-[--cell-size] w-full min-w-[--cell-size] flex-col items-center justify-center gap-0.5 rounded-md bg-background p-0 font-normal leading-none',
          !isVacation &&
            'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
          !isVacation &&
            'data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground',
          !isVacation &&
            'data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground',
          !isVacation &&
            'data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground',
          isVacation &&
            '!cursor-not-allowed border border-amber-300 !bg-amber-100 !text-amber-950 hover:!bg-amber-100 hover:!text-amber-950 opacity-100',
          isClosed &&
            '!cursor-not-allowed border border-sage-300 !bg-sage-200 !text-sage-800 hover:!bg-sage-200 hover:!text-sage-800 opacity-100',
          isHoliday &&
            !modifiers.selected &&
            '!border-violet-300 !bg-violet-50 !text-violet-950 hover:!bg-violet-100',
          isPast && 'text-muted-foreground opacity-40',
          className
        )}
        {...props}
      >
        <span className={cn('text-sm font-semibold leading-none', isVacation && 'text-amber-950')}>
          {Number.parseInt(isoDate.slice(8, 10), 10)}
        </span>
        {isVacation ? (
          <span className="max-w-[3.1rem] text-center text-[0.48rem] font-bold leading-tight text-amber-900">
            Betriebsferien
          </span>
        ) : null}
        {isClosed ? (
          <span className="max-w-[3.1rem] text-center text-[0.48rem] font-semibold leading-tight text-sage-700">
            Geschlossen
          </span>
        ) : null}
        {isHoliday && !isVacation && !isClosed ? (
          <span className="max-w-[3.1rem] text-center text-[0.48rem] font-semibold leading-tight text-violet-800">
            Feiertag
          </span>
        ) : null}
      </Button>
    )
  }
}

function mergeDisabled(
  disabled: Matcher | Matcher[] | undefined,
  horizonEnd?: Date
): Matcher | Matcher[] | undefined {
  const extra: Matcher[] = []
  if (horizonEnd) extra.push({ after: horizonEnd })
  if (!disabled && extra.length === 0) return undefined
  if (!disabled) return extra.length === 1 ? extra[0] : extra
  if (extra.length === 0) return disabled
  return Array.isArray(disabled) ? [...disabled, ...extra] : [disabled, ...extra]
}

interface BookingRangeCalendarProps {
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  disabled?: Matcher | Matcher[]
  vacationPeriods?: BookingVacationPeriod[]
  closedDates?: string[]
  publicHolidays?: BookingPublicHoliday[]
  defaultMonth?: Date
  month?: Date
  onMonthChange?: (month: Date) => void
  horizonEnd?: Date
  className?: string
}

export function BookingRangeCalendar({
  selected,
  onSelect,
  disabled,
  vacationPeriods = [],
  closedDates = [],
  publicHolidays = [],
  defaultMonth,
  month,
  onMonthChange,
  horizonEnd,
  className,
}: BookingRangeCalendarProps) {
  const disabledMatcher = useMemo(
    () => mergeDisabled(disabled, horizonEnd),
    [disabled, horizonEnd]
  )
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of publicHolidays) {
      map.set(h.date, h.name || 'Feiertag')
    }
    return map
  }, [publicHolidays])

  const DayButtonComponent = useMemo(
    () => createBookingVacationDayButton(vacationPeriods, closedDates, holidayMap),
    [vacationPeriods, closedDates, holidayMap]
  )

  return (
    <div className="relative isolate overflow-hidden rounded-xl bg-white">
      <Calendar
        mode="range"
        timeZone={BOOKING_CALENDAR_TIME_ZONE}
        locale={deDayPicker}
        weekStartsOn={1}
        selected={selected}
        defaultMonth={defaultMonth ?? selected?.from}
        month={month}
        onMonthChange={onMonthChange}
        onSelect={onSelect}
        disabled={disabledMatcher}
        endMonth={horizonEnd}
        classNames={bookingRangeCalendarClassNames}
        className={cn(bookingRangeCalendarClassName, className)}
        components={{
          DayButton: DayButtonComponent,
        }}
      />
    </div>
  )
}

export function BookingCalendarLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-3 text-xs text-sage-600', className)}>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-amber-200 bg-amber-100" />
        Betriebsferien
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-sage-300 bg-sage-200" />
        Schließtag
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block size-3 rounded-sm border border-violet-300 bg-violet-50" />
        Feiertag (Baden-Württemberg)
      </span>
    </div>
  )
}
