'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import {
  emptyCancellationPolicyRuleSet,
  emptyCancellationPolicyTier,
  type CancellationPolicyConfig,
  type CancellationPolicyRuleSet,
} from '@/lib/cancellation-policy-config'

type Props = {
  config: CancellationPolicyConfig
  onChange: (config: CancellationPolicyConfig) => void
}

function TierEditor({
  ruleSet,
  onChange,
}: {
  ruleSet: CancellationPolicyRuleSet
  onChange: (next: CancellationPolicyRuleSet) => void
}) {
  return (
    <div className="space-y-3">
      {ruleSet.tiers.map((tier, idx) => (
        <div key={idx} className="relative rounded-lg border border-sage-200 bg-white p-3 space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 text-red-500 hover:text-red-700"
            onClick={() =>
              onChange({
                ...ruleSet,
                tiers: ruleSet.tiers.filter((_, i) => i !== idx),
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pr-8">
            <div>
              <Label className="text-xs text-sage-600">Min. Tage vorher</Label>
              <Input
                type="number"
                min={0}
                value={tier.minDaysBefore}
                onChange={(e) => {
                  const tiers = [...ruleSet.tiers]
                  tiers[idx] = { ...tier, minDaysBefore: Number(e.target.value) }
                  onChange({ ...ruleSet, tiers })
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-sage-600">Max. Tage vorher</Label>
              <Input
                type="number"
                min={0}
                placeholder="offen"
                value={tier.maxDaysBefore ?? ''}
                onChange={(e) => {
                  const tiers = [...ruleSet.tiers]
                  tiers[idx] = {
                    ...tier,
                    maxDaysBefore: e.target.value === '' ? null : Number(e.target.value),
                  }
                  onChange({ ...ruleSet, tiers })
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-sage-600">Storno-Anteil (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={tier.chargePercent}
                onChange={(e) => {
                  const tiers = [...ruleSet.tiers]
                  tiers[idx] = { ...tier, chargePercent: Number(e.target.value) }
                  onChange({ ...ruleSet, tiers })
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-sage-600">Anzeige-Label</Label>
              <Input
                value={tier.label}
                onChange={(e) => {
                  const tiers = [...ruleSet.tiers]
                  tiers[idx] = { ...tier, label: e.target.value }
                  onChange({ ...ruleSet, tiers })
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...ruleSet,
            tiers: [...ruleSet.tiers, emptyCancellationPolicyTier()],
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Staffel hinzufügen
      </Button>
    </div>
  )
}

export function CancellationPolicyEditor({ config, onChange }: Props) {
  function updateRuleSet(index: number, next: CancellationPolicyRuleSet) {
    const ruleSets = [...config.ruleSets]
    ruleSets[index] = next
    onChange({ ...config, ruleSets })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Titel</Label>
          <Input
            value={config.title}
            onChange={(e) => onChange({ ...config, title: e.target.value })}
          />
        </div>
        <div>
          <Label>Stichtag (Uhrzeit, 0–23)</Label>
          <Input
            type="number"
            min={0}
            max={23}
            value={config.cutoffHour}
            onChange={(e) => onChange({ ...config, cutoffHour: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label>Allgemeine Hinweise</Label>
        <Textarea
          rows={4}
          value={config.generalNotes.join('\n')}
          onChange={(e) =>
            onChange({
              ...config,
              generalNotes: e.target.value.split('\n').filter(Boolean),
            })
          }
          placeholder="Ein Hinweis pro Zeile"
        />
      </div>

      {config.ruleSets.map((ruleSet, index) => (
        <div key={ruleSet.id} className="rounded-xl border border-sage-200 p-4 space-y-4 bg-sage-50/40">
          <div className="flex items-start justify-between gap-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
              <div>
                <Label>Regelwerk-ID</Label>
                <Input
                  value={ruleSet.id}
                  onChange={(e) => updateRuleSet(index, { ...ruleSet, id: e.target.value })}
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={ruleSet.name}
                  onChange={(e) => updateRuleSet(index, { ...ruleSet, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Bedingung</Label>
                <Select
                  value={ruleSet.condition.type}
                  onValueChange={(value: 'default' | 'school_holidays_bw') =>
                    updateRuleSet(index, {
                      ...ruleSet,
                      condition: { type: value },
                      priority: value === 'school_holidays_bw' ? 10 : 0,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard</SelectItem>
                    <SelectItem value="school_holidays_bw">Schulferien BW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {config.ruleSets.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700"
                onClick={() =>
                  onChange({
                    ...config,
                    ruleSets: config.ruleSets.filter((_, i) => i !== index),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <TierEditor ruleSet={ruleSet} onChange={(next) => updateRuleSet(index, next)} />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onChange({
            ...config,
            ruleSets: [...config.ruleSets, emptyCancellationPolicyRuleSet()],
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Regelwerk hinzufügen
      </Button>
    </div>
  )
}
