'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { NEWSLETTER_GROUP_OPTIONS } from '@/lib/newsletter-groups'
import { X } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

type ContactOption = {
  id: string
  email: string
  label: string
}

type RecipientPickerProps = {
  groups: string[]
  contactIds: string[]
  selectedContacts: ContactOption[]
  onGroupsChange: (groups: string[]) => void
  onContactIdsChange: (ids: string[]) => void
  onSelectedContactsChange: (contacts: ContactOption[]) => void
  recipientCount: number | null
  warnLargeList: boolean
}

export function RecipientPicker({
  groups,
  contactIds,
  selectedContacts,
  onGroupsChange,
  onContactIdsChange,
  onSelectedContactsChange,
  recipientCount,
  warnLargeList,
}: RecipientPickerProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ContactOption[]>([])

  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await authenticatedFetch(`/api/admin/newsletter/contacts/search${params}`)
      const data = await res.json()
      if (res.ok) setResults(data.contacts || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const toggleGroup = (groupId: string, checked: boolean) => {
    if (checked) {
      onGroupsChange([...groups, groupId])
    } else {
      onGroupsChange(groups.filter((g) => g !== groupId))
    }
  }

  const addContact = (contact: ContactOption) => {
    if (contactIds.includes(contact.id)) return
    onContactIdsChange([...contactIds, contact.id])
    onSelectedContactsChange([...selectedContacts, contact])
    setSearch('')
  }

  const removeContact = (id: string) => {
    onContactIdsChange(contactIds.filter((cid) => cid !== id))
    onSelectedContactsChange(selectedContacts.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sage-700">Gruppen</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {NEWSLETTER_GROUP_OPTIONS.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm text-sage-800">
              <Checkbox
                checked={groups.includes(group.id)}
                onCheckedChange={(checked) => toggleGroup(group.id, checked === true)}
              />
              {group.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="contact-search" className="text-sage-700">Einzelne Kontakte</Label>
        <Input
          id="contact-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name oder E-Mail suchen …"
          className="mt-2"
        />
        {results.length > 0 && search && (
          <div className="mt-2 border border-sage-200 rounded-md bg-white shadow-sm max-h-40 overflow-y-auto">
            {results.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className="block w-full text-left px-3 py-2 text-sm hover:bg-sage-50"
                onClick={() => addContact(contact)}
              >
                {contact.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="gap-1 pr-1">
              {contact.label}
              <Button type="button" size="icon" variant="ghost" className="h-4 w-4" onClick={() => removeContact(contact.id)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {recipientCount !== null && (
        <p className={`text-sm ${warnLargeList ? 'text-amber-700' : 'text-sage-600'}`}>
          {recipientCount} Empfänger
          {warnLargeList && ' — IONOS kann bei vielen Empfängern Limits haben. Versand erfolgt nacheinander.'}
        </p>
      )}
    </div>
  )
}
