export const PET_TIERART_OPTIONS = ['Hund', 'Katze', 'Andere'] as const

export const PET_GESCHLECHT_OPTIONS = [
  { value: 'hündin', label: 'Hündin' },
  { value: 'rüde', label: 'Rüde' },
  { value: 'rüde_kastriert', label: 'Rüde - kastiert' },
  { value: 'rüde_kastriert_gechipt', label: 'Rüde - kastiert - gechipt' },
  { value: 'hündin_kastriert', label: 'Hündin - kastriert' },
] as const

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
