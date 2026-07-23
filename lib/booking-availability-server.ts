import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminDbClient } from '@/lib/admin-auth'
import {
  getBlockedDatesForService,
  getVacationPeriodsInRange,
  validateBookingAvailability,
  type AvailabilityContext,
  type ValidateBookingOptions,
  type ValidateBookingResult,
} from '@/lib/booking-availability'
import type { ServiceType } from '@/lib/types'
import type { VacationDate } from '@/lib/vacation-dates'

async function loadVacationDates(adminClient: SupabaseClient): Promise<VacationDate[]> {
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
      .select('id, service_type, start_date, end_date')
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate),
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

export interface PortalAvailabilitySnapshot {
  vacationPeriods: Array<{ start_date: string; end_date: string; label: string }>
  closedDates: string[]
}

export async function getPortalAvailabilitySnapshot(
  serviceType: ServiceType,
  fromDate: string,
  toDate: string,
  adminClient: SupabaseClient = getAdminDbClient()
): Promise<PortalAvailabilitySnapshot> {
  const context = await loadAvailabilityContextForRange(fromDate, toDate, adminClient)

  return {
    vacationPeriods: getVacationPeriodsInRange(context.vacations, fromDate, toDate),
    closedDates: getBlockedDatesForService(context, serviceType, fromDate, toDate),
  }
}
