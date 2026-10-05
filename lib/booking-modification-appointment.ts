import type { SupabaseClient } from '@supabase/supabase-js'

import {
  BOOKING_APPOINTMENT_PLAN_VERSION,
  buildDayCarePlanSection,
  normalizeTimeOrNull,
  type BookingAppointmentPlan,
  type DayCareTimeOverride,
} from '@/lib/booking-appointment-plan'
import type { ModificationPayload } from '@/lib/booking-modification'
import type { BookingRequest } from '@/lib/types'

export type ModificationRequestGroupContext = {
  drop_off_time: string | null
  pick_up_time: string | null
  appointment_plan: BookingAppointmentPlan | null
}

export function parseDayCareOverrides(raw: unknown): DayCareTimeOverride[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: DayCareTimeOverride[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const date = typeof (row as { date?: unknown }).date === 'string' ? (row as { date: string }).date : ''
    if (!date) continue
    const drop_off = normalizeTimeOrNull((row as { drop_off?: unknown }).drop_off)
    const pick_up = normalizeTimeOrNull((row as { pick_up?: unknown }).pick_up)
    if (!drop_off && !pick_up) continue
    out.push({
      date,
      ...(drop_off ? { drop_off } : {}),
      ...(pick_up ? { pick_up } : {}),
    })
  }
  return out.length > 0 ? out : undefined
}

export function timesPayloadFromInput(input: {
  drop_off_time?: unknown
  pick_up_time?: unknown
  day_care_overrides?: unknown
}): Pick<ModificationPayload, 'drop_off_time' | 'pick_up_time' | 'day_care_overrides'> {
  const drop = normalizeTimeOrNull(input.drop_off_time)
  const pick = normalizeTimeOrNull(input.pick_up_time)
  const overrides = parseDayCareOverrides(input.day_care_overrides)
  return {
    ...(drop ? { drop_off_time: drop } : {}),
    ...(pick ? { pick_up_time: pick } : {}),
    ...(overrides ? { day_care_overrides: overrides } : {}),
  }
}

function parseWeekdayList(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map((d) => (typeof d === 'number' ? d : Number.parseInt(String(d), 10)))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((d) => Number.parseInt(d.trim(), 10))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
  }
  return []
}

export function schedulePayloadFromInput(input: {
  day_care_weekdays?: unknown
  day_care_interval_weeks?: unknown
}): Pick<ModificationPayload, 'day_care_weekdays' | 'day_care_interval_weeks'> {
  const out: Pick<ModificationPayload, 'day_care_weekdays' | 'day_care_interval_weeks'> = {}
  const weekdays = parseWeekdayList(input.day_care_weekdays)
  if (weekdays.length > 0) {
    out.day_care_weekdays = [...new Set(weekdays)].sort((a, b) => a - b)
  }
  if (input.day_care_interval_weeks === 2 || input.day_care_interval_weeks === '2') {
    out.day_care_interval_weeks = 2
  } else if (input.day_care_interval_weeks === 1 || input.day_care_interval_weeks === '1') {
    out.day_care_interval_weeks = 1
  }
  return out
}

function planFromRow(raw: unknown): BookingAppointmentPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const plan = raw as BookingAppointmentPlan
  if (plan.version !== BOOKING_APPOINTMENT_PLAN_VERSION) return null
  return plan
}

export async function loadModificationRequestGroup(
  admin: SupabaseClient,
  requestGroupId: string | null | undefined
): Promise<ModificationRequestGroupContext | null> {
  if (!requestGroupId) return null
  const { data, error } = await admin
    .from('booking_request_groups')
    .select('drop_off_time, pick_up_time, appointment_plan')
    .eq('id', requestGroupId)
    .maybeSingle()
  if (error || !data) return null
  return {
    drop_off_time: data.drop_off_time ?? null,
    pick_up_time: data.pick_up_time ?? null,
    appointment_plan: planFromRow(data.appointment_plan),
  }
}

export function resolveDefaultTimesFromContext(
  context: ModificationRequestGroupContext | null
): { drop_off: string; pick_up: string } {
  const plan = context?.appointment_plan
  if (plan?.day_care?.default_times) {
    return {
      drop_off: plan.day_care.default_times.drop_off,
      pick_up: plan.day_care.default_times.pick_up,
    }
  }
  const block = plan?.vacation_blocks?.[0]
  if (block) {
    return { drop_off: block.drop_off, pick_up: block.pick_up }
  }
  return {
    drop_off: context?.drop_off_time?.trim() || '07:00',
    pick_up: context?.pick_up_time?.trim() || '17:00',
  }
}

export function detectTimesChanged(
  context: ModificationRequestGroupContext | null,
  payload: ModificationPayload
): boolean {
  if (!context) {
    return Boolean(payload.drop_off_time || payload.pick_up_time || payload.day_care_overrides?.length)
  }
  const current = resolveDefaultTimesFromContext(context)
  if (payload.drop_off_time && payload.drop_off_time !== current.drop_off) return true
  if (payload.pick_up_time && payload.pick_up_time !== current.pick_up) return true

  if (payload.day_care_overrides?.length) {
    const existing = context.appointment_plan?.day_care?.overrides ?? []
    const key = (o: DayCareTimeOverride) =>
      `${o.date}:${o.drop_off ?? ''}:${o.pick_up ?? ''}`
    const a = new Set(existing.map(key))
    const b = new Set(payload.day_care_overrides.map(key))
    if (a.size !== b.size) return true
    for (const k of b) if (!a.has(k)) return true
  }
  return false
}

export function detectScheduleChanged(
  booking: BookingRequest,
  payload: ModificationPayload
): boolean {
  if (booking.service_type !== 'tagesbetreuung' || booking.day_care_mode !== 'recurring') {
    return false
  }
  if (payload.day_care_weekdays?.length) {
    const current = [...(booking.day_care_weekdays ?? [])].sort((a, b) => a - b)
    const next = [...payload.day_care_weekdays].sort((a, b) => a - b)
    if (current.length !== next.length || current.some((d, i) => d !== next[i])) return true
  }
  if (
    payload.day_care_interval_weeks != null &&
    (booking.day_care_interval_weeks ?? 1) !== payload.day_care_interval_weeks
  ) {
    return true
  }
  return false
}

export function buildUpdatedAppointmentPlan(
  booking: BookingRequest,
  context: ModificationRequestGroupContext | null,
  payload: ModificationPayload
): BookingAppointmentPlan | null {
  const drop = payload.drop_off_time ?? resolveDefaultTimesFromContext(context).drop_off
  const pick = payload.pick_up_time ?? resolveDefaultTimesFromContext(context).pick_up

  const needsDayCare =
    booking.service_type === 'tagesbetreuung' &&
    (booking.day_care_mode === 'once' || booking.day_care_mode === 'recurring')

  const needsBlocks =
    booking.service_type === 'hundepension' ||
    booking.service_type === 'katzenbetreuung' ||
    (booking.service_type === 'tagesbetreuung' && booking.day_care_mode !== 'once' && booking.day_care_mode !== 'recurring')

  if (!needsDayCare && !needsBlocks) return context?.appointment_plan ?? null

  const existing = context?.appointment_plan
  const plan: BookingAppointmentPlan = {
    version: BOOKING_APPOINTMENT_PLAN_VERSION,
    ...(existing?.vacation_blocks ? { vacation_blocks: existing.vacation_blocks } : {}),
  }

  if (needsDayCare) {
    plan.day_care = buildDayCarePlanSection({
      defaultDropOff: drop,
      defaultPickUp: pick,
      overrides: payload.day_care_overrides ?? existing?.day_care?.overrides,
      skippedDates: existing?.day_care?.skipped_dates,
    })
  } else if (plan.vacation_blocks?.length) {
    plan.vacation_blocks = plan.vacation_blocks.map((block) => ({
      ...block,
      drop_off: drop,
      pick_up: pick,
    }))
  } else {
    plan.vacation_blocks = [
      {
        start_date: booking.start_date,
        end_date: booking.end_date ?? booking.start_date,
        drop_off: drop,
        pick_up: pick,
      },
    ]
  }

  return plan
}

export async function persistRequestGroupTimes(
  admin: SupabaseClient,
  requestGroupId: string,
  booking: BookingRequest,
  context: ModificationRequestGroupContext | null,
  payload: ModificationPayload
): Promise<void> {
  const drop = payload.drop_off_time ?? resolveDefaultTimesFromContext(context).drop_off
  const pick = payload.pick_up_time ?? resolveDefaultTimesFromContext(context).pick_up
  const appointment_plan = buildUpdatedAppointmentPlan(booking, context, {
    ...payload,
    drop_off_time: drop,
    pick_up_time: pick,
  })

  const { error } = await admin
    .from('booking_request_groups')
    .update({
      drop_off_time: drop,
      pick_up_time: pick,
      appointment_plan: appointment_plan,
    })
    .eq('id', requestGroupId)

  if (error) throw error
}
