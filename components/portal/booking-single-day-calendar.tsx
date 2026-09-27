'use client'

import { useMemo } from 'react'
import { de as deDayPicker } from 'react-day-picker/locale'
import type { Matcher } from 'react-day-picker'

import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  bookingRangeCalendarClassName,
  bookingRangeCalendarClassNames,
  createBookingVacationDayButton,
  type BookingPublicHoliday,
  type BookingVacationPeriod,
} from '@/components/portal/booking-range-calendar'

interface BookingSingleDayCalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: Matcher | Matcher[]
  vacationPeriods?: BookingVacationPeriod[]
  closedDates?: string[]
  publicHolidays?: BookingPublicHoliday[]
  defaultMonth?: Date
  month?: Date
  onMonthChange?: (month: Date) => void
  className?: string
}

export function BookingSingleDayCalendar({
  selected,
  onSelect,
  disabled,
  vacationPeriods = [],
  closedDates = [],
  publicHolidays = [],
  defaultMonth,
  month,
  onMonthChange,
  className,
}: BookingSingleDayCalendarProps) {
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
    <div
      className={cn(
        'relative isolate w-full min-w-[min(100%,22rem)] overflow-hidden rounded-xl bg-white sm:min-w-[24rem]',
        className
      )}
    >
      <Calendar
        mode="single"
        locale={deDayPicker}
        weekStartsOn={1}
        selected={selected}
        defaultMonth={defaultMonth ?? selected}
        month={month}
        onMonthChange={onMonthChange}
        onSelect={onSelect}
        disabled={disabled}
        classNames={bookingRangeCalendarClassNames}
        className={cn(bookingRangeCalendarClassName, 'w-full')}
        components={{
          DayButton: DayButtonComponent,
        }}
      />
    </div>
  )
}
