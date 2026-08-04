'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CARE_PLAN_FOOD_TYPES,
  CARE_PLAN_SLOT_LABELS,
  normalizeCarePlan,
} from '@/lib/pet-care-plan'

type PetCarePlanPrintProps = {
  petName: string
  customerName?: string
  carePlan: unknown
}

export function PetCarePlanPrintView({
  petName,
  customerName,
  carePlan,
}: PetCarePlanPrintProps) {
  const plan = normalizeCarePlan(carePlan)
  if (!plan) {
    return <p className="p-8 text-center text-sage-600">Kein Pflegeplan vorhanden.</p>
  }

  const foodTypes = plan.foodTypes
    .map((id) => CARE_PLAN_FOOD_TYPES.find((item) => item.id === id)?.label)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="print-care-plan mx-auto max-w-4xl p-8 text-black bg-white">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-care-plan,
          .print-care-plan * {
            visibility: visible;
          }
          .print-care-plan {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <Button type="button" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Drucken
        </Button>
      </div>

      <header className="mb-6 border-b border-black pb-4">
        <h1 className="text-2xl font-bold">Futter- & Medikamentenplan</h1>
        <p className="mt-2 text-sm">Tier: {petName}</p>
        {customerName && <p className="text-sm">Besitzer: {customerName}</p>}
        <p className="text-sm">Stand: {new Date().toLocaleDateString('de-DE')}</p>
      </header>

      {foodTypes && (
        <p className="mb-4 text-sm"><strong>Futterarten:</strong> {foodTypes}</p>
      )}

      <h2 className="mb-2 text-lg font-semibold">Fütterung</h2>
      <table className="mb-6 w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1 text-left"></th>
            {CARE_PLAN_SLOT_LABELS.map((label) => (
              <th key={label} className="border border-black px-2 py-1 text-left">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Uhrzeit', 'time'],
            ['Was wird gefüttert', 'food'],
            ['Menge', 'amount'],
            ['Zusätze', 'additive'],
            ['Menge Zusatz', 'additiveAmount'],
          ].map(([label, key]) => (
            <tr key={label}>
              <td className="border border-black px-2 py-1 font-medium">{label}</td>
              {plan.feeding.map((slot, index) => (
                <td key={`${label}-${index}`} className="border border-black px-2 py-1">
                  {slot.enabled ? (slot[key as keyof typeof slot] as string) || '–' : '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-lg font-semibold">Medikamente</h2>
      <table className="mb-6 w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1 text-left"></th>
            {CARE_PLAN_SLOT_LABELS.map((label) => (
              <th key={label} className="border border-black px-2 py-1 text-left">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Timing', 'timing'],
            ['Medikament', 'medication'],
            ['Menge', 'amount'],
          ].map(([label, key]) => (
            <tr key={label}>
              <td className="border border-black px-2 py-1 font-medium">{label}</td>
              {plan.medication.map((slot, index) => (
                <td key={`${label}-${index}`} className="border border-black px-2 py-1">
                  {slot.enabled ? (slot[key as keyof typeof slot] as string) || '–' : '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {plan.intolerances && (
        <p className="mb-2 text-sm"><strong>Unverträglichkeiten:</strong> {plan.intolerances}</p>
      )}
      {plan.individualWishes && (
        <p className="text-sm"><strong>Individuelle Wünsche:</strong> {plan.individualWishes}</p>
      )}
    </div>
  )
}
