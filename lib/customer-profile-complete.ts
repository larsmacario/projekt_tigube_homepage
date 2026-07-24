import type { Customer } from '@/lib/types'

function trimmed(value: string | null | undefined): string {
  return (value ?? '').trim()
}

/** Pflichtprofil inkl. Anschrift (Onboarding Schritt 1 / Dashboard-Checkliste). */
export function isCustomerProfileComplete(
  customer: Pick<
    Customer,
    | 'nachname'
    | 'vorname'
    | 'datenschutz'
    | 'telefonnummer'
    | 'strasse'
    | 'hausnummer'
    | 'plz'
    | 'ort'
  > | null | undefined
): boolean {
  if (!customer) return false
  return (
    !!trimmed(customer.nachname) &&
    !!trimmed(customer.vorname) &&
    !!trimmed(customer.telefonnummer) &&
    customer.datenschutz === true &&
    !!trimmed(customer.strasse) &&
    !!trimmed(customer.hausnummer) &&
    !!trimmed(customer.plz) &&
    !!trimmed(customer.ort)
  )
}

export function formatCustomerAddress(
  customer: Pick<Customer, 'strasse' | 'hausnummer' | 'plz' | 'ort'> | null | undefined
): string {
  if (!customer) return ''
  const line1 = [trimmed(customer.strasse), trimmed(customer.hausnummer)].filter(Boolean).join(' ')
  const line2 = [trimmed(customer.plz), trimmed(customer.ort)].filter(Boolean).join(' ')
  return [line1, line2].filter(Boolean).join(', ')
}
