import type { BookingRequest } from '@/lib/types'
import type { CancellationCalculationResult } from '@/lib/cancellation-resolver'
import { formatEuro } from '@/lib/price-override'

export interface BookingCancellationEmailContent {
  customerName: string
  customerEmail: string
  subject: string
  internalSubject: string
  customerHtml: string
  customerText: string
  internalHtml: string
  internalText: string
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

export function buildBookingCancellationEmailContent(input: {
  customerName: string
  customerEmail: string
  booking: BookingRequest & { pet?: { name?: string | null } }
  preview: CancellationCalculationResult & {
    fullyCancelled?: boolean
    datesToCancel?: string[]
  }
}): BookingCancellationEmailContent {
  const petName = input.booking.pet?.name || 'Tier'
  const serviceLabel = getServiceLabel(input.booking.service_type)
  const charge = formatEuro(input.preview.cancellationChargeAmount)
  const refund = formatEuro(input.preview.cancellationRefundAmount)
  const scope = formatEuro(input.preview.scopeTotal)

  const summaryLines = [
    `Tier: ${petName}`,
    `Leistung: ${serviceLabel}`,
    `Zeitraum: ${new Date(input.booking.start_date).toLocaleDateString('de-DE')}${
      input.booking.end_date
        ? ` – ${new Date(input.booking.end_date).toLocaleDateString('de-DE')}`
        : ''
    }`,
    `Regelwerk: ${input.preview.ruleSetName}`,
    `Staffel: ${input.preview.tierLabel}`,
    `Buchungssumme (Position): ${scope}`,
    `Stornogebühr: ${charge}`,
    `Erstattung: ${refund}`,
  ]

  if (input.preview.datesToCancel?.length) {
    summaryLines.push(
      `Stornierte Tage: ${input.preview.datesToCancel
        .map((d) => new Date(d).toLocaleDateString('de-DE'))
        .join(', ')}`
    )
  }

  const customerText = [
    `Hallo ${input.customerName},`,
    '',
    'wir haben deine Stornierung im Kundenportal erhalten.',
    '',
    ...summaryLines,
    '',
    'Eine Gutschrift oder Erstattung bearbeiten wir separat in der Abrechnung.',
    '',
    'Dein Team von tierisch gut betreut',
  ].join('\n')

  const internalText = [
    `Stornierung von ${input.customerName} (${input.customerEmail})`,
    '',
    ...summaryLines,
    '',
    'Finanzstatus: pending (manuell in SevDesk bearbeiten)',
  ].join('\n')

  const htmlList = summaryLines.map((line) => `<li>${line}</li>`).join('')

  return {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    subject: 'Bestätigung deiner Stornierung',
    internalSubject: `Stornierung: ${petName} – ${input.customerName}`,
    customerHtml: `<p>Hallo ${input.customerName},</p><p>wir haben deine Stornierung erhalten:</p><ul>${htmlList}</ul><p>Eine Gutschrift oder Erstattung bearbeiten wir separat in der Abrechnung.</p>`,
    customerText,
    internalHtml: `<p>Stornierung von <strong>${input.customerName}</strong> (${input.customerEmail})</p><ul>${htmlList}</ul><p>Finanzstatus: pending (manuell in SevDesk bearbeiten)</p>`,
    internalText,
  }
}
