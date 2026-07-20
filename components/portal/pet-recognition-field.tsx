'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type PetRecognitionFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export function PetRecognitionField({
  id = 'pet-wiedererkennungsmerkmal',
  value,
  onChange,
  readOnly = false,
}: PetRecognitionFieldProps) {
  return (
    <div className="rounded-lg border border-sage-300 bg-sage-50/80 p-4 space-y-2">
      <div>
        <Label htmlFor={id} className="text-sage-900">
          Wiedererkennungsmerkmal
        </Label>
        <p className="text-sm text-sage-600 mt-1">
          Besonders wichtig bei mehreren Tieren gleicher Rasse oder Farbe – z. B. weiße Pfote links,
          Narbe am Ohr oder auffälliges Halsband.
        </p>
      </div>
      {readOnly ? (
        <p className="text-sm text-sage-800 whitespace-pre-wrap">
          {value.trim() || '—'}
        </p>
      ) : (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          placeholder="z. B. weiße Pfote links, Narbe über dem rechten Auge"
          className="bg-white border-sage-200"
        />
      )}
    </div>
  )
}
