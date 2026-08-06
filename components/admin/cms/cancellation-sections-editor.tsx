'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import {
  emptyCancellationSection,
  type CancellationPeriodRefund,
  type CancellationSection,
} from '@/lib/cms/cancellation-policy'

function PolicyListEditor({
  list,
  onChange,
}: {
  list: CancellationPeriodRefund[]
  onChange: (val: CancellationPeriodRefund[]) => void
}) {
  const items = list || []
  return (
    <div className="space-y-3">
      <Label className="font-semibold">Fristen</Label>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="border border-sage-200 p-3 rounded-lg relative space-y-2 bg-white"
        >
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="absolute top-1 right-1 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="space-y-1 pr-8">
            <Label className="text-xs text-gray-500">Frist</Label>
            <Input
              value={item.period}
              onChange={(e) => {
                const next = [...items]
                next[idx] = { ...next[idx], period: e.target.value }
                onChange(next)
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Erstattung</Label>
            <Input
              value={item.refund}
              onChange={(e) => {
                const next = [...items]
                next[idx] = { ...next[idx], refund: e.target.value }
                onChange(next)
              }}
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => onChange([...items, { period: '', refund: '' }])}
      >
        <Plus className="h-4 w-4 mr-1" /> Frist hinzufügen
      </Button>
    </div>
  )
}

function NotesListEditor({
  list,
  onChange,
}: {
  list: string[]
  onChange: (val: string[]) => void
}) {
  const items = list || []
  return (
    <div className="space-y-2">
      <Label className="font-semibold">Hinweise zu diesem Abschnitt (optional)</Label>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <Textarea
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[idx] = e.target.value
              onChange(next)
            }}
            rows={2}
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="text-red-500 hover:text-red-700 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" type="button" onClick={() => onChange([...items, ''])}>
        <Plus className="h-4 w-4 mr-1" /> Hinweis hinzufügen
      </Button>
    </div>
  )
}

export function CancellationSectionsEditor({
  mainTitleLabel,
  mainTitle,
  onMainTitleChange,
  sections,
  onSectionsChange,
  globalNotesLabel,
  globalNotes,
  onGlobalNotesChange,
}: {
  mainTitleLabel: string
  mainTitle: string
  onMainTitleChange: (val: string) => void
  sections: CancellationSection[]
  onSectionsChange: (val: CancellationSection[]) => void
  globalNotesLabel?: string
  globalNotes?: string[]
  onGlobalNotesChange?: (val: string[]) => void
}) {
  const items = sections || []

  const updateSection = (idx: number, patch: Partial<CancellationSection>) => {
    const next = [...items]
    next[idx] = { ...next[idx], ...patch }
    onSectionsChange(next)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>{mainTitleLabel}</Label>
        <Input value={mainTitle} onChange={(e) => onMainTitleChange(e.target.value)} />
      </div>

      {items.map((section, idx) => (
        <div
          key={idx}
          className="border border-sage-300 p-4 rounded-lg relative space-y-4 bg-sage-50/50"
        >
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => onSectionsChange(items.filter((_, i) => i !== idx))}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            title="Abschnitt entfernen"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium text-sage-700 pr-10">
            Abschnitt {idx + 1}
          </p>
          <div className="space-y-2">
            <Label>Unterüberschrift (optional)</Label>
            <Input
              value={section.title || ''}
              placeholder="z. B. Schulferien BW – leer lassen für keinen Untertitel"
              onChange={(e) => updateSection(idx, { title: e.target.value })}
            />
          </div>
          <PolicyListEditor
            list={section.policy}
            onChange={(policy) => updateSection(idx, { policy })}
          />
          <NotesListEditor
            list={section.notes || []}
            onChange={(notes) => updateSection(idx, { notes })}
          />
        </div>
      ))}

      <Button
        variant="outline"
        type="button"
        onClick={() => onSectionsChange([...items, emptyCancellationSection()])}
      >
        <Plus className="h-4 w-4 mr-1" /> Abschnitt hinzufügen
      </Button>

      {globalNotesLabel && onGlobalNotesChange && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="font-semibold">{globalNotesLabel}</Label>
          <NotesListEditor list={globalNotes || []} onChange={onGlobalNotesChange} />
        </div>
      )}
    </div>
  )
}
