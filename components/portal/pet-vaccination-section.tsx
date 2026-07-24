'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KOMBI_INTERVALL_OPTIONS } from '@/lib/pet-form-options'
import {
  COMBI_VACCINE_LABELS,
  formatDateDE,
  getIntervallLabel,
  getKombiDueDate,
  getZwingerhustenDueDate,
  isDog,
} from '@/lib/pet-vaccination'

type VaccinationFormValues = {
  tierart: string
  letzte_impfung: string
  intervall_impfung: string
  letzte_impfung_zusatz: string
}

type PetVaccinationSectionProps = {
  values: VaccinationFormValues
  onChange: (updates: Partial<VaccinationFormValues>) => void
  idPrefix?: string
  hasExistingImpfpass?: boolean
  impfpassFile?: File | null
  onImpfpassChange?: (file: File | null) => void
}

export function PetVaccinationSection({
  values,
  onChange,
  idPrefix = 'pet',
  hasExistingImpfpass = false,
  impfpassFile = null,
  onImpfpassChange,
}: PetVaccinationSectionProps) {
  const today = new Date().toISOString().split('T')[0]
  const isDogPet = isDog(values.tierart)

  const kombiDueDate = isDogPet
    ? getKombiDueDate(values.letzte_impfung, values.intervall_impfung)
    : null
  const zwingerhustenDueDate = isDogPet
    ? getZwingerhustenDueDate(values.letzte_impfung_zusatz)
    : null

  return (
    <div className="p-4 bg-sage-50/50 rounded-lg border border-sage-100 space-y-4">
      <h4 className="font-semibold text-sm text-sage-800 border-b pb-1">
        Impfpass & Impfstatus
      </h4>

      {onImpfpassChange && (
        <div>
          <Label htmlFor={`${idPrefix}-impfpass`}>
            Impfpass (Foto aufnehmen, Bild oder PDF)
            {hasExistingImpfpass ? ' (bereits hochgeladen)' : ''}
          </Label>
          <Input
            id={`${idPrefix}-impfpass`}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => onImpfpassChange(e.target.files?.[0] || null)}
          />
          {impfpassFile && (
            <p className="text-sm text-sage-600 mt-1">Ausgewählt: {impfpassFile.name}</p>
          )}
        </div>
      )}

      {isDogPet ? (
        <>
          <div className="rounded-md border border-sage-200 bg-white/70 p-3 text-sm text-sage-700 space-y-2">
            <p className="font-medium text-sage-900">Kombiimpfung</p>
            <p>
              Standardimpfungen: {COMBI_VACCINE_LABELS.join(', ')}. In der Kombiimpfung sollte
              auch der Zwingerhusten enthalten sein – je nach Präparat.
            </p>
            <p className="text-sage-600">
              Das Intervall hängt vom Impfstoff ab (jährlich oder alle 2 Jahre). Der Zwingerhusten
              muss jedoch immer jährlich aufgefrischt werden.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${idPrefix}-kombi-datum`}>Datum der Kombiimpfung</Label>
              <Input
                id={`${idPrefix}-kombi-datum`}
                type="date"
                value={values.letzte_impfung || ''}
                max={today}
                onChange={(e) => onChange({ letzte_impfung: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-kombi-intervall`}>Intervall Kombiimpfung</Label>
              <Select
                value={values.intervall_impfung || ''}
                onValueChange={(value) => onChange({ intervall_impfung: value })}
              >
                <SelectTrigger id={`${idPrefix}-kombi-intervall`}>
                  <SelectValue placeholder="Intervall wählen" />
                </SelectTrigger>
                <SelectContent>
                  {KOMBI_INTERVALL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-zwingerhusten-datum`}>
                Datum Zwingerhusten (jährlich)
              </Label>
              <Input
                id={`${idPrefix}-zwingerhusten-datum`}
                type="date"
                value={values.letzte_impfung_zusatz || ''}
                max={today}
                onChange={(e) => onChange({ letzte_impfung_zusatz: e.target.value })}
              />
            </div>
          </div>

          {(kombiDueDate || zwingerhustenDueDate) && (
            <div className="rounded-md border border-sage-200 bg-white/70 p-3 text-sm text-sage-700 space-y-1">
              <p className="font-medium text-sage-900">Nächste Fälligkeiten</p>
              {kombiDueDate && values.letzte_impfung && values.intervall_impfung && (
                <p>
                  Kombiimpfung ({getIntervallLabel(values.intervall_impfung)}):{' '}
                  {formatDateDE(kombiDueDate)}
                </p>
              )}
              {zwingerhustenDueDate && values.letzte_impfung_zusatz && (
                <p>Zwingerhusten (jährlich): {formatDateDE(zwingerhustenDueDate)}</p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${idPrefix}-impfung`}>Datum der letzten Impfung</Label>
            <Input
              id={`${idPrefix}-impfung`}
              type="date"
              value={values.letzte_impfung || ''}
              max={today}
              onChange={(e) => onChange({ letzte_impfung: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function PetVaccinationSummary({
  pet,
}: {
  pet: {
    tierart: string | null
    letzte_impfung: string | null
    letzte_impfung_zusatz: string | null
    intervall_impfung: string | null
  }
}) {
  if (!isDog(pet.tierart)) {
    if (!pet.letzte_impfung) return null
    return (
      <div>
        <p className="text-xs font-semibold text-sage-600">Impfung:</p>
        <p className="text-sm text-sage-700">{formatDateDE(pet.letzte_impfung)}</p>
      </div>
    )
  }

  const kombiDueDate = getKombiDueDate(pet.letzte_impfung, pet.intervall_impfung)
  const zwingerhustenDueDate = getZwingerhustenDueDate(pet.letzte_impfung_zusatz)

  if (!pet.letzte_impfung && !pet.letzte_impfung_zusatz && !pet.intervall_impfung) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-sage-600">Impfungen:</p>
      {pet.letzte_impfung && (
        <p className="text-sm text-sage-700">
          Kombi: {formatDateDE(pet.letzte_impfung)}
          {pet.intervall_impfung ? ` (${getIntervallLabel(pet.intervall_impfung)})` : ''}
          {kombiDueDate && pet.intervall_impfung
            ? ` · fällig ${formatDateDE(kombiDueDate)}`
            : ''}
        </p>
      )}
      {pet.letzte_impfung_zusatz && (
        <p className="text-sm text-sage-700">
          Zwingerhusten: {formatDateDE(pet.letzte_impfung_zusatz)}
          {zwingerhustenDueDate ? ` · fällig ${formatDateDE(zwingerhustenDueDate)}` : ''}
        </p>
      )}
    </div>
  )
}
