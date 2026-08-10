'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PickupTimeDefaults } from '@/lib/pickup-time-defaults'
import { defaultPickupTimeDefaults } from '@/lib/pickup-time-defaults'

type PickupTimeDefaultsFieldsProps = {
  value: PickupTimeDefaults | undefined
  onChange: (value: PickupTimeDefaults) => void
  idPrefix: string
}

export function PickupTimeDefaultsFields({
  value,
  onChange,
  idPrefix,
}: PickupTimeDefaultsFieldsProps) {
  const defaults = value ?? defaultPickupTimeDefaults

  function updateField(field: keyof PickupTimeDefaults, next: string) {
    onChange({ ...defaults, [field]: next })
  }

  return (
    <div className="grid gap-4 rounded-lg border border-sage-200 bg-sage-50/40 p-4 md:grid-cols-2">
      <p className="md:col-span-2 text-sm font-medium text-sage-900">
        Standard-Voreinstellung im Buchungs-Wizard (HH:MM)
      </p>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-weekday-drop-off`}>Mo–Fr: Bringen</Label>
        <Input
          id={`${idPrefix}-weekday-drop-off`}
          type="time"
          value={defaults.weekdayDropOff}
          onChange={(e) => updateField('weekdayDropOff', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-weekday-pick-up`}>Mo–Fr: Abholen</Label>
        <Input
          id={`${idPrefix}-weekday-pick-up`}
          type="time"
          value={defaults.weekdayPickUp}
          onChange={(e) => updateField('weekdayPickUp', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-weekend-drop-off`}>Sa/So/Feiertag: Bringen</Label>
        <Input
          id={`${idPrefix}-weekend-drop-off`}
          type="time"
          value={defaults.weekendDropOff}
          onChange={(e) => updateField('weekendDropOff', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-weekend-pick-up`}>Sa/So/Feiertag: Abholen</Label>
        <Input
          id={`${idPrefix}-weekend-pick-up`}
          type="time"
          value={defaults.weekendPickUp}
          onChange={(e) => updateField('weekendPickUp', e.target.value)}
        />
      </div>
    </div>
  )
}
