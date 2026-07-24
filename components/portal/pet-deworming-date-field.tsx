'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type DewormingDateMode = 'last' | 'next'

type PetDewormingDateFieldProps = {
  idPrefix?: string
  letzteStuhlprobe: string
  naechsteStuhlprobe: string
  onChange: (values: { letzte_stuhlprobe: string; naechste_stuhlprobe: string }) => void
}

function inferMode(letzte: string, naechste: string): DewormingDateMode {
  if (naechste.trim() && !letzte.trim()) return 'next'
  return 'last'
}

export function PetDewormingDateField({
  idPrefix = 'pet',
  letzteStuhlprobe,
  naechsteStuhlprobe,
  onChange,
}: PetDewormingDateFieldProps) {
  const [mode, setMode] = useState<DewormingDateMode>(() =>
    inferMode(letzteStuhlprobe, naechsteStuhlprobe)
  )

  const displayValue = mode === 'last' ? letzteStuhlprobe : naechsteStuhlprobe
  const today = new Date().toISOString().split('T')[0]

  function handleModeChange(nextMode: DewormingDateMode) {
    const currentValue = mode === 'last' ? letzteStuhlprobe : naechsteStuhlprobe
    setMode(nextMode)
    if (nextMode === 'last') {
      onChange({ letzte_stuhlprobe: currentValue, naechste_stuhlprobe: '' })
    } else {
      onChange({ letzte_stuhlprobe: '', naechste_stuhlprobe: currentValue })
    }
  }

  function handleDateChange(value: string) {
    if (mode === 'last') {
      onChange({ letzte_stuhlprobe: value, naechste_stuhlprobe: '' })
    } else {
      onChange({ letzte_stuhlprobe: '', naechste_stuhlprobe: value })
    }
  }

  return (
    <div className="space-y-2 min-w-0">
      <Label className="text-xs text-sage-600">Entwurmung / Stuhlprobe</Label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <RadioGroup
          value={mode}
          onValueChange={(value) => handleModeChange(value as DewormingDateMode)}
          className="flex flex-row flex-wrap gap-x-3 gap-y-1"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="last" id={`${idPrefix}-entw-last`} className="h-3.5 w-3.5" />
            <Label htmlFor={`${idPrefix}-entw-last`} className="text-xs font-normal cursor-pointer leading-tight">
              Letzte Entw./Stuhlprobe
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="next" id={`${idPrefix}-entw-next`} className="h-3.5 w-3.5" />
            <Label htmlFor={`${idPrefix}-entw-next`} className="text-xs font-normal cursor-pointer leading-tight">
              Nächste Entw./Stuhlprobe
            </Label>
          </div>
        </RadioGroup>
        <Input
          id={`${idPrefix}-entw-date`}
          type="date"
          value={displayValue || ''}
          max={mode === 'last' ? today : undefined}
          onChange={(e) => handleDateChange(e.target.value)}
          className="h-8 w-[9.5rem] shrink-0 text-sm px-2"
        />
      </div>
    </div>
  )
}
