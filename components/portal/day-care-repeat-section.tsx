'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { BookingSingleDayCalendar } from '@/components/portal/booking-single-day-calendar'
import type { DayCareScheduleUI, DayCareRepeatMode } from '@/lib/portal-day-care-schedule'
import { cn } from '@/lib/utils'

export function DayCareRepeatSection({
  schedule,
  onChange,
  calendarProps,
  skippedCount,
}: {
  schedule: DayCareScheduleUI
  onChange: (patch: Partial<DayCareScheduleUI>) => void
  calendarProps: {
    disabled: (date: Date) => boolean
    vacationPeriods: Array<{ start_date: string; end_date: string; label?: string }>
    closedDates: string[]
    publicHolidays: Array<{ date: string; name?: string }>
    defaultMonth: Date
    month: Date
    onMonthChange: (month: Date) => void
    horizonEnd?: Date
  }
  skippedCount?: number
}) {
  const setRepeat = (repeat: DayCareRepeatMode) => onChange({ repeat })

  return (
    <div className="space-y-3 rounded-lg border border-sage-200/80 bg-sage-50/40 p-3">
      <Label className="text-sm">Wiederholen</Label>
      <p className="text-xs text-sage-600">
        <strong>Einzelne Tage:</strong> nur die im Kalender angeklickten Termine.{' '}
        <strong>Wöchentlich / 14-tägig:</strong> fester Rhythmus ab Starttag (nicht nur diese
        konkreten Kalendertage).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={schedule.repeat === 'none' ? 'default' : 'outline'}
          className={schedule.repeat === 'none' ? 'bg-sage-600 hover:bg-sage-700' : ''}
          onClick={() => setRepeat('none')}
        >
          Einzelne Tage
        </Button>
        <Button
          type="button"
          size="sm"
          variant={schedule.repeat === 'weekly' ? 'default' : 'outline'}
          className={schedule.repeat === 'weekly' ? 'bg-sage-600 hover:bg-sage-700' : ''}
          onClick={() => setRepeat('weekly')}
        >
          Wöchentlich
        </Button>
        <Button
          type="button"
          size="sm"
          variant={schedule.repeat === 'biweekly' ? 'default' : 'outline'}
          className={schedule.repeat === 'biweekly' ? 'bg-sage-600 hover:bg-sage-700' : ''}
          onClick={() => setRepeat('biweekly')}
        >
          Alle 14 Tage
        </Button>
      </div>

      {schedule.repeat !== 'none' && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="dc-unbefristet-repeat"
                checked={schedule.unbefristet !== false && !schedule.endDate}
                onCheckedChange={(checked) =>
                  onChange({
                    unbefristet: checked === true,
                    endDate: checked === true ? undefined : schedule.endDate,
                  })
                }
              />
              <Label htmlFor="dc-unbefristet-repeat" className="font-normal">
                Unbefristet (bis Ende des Folgejahres)
              </Label>
            </div>
          </div>
          {(schedule.unbefristet === false || schedule.endDate) && (
            <div>
              <Label>Enddatum</Label>
              <div className="mt-2 rounded-xl border border-sage-200/80 bg-white p-3">
                <div className="flex w-full justify-center">
                  <BookingSingleDayCalendar
                    selected={schedule.endDate}
                    onSelect={(date) =>
                      onChange({
                        endDate: date,
                        unbefristet: false,
                      })
                    }
                    disabled={calendarProps.disabled}
                    vacationPeriods={calendarProps.vacationPeriods}
                    closedDates={calendarProps.closedDates}
                    publicHolidays={calendarProps.publicHolidays}
                    defaultMonth={calendarProps.defaultMonth}
                    month={calendarProps.month}
                    onMonthChange={calendarProps.onMonthChange}
                    horizonEnd={calendarProps.horizonEnd}
                  />
                </div>
              </div>
            </div>
          )}
          {schedule.unbefristet !== false && !schedule.endDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange({ unbefristet: false })}
            >
              Enddatum festlegen
            </Button>
          )}
          {skippedCount != null && skippedCount > 0 && (
            <p className={cn('text-sm text-amber-800')}>
              {skippedCount} Termin(e) in der Serie fallen in Betriebsferien oder Schließtage und
              werden automatisch übersprungen.
            </p>
          )}
        </>
      )}
    </div>
  )
}
