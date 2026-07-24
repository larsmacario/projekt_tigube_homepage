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
  type BookingVacationPeriod,
} from '@/components/portal/booking-range-calendar'

interface BookingMultiDayCalendarProps {
  selected?: Date[]
  onSelect?: (dates: Date[] | undefined) => void
  disabled?: Matcher | Matcher[]
  vacationPeriods?: BookingVacationPeriod[]
  closedDates?: string[]
  defaultMonth?: Date
  month?: Date
  onMonthChange?: (month: Date) => void
  className?: string
}

export function BookingMultiDayCalendar({
  selected,
  onSelect,
  disabled,
  vacationPeriods = [],
  closedDates = [],
  defaultMonth,
  month,
  onMonthChange,
  className,
}: BookingMultiDayCalendarProps) {
  const DayButtonComponent = useMemo(
    () => createBookingVacationDayButton(vacationPeriods, closedDates),
    [vacationPeriods, closedDates]
  )

  return (
    <Calendar
      mode="multiple"
      locale={deDayPicker}
      weekStartsOn={1}
      selected={selected}
      defaultMonth={defaultMonth ?? selected?.[0]}
      month={month}
      onMonthChange={onMonthChange}
      onSelect={onSelect}
      disabled={disabled}
      classNames={bookingRangeCalendarClassNames}
      className={cn(bookingRangeCalendarClassName, className)}
      components={{
        DayButton: DayButtonComponent,
      }}
    />
  )
}
