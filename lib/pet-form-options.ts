export const PET_TIERART_OPTIONS = ['Hund', 'Katze', 'Andere'] as const

export const PET_GESCHLECHT_OPTIONS = [
  { value: 'hündin', label: 'Hündin' },
  { value: 'rüde', label: 'Rüde' },
  { value: 'rüde_kastriert', label: 'Rüde - kastriert' },
  { value: 'rüde_kastriert_chemisch', label: 'Rüde - kastriert - chemisch' },
  { value: 'hündin_kastriert', label: 'Hündin - kastriert' },
] as const

export function formatPetGeschlecht(value?: string | null): string {
  if (!value) return ''
  const option = PET_GESCHLECHT_OPTIONS.find((opt) => opt.value === value)
  if (option) return option.label
  if (value === 'rüde_kastriert_gechipt') return 'Rüde - kastriert - chemisch'
  return value
}

export function normalizePetGeschlecht(value?: string | null): string {
  if (!value) return ''
  if (value === 'rüde_kastriert_gechipt') return 'rüde_kastriert_chemisch'
  return value
}

export const INTERVALL_OPTIONS = [
  { value: 'monatlich', label: 'Monatlich' },
  { value: 'vierteljährlich', label: 'Vierteljährlich' },
  { value: 'halbjährlich', label: 'Halbjährlich' },
  { value: 'jährlich', label: 'Jährlich' },
  { value: 'alle_2_jahre', label: 'Alle 2 Jahre' },
  { value: 'alle_3_jahre', label: 'Alle 3 Jahre' },
] as const

/** Intervall der Hunde-Kombiimpfung (Parvo, Lepto, Hepatitis, Staupe) */
export const KOMBI_INTERVALL_OPTIONS = [
  { value: 'jährlich', label: 'Jährlich' },
  { value: 'alle_2_jahre', label: 'Alle 2 Jahre' },
] as const

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'impfpass', label: 'Impfpass' },
  { value: 'wurmtest', label: 'Wurmtest' },
  { value: 'vertrag', label: 'Vertrag' },
] as const
