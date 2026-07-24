import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminDbClient } from '@/lib/admin-auth'
import {
  getBlockedDatesForService,
  getVacationPeriodsInRange,
  validateBookingAvailability,
  validateBookingAvailabilityForDateList,
  type AvailabilityContext,
  type ValidateBookingOptions,
  type ValidateBookingResult,
} from '@/lib/booking-availability'
import type { ServiceType } from '@/lib/types'
import type { VacationDate } from '@/lib/vacation-dates'
import { loadPublicVacationDates } from '@/lib/public-vacation-dates'

async function loadVacationDates(adminClient: SupabaseClient): Promise<VacationDate[]> {
  try {
    return await loadPublicVacationDates()
  } catch (publicError) {
    console.error('Public vacation load failed, trying admin client:', publicError)
  }

  const { data: settings } = await adminClient
    .from('newsbar_settings')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (!settings?.id) {
    return []
  }

  const { data, error } = await adminClient
    .from('newsbar_vacation_dates')
    .select('*')
    .eq('settings_id', settings.id)
    .order('sort_order', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as VacationDate[]
}

export async function loadAvailabilityContextForRange(
  startDate: string,
  endDate: string,
  adminClient: SupabaseClient = getAdminDbClient()
): Promise<AvailabilityContext> {
  const [vacations, settingsResult, overridesResult, bookingsResult] = await Promise.all([
    loadVacationDates(adminClient),
    adminClient.from('capacity_settings').select('*'),
    adminClient
      .from('capacity_overrides')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate),
    adminClient
      .from('bookings')
      .select(
        'id, service_type, start_date, end_date, day_care_mode, selected_dates, day_care_weekdays'
      )
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .or(`end_date.gte.${startDate},end_date.is.null`),
  ])

  if (settingsResult.error) {
    throw settingsResult.error
  }
  if (overridesResult.error) {
    throw overridesResult.error
  }
  if (bookingsResult.error) {
    throw bookingsResult.error
  }

  return {
    vacations,
    capacitySettings: settingsResult.data || [],
    capacityOverrides: overridesResult.data || [],
    approvedBookings: bookingsResult.data || [],
  }
}

export async function validateBookingAvailabilityForRange(
  options: ValidateBookingOptions,
  adminClient: SupabaseClient = getAdminDbClient()
): Promise<ValidateBookingResult> {
  const context = await loadAvailabilityContextForRange(
    options.startDate,
    options.endDate,
    adminClient
  )

  return validateBookingAvailability(context, options)
}

export async function validateBookingAvailabilityForDateListServer(
  serviceType: ServiceType,
  dates: string[],
  checkCapacity: boolean,
  excludeBookingId?: string,
  adminClient: SupabaseClient = getAdminDbClient()
): Promise<ValidateBookingResult> {
  const sorted = [...dates].sort()
  const rangeStart = sorted[0]
  const rangeEnd = sorted[sorted.length - 1]
  const context = await loadAvailabilityContextForRange(rangeStart, rangeEnd, adminClient)
  return validateBookingAvailabilityForDateList(context, {
    serviceType,
    dates,
    checkCapacity,
    excludeBookingId,
  })
}

export interface PortalAvailabilitySnapshot {
  vacationPeriods: Array<{ start_date: string; end_date: string; label: string }>
  closedDates: string[]
}

export async function getPortalAvailabilitySnapshot(
  fromDate: string,
  toDate: string,
  serviceType?: ServiceType | null,
  _userClient?: SupabaseClient
): Promise<PortalAvailabilitySnapshot> {
  let vacations: VacationDate[] = []

  try {
    vacations = await loadPublicVacationDates()
  } catch (error) {
    console.error('Failed to load public vacation dates:', error)
    try {
      vacations = await loadVacationDates(getAdminDbClient())
    } catch (adminError) {
      console.error('Failed to load vacation dates via admin:', adminError)
    }
  }

  const vacationPeriods = getVacationPeriodsInRange(vacations, fromDate, toDate)

  if (!serviceType) {
    return {
      vacationPeriods,
      closedDates: [],
    }
  }

  try {
    const context = await loadAvailabilityContextForRange(
      fromDate,
      toDate,
      getAdminDbClient()
    )

    return {
      vacationPeriods,
      closedDates: getBlockedDatesForService(context, serviceType, fromDate, toDate),
    }
  } catch (error) {
    console.error('Failed to load closed dates for service:', error)
    return {
      vacationPeriods,
      closedDates: [],
    }
  }
}

export async function getPortalAvailabilitySnapshotForServices(
  fromDate: string,
  toDate: string,
  serviceTypes: ServiceType[]
): Promise<PortalAvailabilitySnapshot> {
  if (serviceTypes.length === 0) {
    return getPortalAvailabilitySnapshot(fromDate, toDate, null)
  }

  const snapshots = await Promise.all(
    serviceTypes.map((serviceType) =>
      getPortalAvailabilitySnapshot(fromDate, toDate, serviceType)
    )
  )

  const vacationPeriods = snapshots[0]?.vacationPeriods ?? []
  const closedSet = new Set<string>()
  for (const snapshot of snapshots) {
    for (const date of snapshot.closedDates) {
      closedSet.add(date)
    }
  }

  return {
    vacationPeriods,
    closedDates: [...closedSet].sort(),
  }
}
