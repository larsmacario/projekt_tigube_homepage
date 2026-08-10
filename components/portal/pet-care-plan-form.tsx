'use client'

import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CARE_PLAN_FOOD_TYPES,
  CARE_PLAN_SLOT_LABELS,
  emptyMedicationEntry,
  emptyPetCarePlan,
  nextTimeSlot,
  normalizeCarePlanForForm,
  type CarePlanFeedingSlot,
  type CarePlanMedicationEntry,
  type CarePlanSlotLabel,
  type PetCarePlan,
} from '@/lib/pet-care-plan'

type PetCarePlanFormProps = {
  value: PetCarePlan | null | undefined
  onChange: (value: PetCarePlan) => void
  readOnly?: boolean
  idPrefix?: string
}

function updateFeedingSlot(
  plan: PetCarePlan,
  index: number,
  patch: Partial<CarePlanFeedingSlot>
): PetCarePlan {
  const feeding = [...plan.feeding]
  feeding[index] = { ...feeding[index], ...patch }
  return { ...plan, feeding }
}

function updateMedicationEntry(
  plan: PetCarePlan,
  index: number,
  patch: Partial<CarePlanMedicationEntry>
): PetCarePlan {
  const medication = [...plan.medication]
  medication[index] = { ...medication[index], ...patch }
  return { ...plan, medication }
}

function addMedicationEntry(plan: PetCarePlan): PetCarePlan {
  return {
    ...plan,
    medication: [...plan.medication, emptyMedicationEntry()],
  }
}

function removeMedicationEntry(plan: PetCarePlan, index: number): PetCarePlan {
  return {
    ...plan,
    medication: plan.medication.filter((_, entryIndex) => entryIndex !== index),
  }
}

function duplicateMedicationEntry(plan: PetCarePlan, index: number): PetCarePlan {
  const source = plan.medication[index]
  if (!source) return plan

  const duplicate: CarePlanMedicationEntry = {
    timeSlot: nextTimeSlot(source.timeSlot),
    timing: source.timing,
    medication: source.medication,
    amount: source.amount,
  }

  const medication = [...plan.medication]
  medication.splice(index + 1, 0, duplicate)
  return { ...plan, medication }
}

export function PetCarePlanForm({
  value,
  onChange,
  readOnly = false,
  idPrefix = 'care-plan',
}: PetCarePlanFormProps) {
  const [showExample, setShowExample] = useState(false)
  const plan = normalizeCarePlanForForm(value) ?? emptyPetCarePlan()

  const toggleFoodType = (foodTypeId: (typeof CARE_PLAN_FOOD_TYPES)[number]['id']) => {
    if (readOnly) return
    const next = plan.foodTypes.includes(foodTypeId)
      ? plan.foodTypes.filter((id) => id !== foodTypeId)
      : [...plan.foodTypes, foodTypeId]
    onChange({ ...plan, foodTypes: next })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-sage-900">Futter & Allgemeines</h4>
        <div>
          <Label className="mb-2 block">Was wird gefüttert?</Label>
          <div className="flex flex-wrap gap-3">
            {CARE_PLAN_FOOD_TYPES.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={plan.foodTypes.includes(item.id)}
                  onCheckedChange={() => toggleFoodType(item.id)}
                  disabled={readOnly}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-intolerances`}>Unverträglichkeiten / Allergien</Label>
          <Textarea
            id={`${idPrefix}-intolerances`}
            value={plan.intolerances}
            onChange={(e) => onChange({ ...plan, intolerances: e.target.value })}
            rows={2}
            placeholder="z.B. Getreide, Rind"
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-sage-900">Fütterung</h4>
        <div className="overflow-x-auto rounded-lg border border-sage-200">
          <table className="min-w-full text-sm">
            <thead className="bg-sage-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-sage-700 w-24">Aktiv</th>
                <th className="px-3 py-2 text-left font-medium text-sage-700">Morgens</th>
                <th className="px-3 py-2 text-left font-medium text-sage-700">Mittags</th>
                <th className="px-3 py-2 text-left font-medium text-sage-700">Abends</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'time', label: 'Uhrzeit', placeholder: '6 Uhr' },
                { key: 'food', label: 'Was wird gefüttert', placeholder: 'Dose / Trockenfutter' },
                { key: 'amount', label: 'Menge', placeholder: '200g' },
                { key: 'additive', label: 'Zusätze', placeholder: 'Öl' },
                { key: 'additiveAmount', label: 'Menge Zusatz', placeholder: '1 TL' },
              ].map((row) => (
                <tr key={row.key} className="border-t border-sage-100">
                  <td className="px-3 py-2 align-top font-medium text-sage-600">{row.label}</td>
                  {CARE_PLAN_SLOT_LABELS.map((slotLabel, index) => {
                    const slot = plan.feeding[index]
                    const field = row.key as keyof CarePlanFeedingSlot
                    const disabled = readOnly || (!slot.enabled && field !== 'enabled')

                    if (row.key === 'time' && index === 0) {
                      return (
                        <td key={`${row.key}-${index}`} className="px-3 py-2 align-top">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs text-sage-600">
                              <Checkbox
                                checked={slot.enabled}
                                onCheckedChange={(checked) =>
                                  onChange(
                                    updateFeedingSlot(plan, index, { enabled: checked === true })
                                  )
                                }
                                disabled={readOnly}
                              />
                              {slotLabel}
                            </label>
                            <Input
                              value={slot.time}
                              onChange={(e) =>
                                onChange(updateFeedingSlot(plan, index, { time: e.target.value }))
                              }
                              placeholder={row.placeholder}
                              disabled={disabled}
                            />
                          </div>
                        </td>
                      )
                    }

                    if (row.key === 'time') {
                      return (
                        <td key={`${row.key}-${index}`} className="px-3 py-2 align-top">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs text-sage-600">
                              <Checkbox
                                checked={slot.enabled}
                                onCheckedChange={(checked) =>
                                  onChange(
                                    updateFeedingSlot(plan, index, { enabled: checked === true })
                                  )
                                }
                                disabled={readOnly}
                              />
                              {slotLabel}
                            </label>
                            <Input
                              value={slot.time}
                              onChange={(e) =>
                                onChange(updateFeedingSlot(plan, index, { time: e.target.value }))
                              }
                              placeholder={index === 1 ? '13 Uhr' : '19 Uhr'}
                              disabled={disabled}
                            />
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td key={`${row.key}-${index}`} className="px-3 py-2 align-top">
                        <Input
                          value={slot[field] as string}
                          onChange={(e) =>
                            onChange(updateFeedingSlot(plan, index, { [field]: e.target.value }))
                          }
                          placeholder={row.placeholder}
                          disabled={disabled}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-sage-900">Medikamente</h4>
          {!readOnly && plan.medication.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(addMedicationEntry(plan))}
            >
              <Plus className="mr-1 h-4 w-4" />
              Medikament hinzufügen
            </Button>
          )}
        </div>

        {plan.medication.length === 0 ? (
          <p className="rounded-lg border border-dashed border-sage-200 bg-sage-50/40 px-4 py-3 text-sm text-sage-600">
            Keine Medikamente hinterlegt. Optional kannst du Medikamente mit Tageszeit, Timing und
            Menge erfassen.
          </p>
        ) : (
          <div className="space-y-3">
            {plan.medication.map((entry, index) => (
              <div
                key={`${idPrefix}-med-${index}`}
                className="rounded-lg border border-sage-200 bg-white p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[140px_1fr_1fr_1fr_auto] lg:items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-med-slot-${index}`} className="text-xs">
                      Tageszeit
                    </Label>
                    <Select
                      value={entry.timeSlot}
                      onValueChange={(timeSlot: CarePlanSlotLabel) =>
                        onChange(updateMedicationEntry(plan, index, { timeSlot }))
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger id={`${idPrefix}-med-slot-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARE_PLAN_SLOT_LABELS.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-med-timing-${index}`} className="text-xs">
                      Timing
                    </Label>
                    <Input
                      id={`${idPrefix}-med-timing-${index}`}
                      value={entry.timing}
                      onChange={(e) =>
                        onChange(updateMedicationEntry(plan, index, { timing: e.target.value }))
                      }
                      placeholder="½ h vor Futter"
                      readOnly={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-med-name-${index}`} className="text-xs">
                      Medikament
                    </Label>
                    <Input
                      id={`${idPrefix}-med-name-${index}`}
                      value={entry.medication}
                      onChange={(e) =>
                        onChange(updateMedicationEntry(plan, index, { medication: e.target.value }))
                      }
                      placeholder="Apoquel"
                      readOnly={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-med-amount-${index}`} className="text-xs">
                      Menge
                    </Label>
                    <Input
                      id={`${idPrefix}-med-amount-${index}`}
                      value={entry.amount}
                      onChange={(e) =>
                        onChange(updateMedicationEntry(plan, index, { amount: e.target.value }))
                      }
                      placeholder="½ Tablette"
                      readOnly={readOnly}
                    />
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 gap-1 sm:col-span-2 lg:col-span-1 lg:justify-self-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-sage-500 hover:text-sage-900"
                        onClick={() => onChange(duplicateMedicationEntry(plan, index))}
                        aria-label={`Medikament ${index + 1} zur nächsten Tageszeit duplizieren`}
                        title="Zur nächsten Tageszeit duplizieren"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-sage-500 hover:text-destructive"
                        onClick={() => onChange(removeMedicationEntry(plan, index))}
                        aria-label={`Medikament ${index + 1} entfernen`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!readOnly && plan.medication.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addMedicationEntry(plan))}
          >
            <Plus className="mr-1 h-4 w-4" />
            Medikament hinzufügen
          </Button>
        )}
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-wishes`}>Individuelle Wünsche / Besonderheiten</Label>
        <Textarea
          id={`${idPrefix}-wishes`}
          value={plan.individualWishes}
          onChange={(e) => onChange({ ...plan, individualWishes: e.target.value })}
          rows={3}
          placeholder="z.B. Trockenfutter einweichen, Tabletten in Leberwurst"
          readOnly={readOnly}
        />
      </div>

      {!readOnly && (
        <div className="rounded-lg border border-dashed border-sage-200 bg-sage-50/50 p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-sage-700"
            onClick={() => setShowExample((prev) => !prev)}
          >
            {showExample ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            Beispiel anzeigen
          </Button>
          {showExample && (
            <p className="mt-2 text-xs text-sage-600 leading-relaxed">
              Beispiel: Morgens 6 Uhr 200g Trockenfutter, abends 19 Uhr 150g Dose mit 1 TL Öl.
              Medikamente morgens: Apoquel ½ h vor Futter (½ Tablette) und Herzmedikament mit Futter
              (1 Tablette). Individuell: Trockenfutter 10 Min. einweichen.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
