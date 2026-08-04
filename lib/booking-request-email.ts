import { parseISO } from 'date-fns'

import { formatDateRangeDE } from '@/lib/format-date-range-de'
import { formatEuro } from '@/lib/price-override'
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
  unit_price?: number | null
  line_total?: number | null
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
  dropOffTime?: string | null
  pickUpTime?: string | null
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
  lineItems?: Array<{
    label: string
    quantity: number
    unit?: string | null
    unit_price?: number | null
    line_total?: number | null
  }>
  dropOffTime?: string | null
  pickUpTime?: string | null
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
    unit_price: li.unit_price ?? null,
    line_total: li.line_total ?? null,
  }))

  return {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    message: input.message,
    petLines,
    extras,
    dropOffTime: input.dropOffTime ?? null,
    pickUpTime: input.pickUpTime ?? null,
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
      lines.push(formatExtraEmailLine(extra))
    }
  }

  if (content.dropOffTime && content.pickUpTime) {
    lines.push('', `Bringen: ${content.dropOffTime} Uhr · Abholen: ${content.pickUpTime} Uhr`)
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

function formatExtraEmailLine(extra: BookingRequestEmailExtraLine): string {
  const amount =
    extra.line_total != null
      ? formatEuro(extra.line_total)
      : extra.unit_price != null
        ? formatEuro(extra.unit_price)
        : null
  const unit = extra.unit ? ` ${extra.unit}` : ''
  if (amount) {
    return `- ${extra.label}: ${extra.quantity}${unit} (${amount})`
  }
  return `- ${extra.label}: ${extra.quantity}${unit}`
}

function formatExtraEmailHtml(extra: BookingRequestEmailExtraLine): string {
  const amount =
    extra.line_total != null
      ? formatEuro(extra.line_total)
      : extra.unit_price != null
        ? formatEuro(extra.unit_price)
        : null
  const unit = extra.unit ? ` ${escapeHtml(extra.unit)}` : ''
  const amountSuffix = amount ? ` (${escapeHtml(amount)})` : ''
  return `<li>${escapeHtml(extra.label)}: ${extra.quantity}${unit}${amountSuffix}</li>`
}

function toHtml(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>')
}

export function bookingRequestInternalHtml(content: BookingRequestEmailContent): string {
  const extrasBlock =
    content.extras.length > 0
      ? `<h3>Zusatzleistungen</h3><ul>${content.extras
          .map((e) => formatExtraEmailHtml(e))
          .join('')}</ul>`
      : ''

  const pickupBlock =
    content.dropOffTime && content.pickUpTime
      ? `<p><strong>Bringen:</strong> ${escapeHtml(content.dropOffTime)} Uhr · <strong>Abholen:</strong> ${escapeHtml(content.pickUpTime)} Uhr</p>`
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
    ${pickupBlock}
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
          .map((e) => formatExtraEmailHtml(e))
          .join('')}</ul>`
      : ''

  const pickupBlock =
    content.dropOffTime && content.pickUpTime
      ? `<p><strong>Bringen:</strong> ${escapeHtml(content.dropOffTime)} Uhr · <strong>Abholen:</strong> ${escapeHtml(content.pickUpTime)} Uhr</p>`
      : ''

  const messageBlock = content.message?.trim()
    ? `<h3>Nachricht</h3><p>${toHtml(content.message.trim())}</p>`
    : ''

  return `
    <h2>${escapeHtml(options.heading)}</h2>
    <p>${toHtml(options.intro)}</p>
    <h3>Leistungen</h3>
    ${bookingRequestEmailHtmlPetLines(content)}
    ${pickupBlock}
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
          ...content.extras.map((e) => formatExtraEmailLine(e)),
        ]
      : []),
    ...(content.dropOffTime && content.pickUpTime
      ? ['', `Bringen: ${content.dropOffTime} Uhr · Abholen: ${content.pickUpTime} Uhr`]
      : []),
    ...(content.message?.trim() ? ['', `Deine Nachricht: ${content.message.trim()}`] : []),
    '',
    'Herzliche Grüße',
    'Tamara und Gabriel',
    'tierisch gut betreut',
  ].join('\n')
}
