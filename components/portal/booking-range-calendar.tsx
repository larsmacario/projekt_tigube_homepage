'use client'

import { useMemo, type ComponentProps } from 'react'
import { de as deDayPicker } from 'react-day-picker/locale'
import { DayButton, type DateRange, type Matcher } from 'react-day-picker'

import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isDateInVacationPeriods } from '@/lib/booking-availability'
import { toIsoDate } from '@/lib/vacation-dates'

export type BookingVacationPeriod = {
  start_date: string
  end_date: string
  label?: string
}

export const bookingRangeCalendarClassName =
  'rounded-xl bg-sage-50/90 [--cell-size:3.35rem] !border border-sage-200/80 p-3 transition-all !ring-0 !ring-offset-0 focus:!ring-0 focus:!ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 [&_*]:!ring-0 [&_*]:!ring-offset-0 [&_*]:focus:!ring-0 [&_*]:focus-visible:!ring-0 [&_.rdp-day_today]:!bg-transparent'

export const bookingRangeCalendarClassNames = {
  today: '!bg-transparent',
  day: 'p-0.5',
  day_button:
    '!ring-0 !ring-offset-0 focus:!ring-0 focus-visible:!ring-0 data-[range-middle=true]:!bg-accent data-[range-start=true]:!bg-primary data-[range-end=true]:!bg-primary',
}

export function createBookingVacationDayButton(
  vacationPeriods: BookingVacationPeriod[],
  closedDates: string[]
) {
  return function BookingVacationDayButton({
    day,
    modifiers,
    className,
    ...props
  }: ComponentProps<typeof DayButton>) {
    const isoDate = toIsoDate(day.date)
    const isVacation = isDateInVacationPeriods(isoDate, vacationPeriods)
    const isClosed = !isVacation && closedDates.includes(isoDate)
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
          'flex h-auto min-h-[--cell-size] w-full min-w-[--cell-size] flex-col items-center justify-center gap-0.5 rounded-md p-0 font-normal leading-none',
          'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
          'data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground',
          'data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground',
          'data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground',
          isVacation &&
            '!cursor-not-allowed border border-amber-300 !bg-amber-100 !text-amber-950 hover:!bg-amber-100 hover:!text-amber-950 opacity-100',
          isClosed &&
            '!cursor-not-allowed border border-sage-300 !bg-sage-200 !text-sage-800 hover:!bg-sage-200 hover:!text-sage-800 opacity-100',
          isPast && 'text-muted-foreground opacity-40',
          className
        )}
        {...props}
      >
        <span className={cn('text-sm font-semibold leading-none', isVacation && 'text-amber-950')}>
          {day.date.getDate()}
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
      </Button>
    )
  }
}

interface BookingRangeCalendarProps {
  selected?: DateRange
  onSelect?: (range: DateRange | undefined) => void
  disabled?: Matcher | Matcher[]
  vacationPeriods?: BookingVacationPeriod[]
  closedDates?: string[]
  defaultMonth?: Date
  month?: Date
  onMonthChange?: (month: Date) => void
  className?: string
}

export function BookingRangeCalendar({
  selected,
  onSelect,
  disabled,
  vacationPeriods = [],
  closedDates = [],
  defaultMonth,
  month,
  onMonthChange,
  className,
}: BookingRangeCalendarProps) {
  const DayButtonComponent = useMemo(
    () => createBookingVacationDayButton(vacationPeriods, closedDates),
    [vacationPeriods, closedDates]
  )

  return (
    <Calendar
      mode="range"
      locale={deDayPicker}
      weekStartsOn={1}
      selected={selected}
      defaultMonth={defaultMonth ?? selected?.from}
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
