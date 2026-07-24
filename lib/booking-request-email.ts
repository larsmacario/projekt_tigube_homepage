import { parseISO } from 'date-fns'

import { formatDateRangeDE } from '@/lib/format-date-range-de'
import {
  formatDayCareBookingSummary,
} from '@/lib/day-care-booking'
import type { BookingRequest, ServiceType } from '@/lib/types'

export function bookingServiceLabel(serviceType: ServiceType | string): string {
  const labels: Record<string, string> = {
    hundepension: 'Urlaubsbetreuung',
    katzenbetreuung: 'Katzenbetreuung',
    tagesbetreuung: 'Tagesbetreuung',
  }
  return labels[serviceType] || String(serviceType)
}

export function buildBookingPeriodSummary(
  booking: Pick<
    BookingRequest,
    | 'service_type'
    | 'day_care_mode'
    | 'day_care_weekdays'
    | 'selected_dates'
    | 'start_date'
    | 'end_date'
  >
): string {
  const dayCare = formatDayCareBookingSummary(booking)
  if (dayCare) return dayCare

  if (booking.start_date) {
    const from = parseISO(booking.start_date)
    const to = booking.end_date ? parseISO(booking.end_date) : from
    return formatDateRangeDE(from, to)
  }

  return '—'
}

export type BookingRequestEmailExtraLine = {
  label: string
  quantity: number
  unit?: string | null
}

export type BookingRequestEmailPetLine = {
  petName: string
  serviceLabel: string
  periodSummary: string
}

export type BookingRequestEmailContent = {
  customerName: string
  customerEmail: string
  message: string | null
  petLines: BookingRequestEmailPetLine[]
  extras: BookingRequestEmailExtraLine[]
}

export function buildBookingRequestEmailContent(input: {
  customerName: string
  customerEmail: string
  message: string | null
  bookings: Array<
    Pick<
      BookingRequest,
      | 'service_type'
      | 'day_care_mode'
      | 'day_care_weekdays'
      | 'selected_dates'
      | 'start_date'
      | 'end_date'
    > & { pet?: { name?: string | null } | null }
  >
  lineItems?: Array<{ label: string; quantity: number; unit?: string | null }>
}): BookingRequestEmailContent {
  const petLines = input.bookings.map((b) => ({
    petName: b.pet?.name || 'Tier',
    serviceLabel: bookingServiceLabel(b.service_type),
    periodSummary: buildBookingPeriodSummary(b),
  }))

  const extras = (input.lineItems || []).map((li) => ({
    label: li.label,
    quantity: li.quantity,
    unit: li.unit,
  }))

  return {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    message: input.message,
    petLines,
    extras,
  }
}

export function bookingRequestEmailPlainText(content: BookingRequestEmailContent): string {
  const lines = [
    `Kunde: ${content.customerName}`,
    `E-Mail: ${content.customerEmail}`,
    '',
    'Leistungen:',
    ...content.petLines.map(
      (l) => `- ${l.petName}: ${l.serviceLabel} (${l.periodSummary})`
    ),
  ]

  if (content.extras.length > 0) {
    lines.push('', 'Zusatzleistungen:')
    for (const extra of content.extras) {
      const unit = extra.unit ? ` ${extra.unit}` : ''
      lines.push(`- ${extra.label}: ${extra.quantity}${unit}`)
    }
  }

  if (content.message?.trim()) {
    lines.push('', 'Nachricht:', content.message.trim())
  }

  return lines.join('\n')
}

export function bookingRequestEmailHtmlPetLines(content: BookingRequestEmailContent): string {
  return `<ul>${content.petLines
    .map(
      (l) =>
        `<li><strong>${escapeHtml(l.petName)}:</strong> ${escapeHtml(l.serviceLabel)} (${escapeHtml(l.periodSummary)})</li>`
    )
    .join('')}</ul>`
}

function escapeHtml(value: string | null | undefined): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function toHtml(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

export function bookingRequestInternalHtml(content: BookingRequestEmailContent): string {
  const extrasBlock =
    content.extras.length > 0
      ? `<h3>Zusatzleistungen</h3><ul>${content.extras
          .map((e) => {
            const unit = e.unit ? ` ${escapeHtml(e.unit)}` : ''
            return `<li>${escapeHtml(e.label)}: ${e.quantity}${unit}</li>`
          })
          .join('')}</ul>`
      : ''

  const messageBlock = content.message?.trim()
    ? `<h3>Nachricht</h3><p>${toHtml(content.message.trim())}</p>`
    : ''

  return `
    <h2>Neue Buchungsanfrage (Kundenportal)</h2>
    <p>Es ist eine neue Buchungsanfrage eingegangen.</p>
    <h3>Kunde</h3>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(content.customerName)}</li>
      <li><strong>E-Mail:</strong> ${escapeHtml(content.customerEmail)}</li>
    </ul>
    <h3>Leistungen</h3>
    ${bookingRequestEmailHtmlPetLines(content)}
    ${extrasBlock}
    ${messageBlock}
  `
}

export function bookingRequestEmailHtmlBody(
  content: BookingRequestEmailContent,
  options: { heading: string; intro: string }
): string {
  const extrasBlock =
    content.extras.length > 0
      ? `<h3>Zusatzleistungen</h3><ul>${content.extras
          .map((e) => {
            const unit = e.unit ? ` ${escapeHtml(e.unit)}` : ''
            return `<li>${escapeHtml(e.label)}: ${e.quantity}${unit}</li>`
          })
          .join('')}</ul>`
      : ''

  const messageBlock = content.message?.trim()
    ? `<h3>Nachricht</h3><p>${toHtml(content.message.trim())}</p>`
    : ''

  return `
    <h2>${escapeHtml(options.heading)}</h2>
    <p>${toHtml(options.intro)}</p>
    <h3>Leistungen</h3>
    ${bookingRequestEmailHtmlPetLines(content)}
    ${extrasBlock}
    ${messageBlock}
  `
}

export function customerConfirmationPlainText(content: BookingRequestEmailContent): string {
  return [
    `Hallo ${content.customerName},`,
    '',
    'vielen Dank für deine Buchungsanfrage im Kundenportal. Wir haben sie erhalten und melden uns nach Prüfung bei dir.',
    '',
    'Zusammenfassung:',
    ...content.petLines.map(
      (l) => `- ${l.petName}: ${l.serviceLabel} (${l.periodSummary})`
    ),
    ...(content.extras.length > 0
      ? [
          '',
          'Zusatzleistungen:',
          ...content.extras.map((e) => {
            const unit = e.unit ? ` ${e.unit}` : ''
            return `- ${e.label}: ${e.quantity}${unit}`
          }),
        ]
      : []),
    ...(content.message?.trim() ? ['', `Deine Nachricht: ${content.message.trim()}`] : []),
    '',
    'Herzliche Grüße',
    'Tamara und Gabriel',
    'tierisch gut betreut',
  ].join('\n')
}
