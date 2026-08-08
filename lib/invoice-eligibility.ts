import { startOfDay } from '@/lib/vacation-dates'
import type { BookingLineItem, BookingRequest, Contact } from '@/lib/types'

export interface InvoiceEligibilityInput {
  bookings: BookingRequest[]
  lineItems: BookingLineItem[]
  customer: Pick<Contact, 'sevdesk_contact_id' | 'kundennummer'> | null
  sevdeskInvoiceSyncStatus?: string | null
  referenceDate?: Date
}

export interface InvoiceEligibilityResult {
  eligible: boolean
  blockers: string[]
  lineItemTotal: number
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return startOfDay(new Date(y, m - 1, d))
}

export function validateInvoiceLineItems(lineItems: BookingLineItem[]): {
  valid: boolean
  blockers: string[]
  total: number
} {
  const blockers: string[] = []

  if (lineItems.length === 0) {
    blockers.push('Keine Rechnungspositionen vorhanden')
    return { valid: false, blockers, total: 0 }
  }

  let total = 0

  for (const item of lineItems) {
    if (item.price_type === 'percentage' && item.line_total == null) {
      blockers.push(`Position „${item.label}“ ist ein Prozentwert ohne Endbetrag`)
      continue
    }

    if (item.price_type === 'text') {
      blockers.push(`Position „${item.label}“ ist nur Text und nicht abrechenbar`)
      continue
    }

    if (item.line_total == null || Number.isNaN(Number(item.line_total))) {
      blockers.push(`Position „${item.label}“ hat keinen gültigen Endbetrag`)
      continue
    }

    total += Number(item.line_total)
  }

  if (total <= 0) {
    blockers.push('Rechnungssumme muss größer als 0 € sein')
  }

  return {
    valid: blockers.length === 0,
    blockers,
    total,
  }
}

export function assessInvoiceEligibility(input: InvoiceEligibilityInput): InvoiceEligibilityResult {
  const blockers: string[] = []
  const today = startOfDay(input.referenceDate ?? new Date())

  if (input.sevdeskInvoiceSyncStatus === 'synced') {
    blockers.push('Bereits als Rechnungsentwurf nach SevDesk exportiert')
  }

  const activeBookings = input.bookings.filter((booking) => booking.status === 'approved')
  if (activeBookings.length === 0) {
    blockers.push('Keine bestätigten, nicht stornierten Buchungen in der Anfrage')
  }

  const incompleteBookings = activeBookings.filter((booking) => {
    if (!booking.end_date) {
      return true
    }
    return parseIsoDateLocal(booking.end_date) >= today
  })

  if (incompleteBookings.length > 0) {
    blockers.push('Mindestens eine bestätigte Buchung ist noch nicht beendet')
  }

  if (!input.customer?.sevdesk_contact_id) {
    blockers.push('Kunde ist nicht mit SevDesk verknüpft')
  }

  const lineValidation = validateInvoiceLineItems(input.lineItems)

  return {
    eligible: blockers.length === 0 && lineValidation.valid,
    blockers: [...blockers, ...lineValidation.blockers],
    lineItemTotal: lineValidation.total,
  }
}

export function isCancellationInvoiceCandidate(bookings: BookingRequest[]): boolean {
  return bookings.some(
    (booking) =>
      booking.status === 'cancelled' &&
      booking.cancellation_financial_status === 'pending' &&
      (booking.cancellation_charge_amount ?? 0) > 0
  )
}
