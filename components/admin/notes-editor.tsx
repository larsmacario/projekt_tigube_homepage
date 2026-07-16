'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { ContactNote } from '@/lib/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface NotesEditorProps {
  notesApiPath: string
  notes: ContactNote[]
  onNotesChange: (notes: ContactNote[]) => void
}

export function NotesEditor({ notesApiPath, notes, onNotesChange }: NotesEditorProps) {
  const { toast } = useToast()
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function addNote() {
    if (!newNote.trim()) {
      toast({ title: 'Hinweis', description: 'Bitte geben Sie eine Notiz ein', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const response = await authenticatedFetch(notesApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        onNotesChange([data.note, ...notes])
        setNewNote('')
        toast({ title: 'Erfolg', description: 'Notiz hinzugefügt' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Hinzufügen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Hinzufügen der Notiz', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function startEdit(note: ContactNote) {
    setEditingId(note.id)
    setEditText(note.note)
  }

  async function saveEdit(noteId: string) {
    if (!editText.trim()) {
      toast({ title: 'Hinweis', description: 'Notiz darf nicht leer sein', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editText }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        onNotesChange(notes.map((n) => (n.id === noteId ? data.note : n)))
        setEditingId(null)
        setEditText('')
        toast({ title: 'Erfolg', description: 'Notiz aktualisiert' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Speichern', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Speichern der Notiz', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/notes/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        onNotesChange(notes.filter((n) => n.id !== deleteId))
        setDeleteId(null)
        toast({ title: 'Erfolg', description: 'Notiz gelöscht' })
      } else {
        const error = await response.json()
        toast({ title: 'Fehler', description: error.error || 'Fehler beim Löschen', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Fehler', description: 'Fehler beim Löschen der Notiz', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      {notes.length === 0 ? (
        <p className="text-sage-600 text-center py-4 text-sm">Keine Notizen vorhanden</p>
      ) : (
        notes.map((note) => (
          <div key={note.id} className="p-3 bg-sage-50 rounded text-sm">
            {editingId === note.id ? (
              <div className="space-y-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(note.id)} disabled={saving}>
                    <Check className="h-3 w-3 mr-1" />
                    Speichern
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={saving}>
                    <X className="h-3 w-3 mr-1" />
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{note.note}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-sage-600">
                    {new Date(note.created_at).toLocaleString('de-DE')}
                    {note.created_by && typeof note.created_by === 'object' && 'email' in note.created_by && (
                      ` • ${note.created_by.email}`
                    )}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(note)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setDeleteId(note.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))
      )}

      <div className="space-y-2 pt-2">
        <Textarea
          placeholder="Neue Notiz hinzufügen..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
        />
        <Button onClick={addNote} size="sm" className="w-full" disabled={saving}>
          Notiz hinzufügen
        </Button>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Notiz wird dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={saving}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
