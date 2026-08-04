'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  emptyPriceRuleForm,
  formToRuleRow,
  PetPriceRuleEditorRow,
  ruleRowToForm,
  type PriceRuleFormState,
} from '@/components/admin/price-rule-editor'
import type { PriceRuleRow } from '@/lib/price-resolver'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'

interface CatalogPrice {
  id: string
  category_id: string
  name: string
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  unit: string | null
  usage?: string
}

interface PriceCategory {
  id: string
  name: string
}

interface PetPriceRulesPanelProps {
  petId: string
  petName: string
  customerId: string
  copyFromPetId?: string | null
  onCopyFromPetIdChange?: (petId: string | null) => void
  otherPets?: Array<{ id: string; name: string }>
}

export function PetPriceRulesPanel({
  petId,
  petName,
  copyFromPetId,
  onCopyFromPetIdChange,
  otherPets = [],
}: PetPriceRulesPanelProps) {
  const [catalogPrices, setCatalogPrices] = useState<CatalogPrice[]>([])
  const [categories, setCategories] = useState<PriceCategory[]>([])
  const [forms, setForms] = useState<Record<string, PriceRuleFormState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    void loadData()
  }, [petId])

  async function loadData() {
    setLoading(true)
    try {
      const [catalogRes, rulesRes] = await Promise.all([
        authenticatedFetch('/api/admin/prices'),
        authenticatedFetch(`/api/admin/price-rules?scope_type=pet&scope_id=${petId}`),
      ])
      const catalogData = await catalogRes.json()
      const rulesData = await rulesRes.json()

      const prices = (catalogData.prices || []).filter(
        (price: CatalogPrice) => price.price_type !== 'text'
      )
      setCatalogPrices(prices)
      setCategories(catalogData.categories || [])

      const formsMap: Record<string, PriceRuleFormState> = {}
      for (const price of prices) {
        const rule = (rulesData.rules || []).find(
          (entry: PriceRuleRow) => entry.price_id === price.id
        )
        formsMap[price.id] = rule ? ruleRowToForm(rule) : { ...emptyPriceRuleForm(), rule_mode: 'inherit' }
      }
      setForms(formsMap)
    } catch (error) {
      console.error('Error loading pet prices:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const rules = Object.entries(forms)
        .map(([price_id, form]) => formToRuleRow(price_id, form))
        .filter(Boolean)

      const response = await authenticatedFetch('/api/admin/price-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope_type: 'pet',
          scope_id: petId,
          rules,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Erfolg',
          description: `Preisliste für ${petName} gespeichert`,
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Speichern fehlgeschlagen',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving pet prices:', error)
    } finally {
      setSaving(false)
    }
  }

  async function copyFromPet(sourcePetId: string) {
    try {
      const response = await authenticatedFetch(
        `/api/admin/price-rules?scope_type=pet&scope_id=${sourcePetId}`
      )
      const data = await response.json()
      const sourceRules = data.rules || []
      const nextForms = { ...forms }

      for (const price of catalogPrices) {
        const rule = sourceRules.find((entry: PriceRuleRow) => entry.price_id === price.id)
        nextForms[price.id] = rule
          ? ruleRowToForm(rule)
          : { ...emptyPriceRuleForm(), rule_mode: 'inherit' }
      }

      setForms(nextForms)
      onCopyFromPetIdChange?.(sourcePetId)
      toast({
        title: 'Übernommen',
        description: 'Einstellungen wurden in die Maske kopiert – bitte speichern.',
      })
    } catch (error) {
      console.error('Error copying pet prices:', error)
    }
  }

  function updateForm(priceId: string, next: PriceRuleFormState) {
    setForms((prev) => ({ ...prev, [priceId]: next }))
  }

  if (loading) {
    return <p className="text-sm text-sage-500">Preisliste wird geladen…</p>
  }

  return (
    <CollapsibleAdminCard title={`Preisliste: ${petName}`} defaultExpanded={false}>
      <p className="text-sm text-sage-600 mb-4">
        Alle Leistungen werden angezeigt. Nur Zeilen mit wirksamem Preis fließen in Buchung und
        Kostenschätzung ein.
      </p>

      {otherPets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {otherPets.map((pet) => (
            <Button
              key={pet.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyFromPet(pet.id)}
            >
              Von {pet.name} kopieren
            </Button>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {catalogPrices.map((price) => (
          <PetPriceRuleEditorRow
            key={price.id}
            catalogPrice={price}
            categoryName={categories.find((category) => category.id === price.category_id)?.name}
            form={forms[price.id] ?? { ...emptyPriceRuleForm(), rule_mode: 'inherit' }}
            onChange={(next) => updateForm(price.id, next)}
          />
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving} className="bg-sage-600 hover:bg-sage-700">
          {saving ? 'Wird gespeichert…' : 'Tier-Preise speichern'}
        </Button>
      </div>
    </CollapsibleAdminCard>
  )
}
