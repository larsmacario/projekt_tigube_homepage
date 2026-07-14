'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { Button } from '@/components/ui/button'
import { LayoutTemplate } from 'lucide-react'
import type { NewsletterTemplate } from '@/lib/types'

type TemplateModalProps = {
  onSelect: (template: NewsletterTemplate) => void
}

export function TemplateModal({ onSelect }: TemplateModalProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([])

  useEffect(() => {
    if (!open) return
    authenticatedFetch('/api/admin/newsletter/templates')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Template wählen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>E-Mail-Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {templates.length === 0 && (
            <p className="text-sm text-sage-600">Noch keine Templates vorhanden.</p>
          )}
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="w-full text-left rounded-md border border-sage-200 p-3 hover:bg-sage-50"
              onClick={() => {
                onSelect(template)
                setOpen(false)
              }}
            >
              <p className="font-medium text-sage-900">{template.name}</p>
              {template.subject_template && (
                <p className="text-sm text-sage-600 mt-1">{template.subject_template}</p>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
