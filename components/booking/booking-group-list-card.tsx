'use client'

import { Badge } from '@/components/ui/badge'
import type { BookingRequest } from '@/lib/types'
import type { BookingRequestGroup } from '@/lib/booking-request-groups'
import { formatDayCareBookingSummary } from '@/lib/day-care-booking'
import { cn } from '@/lib/utils'

function getServiceLabel(serviceType: string) {
  switch (serviceType) {
    case 'hundepension':
      return 'Urlaubsbetreuung'
    case 'katzenbetreuung':
      return 'Katzenbetreuung'
    case 'tagesbetreuung':
      return 'Tagesbetreuung'
    default:
      return serviceType
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'cancelled':
      return 'bg-slate-100 text-slate-800 border-slate-300'
    default:
      return 'bg-sage-100 text-sage-800 border-sage-300'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Genehmigt'
    case 'rejected':
      return 'Abgelehnt'
    case 'pending':
      return 'Ausstehend'
    case 'cancelled':
      return 'Storniert'
    default:
      return status
  }
}

function groupPetSummary(group: BookingRequestGroup): string {
  return group.bookings
    .map((b) => `${b.pet?.name || 'Unbekannt'} · ${getServiceLabel(b.service_type)}`)
    .join(' · ')
}

type BookingGroupListCardProps = {
  group: BookingRequestGroup
  muted?: boolean
  showCustomer?: boolean
  onSelect: (booking: BookingRequest) => void
}

export function BookingGroupListCard({
  group,
  muted,
  showCustomer = false,
  onSelect,
}: BookingGroupListCardProps) {
  const customer = group.bookings[0]?.customer

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border border-sage-200 p-4 hover:bg-sage-50',
        muted && 'opacity-75'
      )}
      onClick={() => onSelect(group.bookings[0])}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sage-900">
            {group.bookings.length > 1
              ? 'Gruppenanfrage'
              : group.bookings[0].pet?.name || 'Unbekannt'}
          </p>
          {showCustomer && customer && (
            <p className="text-sm text-sage-600">
              {[customer.vorname, customer.nachname].filter(Boolean).join(' ') || customer.email}
            </p>
          )}
          <p className="text-sm text-sage-600">{groupPetSummary(group)}</p>
          <p className="mt-1 text-sm text-sage-600">
            {new Date(group.start_date).toLocaleDateString('de-DE')} –{' '}
            {group.end_date
              ? new Date(group.end_date).toLocaleDateString('de-DE')
              : 'laufend'}
          </p>
          {group.bookings.map((b) => {
            const dc = formatDayCareBookingSummary(b)
            if (!dc) return null
            return (
              <p key={b.id} className="text-xs text-sage-600">
                {dc}
              </p>
            )
          })}
        </div>
        <Badge className={getStatusColor(group.status)}>{getStatusLabel(group.status)}</Badge>
      </div>
    </div>
  )
}
