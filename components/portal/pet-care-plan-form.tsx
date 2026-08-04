'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  CARE_PLAN_FOOD_TYPES,
  CARE_PLAN_SLOT_LABELS,
  emptyPetCarePlan,
  normalizeCarePlan,
  type CarePlanFeedingSlot,
  type CarePlanMedicationSlot,
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

function updateMedicationSlot(
  plan: PetCarePlan,
  index: number,
  patch: Partial<CarePlanMedicationSlot>
): PetCarePlan {
  const medication = [...plan.medication]
  medication[index] = { ...medication[index], ...patch }
  return { ...plan, medication }
}

export function PetCarePlanForm({
  value,
  onChange,
  readOnly = false,
  idPrefix = 'care-plan',
}: PetCarePlanFormProps) {
  const [showExample, setShowExample] = useState(false)
  const plan = normalizeCarePlan(value) ?? emptyPetCarePlan()

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
        <h4 className="font-semibold text-sage-900">Medikamente</h4>
        <div className="overflow-x-auto rounded-lg border border-sage-200">
          <table className="min-w-full text-sm">
            <thead className="bg-sage-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-sage-700 w-24">Zeitpunkt</th>
                <th className="px-3 py-2 text-left font-medium text-sage-700">Morgens</th>
                <th className="px-3 py-2 text-left font-medium text-sage-700">Mittags</th>
                <th className="px-3 py-2 text-left font-medium text-sage-700">Abends</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'timing', label: 'Timing', placeholder: '½ h vor Futter' },
                { key: 'medication', label: 'Medikament', placeholder: 'Apoquel' },
                { key: 'amount', label: 'Menge', placeholder: '½ Tablette' },
              ].map((row) => (
                <tr key={row.key} className="border-t border-sage-100">
                  <td className="px-3 py-2 align-top font-medium text-sage-600">{row.label}</td>
                  {CARE_PLAN_SLOT_LABELS.map((slotLabel, index) => {
                    const slot = plan.medication[index]
                    const field = row.key as keyof CarePlanMedicationSlot
                    const disabled = readOnly || !slot.enabled

                    if (row.key === 'timing') {
                      return (
                        <td key={`${row.key}-${index}`} className="px-3 py-2 align-top">
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs text-sage-600">
                              <Checkbox
                                checked={slot.enabled}
                                onCheckedChange={(checked) =>
                                  onChange(
                                    updateMedicationSlot(plan, index, { enabled: checked === true })
                                  )
                                }
                                disabled={readOnly}
                              />
                              {slotLabel}
                            </label>
                            <Input
                              value={slot.timing}
                              onChange={(e) =>
                                onChange(
                                  updateMedicationSlot(plan, index, { timing: e.target.value })
                                )
                              }
                              placeholder={row.placeholder}
                              disabled={readOnly || !slot.enabled}
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
                            onChange(
                              updateMedicationSlot(plan, index, { [field]: e.target.value })
                            )
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
              Medikament Apoquel abends ½ h vor Futter, ½ Tablette. Individuell: Trockenfutter 10 Min. einweichen.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
