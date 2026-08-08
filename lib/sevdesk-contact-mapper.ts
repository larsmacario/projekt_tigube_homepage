import type { SevdeskContactDetail } from '@/lib/types'

function splitStreetLine(street: string | null): { strasse: string | null; hausnummer: string | null } {
  if (!street?.trim()) {
    return { strasse: null, hausnummer: null }
  }

  const match = street.trim().match(/^(.+?)\s+(\d+[a-zA-Z]?)$/)
  if (!match) {
    return { strasse: street.trim(), hausnummer: null }
  }

  return { strasse: match[1], hausnummer: match[2] }
}

function pickCommunicationValue(
  ways: SevdeskContactDetail['communicationWays'],
  type: string
): string | null {
  const match = ways.find((way) => way.type.toUpperCase() === type.toUpperCase() && way.value.trim())
  return match?.value.trim() ?? null
}

export function mapSevdeskContactToPortalFields(detail: SevdeskContactDetail): {
  nachname: string
  vorname: string | null
  email: string
  telefonnummer: string
  kundennummer: string
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
} {
  const customerNumber = detail.customerNumber?.trim()
  if (!customerNumber) {
    throw new Error('SevDesk-Kontakt ohne Kundennummer')
  }

  const nachname = detail.familyname?.trim() || detail.name?.trim() || 'Unbekannt'
  const vorname = detail.surename?.trim() || null
  const email = pickCommunicationValue(detail.communicationWays, 'EMAIL')
  const telefonnummer = pickCommunicationValue(detail.communicationWays, 'PHONE') || '-'

  const primaryAddress =
    detail.addresses.find((address) => address.category?.toLowerCase() === 'delivery') ??
    detail.addresses[0]

  const { strasse, hausnummer } = splitStreetLine(primaryAddress?.street ?? null)

  if (!email) {
    throw new Error(`Keine E-Mail für Kundennummer ${customerNumber}`)
  }

  return {
    nachname,
    vorname,
    email,
    telefonnummer,
    kundennummer: customerNumber,
    strasse,
    hausnummer,
    plz: primaryAddress?.zip?.trim() || null,
    ort: primaryAddress?.city?.trim() || null,
  }
}
