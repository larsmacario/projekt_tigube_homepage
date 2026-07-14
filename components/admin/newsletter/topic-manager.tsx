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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import type { NewsletterTopic } from '@/lib/types'
import { Plus, Settings2, Trash2 } from 'lucide-react'

type TopicManagerProps = {
  topics: NewsletterTopic[]
  onTopicsChange: (topics: NewsletterTopic[]) => void
  selectedTopicId: string
  onSelectTopic: (id: string) => void
}

export function TopicManager({ topics, onTopicsChange, selectedTopicId, onSelectTopic }: TopicManagerProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const loadTopics = async () => {
    const res = await authenticatedFetch('/api/admin/newsletter/topics')
    const data = await res.json()
    if (res.ok) onTopicsChange(data.topics || [])
  }

  useEffect(() => {
    if (open) loadTopics()
  }, [open])

  const addTopic = async () => {
    if (!name.trim()) {
      toast({ title: 'Name ist Pflicht', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/admin/newsletter/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setName('')
      setDescription('')
      await loadTopics()
      onSelectTopic(data.topic.id)
      toast({ title: 'Thema angelegt', description: data.topic.name })
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Anlegen fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteTopic = async (topic: NewsletterTopic) => {
    if (!window.confirm(`Thema „${topic.name}" wirklich löschen?`)) return
    const res = await authenticatedFetch(`/api/admin/newsletter/topics/${topic.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Fehler', description: data.error, variant: 'destructive' })
      return
    }
    if (selectedTopicId === topic.id) onSelectTopic('')
    await loadTopics()
    toast({ title: 'Thema gelöscht' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-sage-600 hover:text-sage-900">
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          Themen verwalten
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Themen (transaktional)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-md border border-sage-200 p-3">
            <p className="text-sm font-medium text-sage-900">Neues Thema</p>
            <div>
              <Label htmlFor="topic-name">Name</Label>
              <Input
                id="topic-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Buchung, Onboarding, Erinnerung"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="topic-desc">Beschreibung (optional)</Label>
              <Textarea
                id="topic-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurznotiz für euch im Team"
                rows={2}
                className="mt-1"
              />
            </div>
            <Button type="button" size="sm" onClick={addTopic} disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" />
              Thema anlegen
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {topics.length === 0 && (
              <p className="text-sm text-sage-600">Noch keine Themen vorhanden.</p>
            )}
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-start justify-between gap-2 rounded-md border border-sage-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-sage-900">{topic.name}</p>
                  {topic.description && (
                    <p className="text-xs text-sage-600 mt-0.5">{topic.description}</p>
                  )}
                </div>
                {topic.name !== 'Allgemein' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700"
                    onClick={() => deleteTopic(topic)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
