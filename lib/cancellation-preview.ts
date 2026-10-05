import { getAdminDbClient } from '@/lib/admin-auth'
import {
  getActiveBookingDates,
  getBookingFinancialTotal,
  isBookingFullyCancelled,
  resolveCancellationCheckInDate,
} from '@/lib/cancellation-booking-total'
import { resolveScopeTotalForCancelledDates } from '@/lib/cancellation-day-price'
import { loadActiveCancellationPolicy } from '@/lib/cancellation-policy-loader'
import {
  calculateCancellationAmounts,
  calculateCancellationAmountsForDates,
  type CancellationPerDayAmount,
} from '@/lib/cancellation-resolver'
import { getPublicHolidaysInRange } from '@/lib/public-holidays-de'
import { loadSchoolHolidaysBw } from '@/lib/school-holidays-bw'
import type { BookingLineItem, BookingRequest } from '@/lib/types'

export type CancellationPreviewResult = Awaited<ReturnType<typeof computeCancellationPreview>>

export async function computeCancellationPreview(
  booking: BookingRequest,
  lineItems: BookingLineItem[],
  datesToCancel?: string[],
  cancellationAt = new Date(),
  options?: { waiveFees?: boolean }
) {
  const { config } = await loadActiveCancellationPolicy(getAdminDbClient())
  const schoolHolidays = await loadSchoolHolidaysBw()
  const bookingTotal = getBookingFinancialTotal(booking.id, lineItems)
  const activeDates = getActiveBookingDates(booking)

  if (datesToCancel?.length) {
    const activeSet = new Set(activeDates)
    const invalid = datesToCancel.filter((d) => !activeSet.has(d))
    if (invalid.length > 0) {
      throw new Error('Ein oder mehrere Tage gehören nicht zu dieser Buchung.')
    }
  }

  const mergedCancelledDates = [
    ...(booking.cancelled_dates ?? []),
    ...(datesToCancel ?? []),
  ]

  let holidayDates: string[] = []
  if (datesToCancel?.length) {
    const sorted = [...datesToCancel].sort()
    try {
      holidayDates = (
        await getPublicHolidaysInRange(sorted[0], sorted[sorted.length - 1])
      ).map((h) => h.date)
    } catch {
      holidayDates = []
    }
  }

  const scope = datesToCancel?.length
    ? resolveScopeTotalForCancelledDates({
        booking,
        lineItems,
        datesToCancel,
        bookingTotal,
        holidayDates,
      })
    : {
        scopeTotal: bookingTotal,
        priceSnapshot: { perDay: [], dayCount: 0, method: 'full' as const },
      }

  const checkInDate = resolveCancellationCheckInDate(booking, datesToCancel)

  let perDayAmounts: CancellationPerDayAmount[] = []
  if (datesToCancel?.length) {
    if (scope.priceSnapshot.perDay.length > 0) {
      perDayAmounts = scope.priceSnapshot.perDay.map((row) => ({
        date: row.date,
        amount: row.dayTotal,
      }))
    } else if (scope.scopeTotal > 0) {
      const share = Math.round((scope.scopeTotal / datesToCancel.length) * 100) / 100
      let allocated = 0
      perDayAmounts = datesToCancel.map((date, index) => {
        const isLast = index === datesToCancel.length - 1
        const amount = isLast
          ? Math.round((scope.scopeTotal - allocated) * 100) / 100
          : share
        allocated += amount
        return { date, amount }
      })
    }
  }

  const calculation =
    datesToCancel?.length && perDayAmounts.length > 0
      ? calculateCancellationAmountsForDates({
          checkInDate,
          bookingStartDate: booking.start_date,
          bookingEndDate: booking.end_date,
          selectedDates: booking.selected_dates,
          cancelledDates: mergedCancelledDates,
          cancellationAt,
          bookingTotal,
          policy: config,
          serviceType: booking.service_type,
          schoolHolidays,
          perDayAmounts,
        })
      : calculateCancellationAmounts({
          checkInDate,
          bookingStartDate: booking.start_date,
          bookingEndDate: booking.end_date,
          selectedDates: booking.selected_dates,
          cancelledDates: mergedCancelledDates,
          cancellationAt,
          bookingTotal,
          scopeTotalOverride: datesToCancel?.length ? scope.scopeTotal : undefined,
          policy: config,
          serviceType: booking.service_type,
          schoolHolidays,
        })

  const waived = options?.waiveFees === true
  const charge = waived ? 0 : calculation.cancellationChargeAmount
  const refund = waived ? scope.scopeTotal : calculation.cancellationRefundAmount

  return {
    ...calculation,
    cancellationChargeAmount: charge,
    cancellationRefundAmount: refund,
    waivedFees: waived,
    bookingTotal,
    fullyCancelled: isBookingFullyCancelled(booking, datesToCancel ?? []),
    datesToCancel: datesToCancel ?? [],
    priceSnapshot: scope.priceSnapshot,
    scopeTotal: scope.scopeTotal,
    canCancel: scope.scopeTotal > 0 || bookingTotal > 0 || booking.status !== 'pending',
  }
}
