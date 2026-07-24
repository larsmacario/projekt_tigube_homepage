import type { BookingRequest, BookingStatus } from '@/lib/types'

export interface BookingRequestGroup {
  key: string
  request_group_id: string | null
  bookings: BookingRequest[]
  start_date: string
  end_date: string | null
  status: BookingStatus
  message: string | null
}

function pickStatus(bookings: BookingRequest[]): BookingStatus {
  if (bookings.some((b) => b.status === 'pending')) return 'pending'
  if (bookings.some((b) => b.status === 'approved')) return 'approved'
  return bookings[0]?.status ?? 'pending'
}

export function groupBookingsForDisplay(bookings: BookingRequest[]): BookingRequestGroup[] {
  const byGroup = new Map<string, BookingRequest[]>()

  for (const booking of bookings) {
    const key = booking.request_group_id ?? booking.id
    const list = byGroup.get(key) ?? []
    list.push(booking)
    byGroup.set(key, list)
  }

  const groups: BookingRequestGroup[] = []

  for (const [key, list] of byGroup) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const first = sorted[0]
    const starts = sorted.map((b) => b.start_date).sort()
    const ends = sorted.map((b) => b.end_date).filter((e): e is string => Boolean(e))
    groups.push({
      key,
      request_group_id: first.request_group_id,
      bookings: sorted,
      start_date: starts[0],
      end_date: ends.length === sorted.length ? ends.sort().at(-1)! : null,
      status: pickStatus(sorted),
      message: first.message,
    })
  }

  return groups.sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )
}

export function formatGroupPetServiceSummary(group: BookingRequestGroup): string {
  return group.bookings
    .map((b) => `${b.pet?.name || 'Unbekannt'} (${b.service_type})`)
    .join(', ')
}
