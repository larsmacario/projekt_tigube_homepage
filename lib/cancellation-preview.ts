import { getAdminDbClient } from '@/lib/admin-auth'
import {
  getActiveBookingDates,
  getBookingFinancialTotal,
  isBookingFullyCancelled,
  resolveCancellationCheckInDate,
} from '@/lib/cancellation-booking-total'
import { resolveScopeTotalForCancelledDates } from '@/lib/cancellation-day-price'
import { loadActiveCancellationPolicy } from '@/lib/cancellation-policy-loader'
import { calculateCancellationAmounts } from '@/lib/cancellation-resolver'
import { getPublicHolidaysInRange } from '@/lib/public-holidays-de'
import { fetchSchoolHolidaysBw } from '@/lib/school-holidays-bw'
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
  const schoolHolidays = await fetchSchoolHolidaysBw().catch(() => [])
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
  const calculation = calculateCancellationAmounts({
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
