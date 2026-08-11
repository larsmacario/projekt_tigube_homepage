'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isPetDeceased } from '@/lib/pet-lifecycle'

type PetDeceasedFieldProps = {
  idPrefix?: string
  deceasedAt: string | null
  onChange: (deceasedAt: string | null) => void
  disabled?: boolean
}

export function PetDeceasedField({
  idPrefix = 'pet',
  deceasedAt,
  onChange,
  disabled = false,
}: PetDeceasedFieldProps) {
  const today = new Date().toISOString().split('T')[0]
  const checked = isPetDeceased({ deceased_at: deceasedAt })
  const checkboxId = `${idPrefix}-deceased-checkbox`
  const dateId = `${idPrefix}-deceased-at`

  function handleCheckedChange(nextChecked: boolean) {
    if (!nextChecked) {
      onChange(null)
      return
    }
    onChange(deceasedAt || today)
  }

  function handleDateChange(value: string) {
    onChange(value.trim() ? value : null)
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={checked}
          onCheckedChange={(value) => handleCheckedChange(value === true)}
          disabled={disabled}
        />
        <Label htmlFor={checkboxId} className="cursor-pointer font-normal text-muted-foreground">
          Tier ist verstorben / von uns gegangen
        </Label>
      </div>
      {checked && (
        <Input
          id={dateId}
          type="date"
          max={today}
          value={deceasedAt || ''}
          onChange={(e) => handleDateChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-[9.5rem] text-sm"
          aria-label="Datum"
        />
      )}
    </div>
  )
}
