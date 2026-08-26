'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import { DAY_CARE_WEEKDAY_OPTIONS, formatWeekdayList } from '@/lib/day-care-booking'
import { isPetDeceased } from '@/lib/pet-lifecycle'
import type { Pet, SpringerRegistration } from '@/lib/types'

type PetDraft = {
  weekdays: number[]
  is_active: boolean
  dirty: boolean
  saving: boolean
}

export default function PortalSpringerPage() {
  const { toast } = useToast()
  const [pets, setPets] = useState<Pet[]>([])
  const [registrations, setRegistrations] = useState<SpringerRegistration[]>([])
  const [drafts, setDrafts] = useState<Record<string, PetDraft>>({})
  const [loading, setLoading] = useState(true)

  const registrationByPetId = useMemo(() => {
    const map = new Map<string, SpringerRegistration>()
    for (const registration of registrations) {
      map.set(registration.pet_id, registration)
    }
    return map
  }, [registrations])

  const activePets = useMemo(
    () => pets.filter((pet) => !isPetDeceased(pet)),
    [pets]
  )

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [petsRes, springerRes] = await Promise.all([
        authenticatedFetch('/api/portal/pets'),
        authenticatedFetch('/api/portal/springer'),
      ])

      const petsResult = await readApiResponse<{ pets?: Pet[] }>(petsRes)
      const springerResult = await readApiResponse<{ registrations?: SpringerRegistration[] }>(
        springerRes
      )

      if (petsResult.error) {
        throw new Error(petsResult.error)
      }
      if (springerResult.error) {
        throw new Error(springerResult.error)
      }

      const nextPets = petsResult.data?.pets || []
      const nextRegistrations = springerResult.data?.registrations || []
      setPets(nextPets)
      setRegistrations(nextRegistrations)

      const nextDrafts: Record<string, PetDraft> = {}
      for (const pet of nextPets) {
        const existing = nextRegistrations.find((r) => r.pet_id === pet.id)
        nextDrafts[pet.id] = {
          weekdays: existing?.weekdays ? [...existing.weekdays] : [],
          is_active: existing?.is_active ?? false,
          dirty: false,
          saving: false,
        }
      }
      setDrafts(nextDrafts)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: 'Springerliste konnte nicht geladen werden.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function toggleWeekday(petId: string, weekday: number) {
    setDrafts((prev) => {
      const current = prev[petId] || { weekdays: [], is_active: false, dirty: false, saving: false }
      const active = current.weekdays.includes(weekday)
      const weekdays = active
        ? current.weekdays.filter((d) => d !== weekday)
        : [...current.weekdays, weekday].sort((a, b) => a - b)
      return {
        ...prev,
        [petId]: {
          ...current,
          weekdays,
          is_active: weekdays.length === 0 ? false : current.is_active || true,
          dirty: true,
        },
      }
    })
  }

  function setActive(petId: string, isActive: boolean) {
    setDrafts((prev) => {
      const current = prev[petId] || { weekdays: [], is_active: false, dirty: false, saving: false }
      return {
        ...prev,
        [petId]: {
          ...current,
          is_active: isActive,
          dirty: true,
        },
      }
    })
  }

  async function savePet(petId: string) {
    const draft = drafts[petId]
    if (!draft) return

    if (draft.weekdays.length === 0) {
      toast({
        title: 'Wochentage fehlen',
        description: 'Bitte wähle mindestens einen Wochentag.',
        variant: 'destructive',
      })
      return
    }

    setDrafts((prev) => ({
      ...prev,
      [petId]: { ...prev[petId], saving: true },
    }))

    try {
      const response = await authenticatedFetch('/api/portal/springer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          weekdays: draft.weekdays,
          is_active: draft.is_active,
        }),
      })
      const { data, error } = await readApiResponse<{ registration?: SpringerRegistration }>(
        response
      )
      if (error || !data?.registration) {
        throw new Error(error || 'Speichern fehlgeschlagen')
      }

      setRegistrations((prev) => {
        const without = prev.filter((r) => r.pet_id !== petId)
        return [...without, data.registration!]
      })
      setDrafts((prev) => ({
        ...prev,
        [petId]: {
          weekdays: [...data.registration!.weekdays],
          is_active: data.registration!.is_active,
          dirty: false,
          saving: false,
        },
      }))
      toast({
        title: 'Gespeichert',
        description: 'Deine Springer-Einstellungen wurden aktualisiert.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
      setDrafts((prev) => ({
        ...prev,
        [petId]: { ...prev[petId], saving: false },
      }))
    }
  }

  async function deactivatePet(petId: string) {
    const existing = registrationByPetId.get(petId)
    if (!existing) {
      setDrafts((prev) => ({
        ...prev,
        [petId]: {
          weekdays: prev[petId]?.weekdays || [],
          is_active: false,
          dirty: false,
          saving: false,
        },
      }))
      return
    }

    setDrafts((prev) => ({
      ...prev,
      [petId]: { ...prev[petId], saving: true },
    }))

    try {
      const response = await authenticatedFetch(
        `/api/portal/springer?pet_id=${encodeURIComponent(petId)}`,
        { method: 'DELETE' }
      )
      const { data, error } = await readApiResponse<{ registration?: SpringerRegistration }>(
        response
      )
      if (error || !data?.registration) {
        throw new Error(error || 'Deaktivieren fehlgeschlagen')
      }

      setRegistrations((prev) =>
        prev.map((r) => (r.pet_id === petId ? { ...r, is_active: false } : r))
      )
      setDrafts((prev) => ({
        ...prev,
        [petId]: {
          weekdays: prev[petId]?.weekdays || data.registration!.weekdays,
          is_active: false,
          dirty: false,
          saving: false,
        },
      }))
      toast({
        title: 'Deaktiviert',
        description: 'Dieses Tier ist nicht mehr auf der Springerliste.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Deaktivieren fehlgeschlagen',
        variant: 'destructive',
      })
      setDrafts((prev) => ({
        ...prev,
        [petId]: { ...prev[petId], saving: false },
      }))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sage-600" />
      </div>
    )
  }

  const activeRegistrations = registrations.filter((r) => r.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Springerliste</h1>
        <p className="mt-2 text-sage-600">
          Trage dich ein, wenn du kurzfristig einen freien Tagesbetreuungsplatz übernehmen
          möchtest.
        </p>
      </div>

      {activeRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sage-900">Aktive Einträge</CardTitle>
            <CardDescription>
              An diesen Tagen können wir dich bei freien Plätzen kontaktieren.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRegistrations.map((registration) => {
              const pet = pets.find((p) => p.id === registration.pet_id)
              return (
                <div
                  key={registration.id}
                  className="flex flex-col gap-1 rounded-lg border border-sage-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-sage-900">
                      {pet?.name || registration.pet?.name || 'Tier'}
                    </p>
                    <p className="text-sm text-sage-600">
                      {formatWeekdayList(registration.weekdays)}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {activePets.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sage-600">
              Bitte lege zuerst ein Tier im Portal an.
            </CardContent>
          </Card>
        ) : (
          activePets.map((pet) => {
            const draft = drafts[pet.id] || {
              weekdays: [],
              is_active: false,
              dirty: false,
              saving: false,
            }
            return (
              <Card key={pet.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-sage-900">{pet.name}</CardTitle>
                      <CardDescription>
                        {pet.tierart || 'Tier'} · Wochentage für Springer-Anfragen
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor={`active-${pet.id}`} className="text-sage-700">
                        Aktiv
                      </Label>
                      <Switch
                        id={`active-${pet.id}`}
                        checked={draft.is_active}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            void deactivatePet(pet.id)
                            return
                          }
                          setActive(pet.id, true)
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {DAY_CARE_WEEKDAY_OPTIONS.map((day) => {
                      const active = draft.weekdays.includes(day.iso)
                      return (
                        <Button
                          key={day.iso}
                          type="button"
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          className={active ? 'bg-sage-600 hover:bg-sage-700' : ''}
                          onClick={() => toggleWeekday(pet.id, day.iso)}
                        >
                          {day.label}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      disabled={!draft.dirty || draft.saving || draft.weekdays.length === 0}
                      className="bg-sage-600 hover:bg-sage-700"
                      onClick={() => void savePet(pet.id)}
                    >
                      {draft.saving ? 'Speichern…' : 'Speichern'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
