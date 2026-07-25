'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { BookingLineItemsPanel } from '@/components/admin/booking-line-items-panel'
import { formatDayCareBookingSummary } from '@/lib/day-care-booking'
import type { BookingRequest } from '@/lib/types'

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
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
    default:
      return status
  }
}

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

export interface BookingDetailSheetProps {
  booking: BookingRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  adminNotes: string
  onAdminNotesChange: (value: string) => void
  onStatusChange: (status: 'approved' | 'rejected') => void
  onClose: () => void
}

export function BookingDetailSheet({
  booking,
  open,
  onOpenChange,
  adminNotes,
  onAdminNotesChange,
  onStatusChange,
  onClose,
}: BookingDetailSheetProps) {
  if (!booking) {
    return null
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      onClose()
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 space-y-1 border-b border-sage-200 px-6 py-4 text-left">
          <SheetTitle>Buchungsdetails</SheetTitle>
          <SheetDescription>
            {booking.status === 'pending' && 'Genehmige oder lehne diese Anfrage ab'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tier</Label>
                <p className="font-medium">{booking.pet?.name || 'Unbekannt'}</p>
              </div>
              <div>
                <Label>Service</Label>
                <p className="font-medium">{getServiceLabel(booking.service_type)}</p>
              </div>
              <div>
                <Label>Kunde</Label>
                <p className="font-medium">
                  {booking.customer?.vorname} {booking.customer?.nachname}
                </p>
              </div>
              <div>
                <Label>Kontakt</Label>
                <p className="font-medium">{booking.customer?.email}</p>
                {booking.customer?.telefonnummer && (
                  <p className="text-sm text-sage-600">{booking.customer.telefonnummer}</p>
                )}
              </div>
              <div>
                <Label>Zeitraum</Label>
                <p className="font-medium">
                  {new Date(booking.start_date).toLocaleDateString('de-DE')} –{' '}
                  {booking.end_date
                    ? new Date(booking.end_date).toLocaleDateString('de-DE')
                    : 'laufend'}
                </p>
              </div>
              {booking.request_group?.drop_off_time && booking.request_group?.pick_up_time && (
                <div>
                  <Label>Bring- & Holzeiten</Label>
                  <p className="font-medium">
                    Bringen: {booking.request_group.drop_off_time} Uhr · Abholen:{' '}
                    {booking.request_group.pick_up_time} Uhr
                  </p>
                </div>
              )}
              {formatDayCareBookingSummary(booking) && (
                <div className="sm:col-span-2">
                  <Label>Tagesbetreuung</Label>
                  <p className="font-medium">{formatDayCareBookingSummary(booking)}</p>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(booking.status)}>
                  {getStatusLabel(booking.status)}
                </Badge>
              </div>
            </div>

            {booking.message && (
              <div>
                <Label>Nachricht vom Kunden</Label>
                <p className="mt-1 rounded bg-sage-50 p-3 text-sage-600">{booking.message}</p>
              </div>
            )}

            {booking.admin_notes && (
              <div>
                <Label>Admin Notiz</Label>
                <p className="mt-1 rounded bg-sage-50 p-3 text-sage-600">{booking.admin_notes}</p>
              </div>
            )}

            {booking.status === 'pending' && (
              <div>
                <Label>Admin Notiz (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => onAdminNotesChange(e.target.value)}
                  placeholder="Begründung für Genehmigung/Ablehnung..."
                  rows={3}
                />
              </div>
            )}

            <BookingLineItemsPanel bookingId={booking.id} />
          </div>
        </div>

        <div className="shrink-0 border-t border-sage-200 bg-background px-6 py-4">
          {booking.status === 'pending' ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Schließen
              </Button>
              <Button type="button" variant="destructive" onClick={() => onStatusChange('rejected')}>
                Ablehnen
              </Button>
              <Button
                type="button"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onStatusChange('approved')}
              >
                Genehmigen
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Schließen
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
