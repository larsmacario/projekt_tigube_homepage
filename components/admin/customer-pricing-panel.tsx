'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminSection } from '@/components/admin/admin-section'
import {
  emptyPriceOverrideForm,
  emptyPriceRuleForm,
  formToOverrideRow,
  formToRuleRow,
  PetPriceRuleEditorRow,
  PriceOverrideEditorRow,
  overrideRowToForm,
  ruleRowToForm,
  type PriceOverrideFormState,
  type PriceRuleFormState,
} from '@/components/admin/price-rule-editor'
import type { PriceOverrideRow } from '@/lib/price-override'
import type { PriceRuleRow } from '@/lib/price-resolver'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { useToast } from '@/hooks/use-toast'
import {
  FIXED_PERCENTAGE_SURCHARGE_RATE,
  formatFixedPercentageLabel,
  isOverridableCatalogPrice,
} from '@/lib/price-catalog-policy'

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

interface CustomerPricingPanelProps {
  customerId: string
  customerGroupId: string | null
  pets: Array<{ id: string; name: string }>
  defaultExpanded?: boolean
  embedded?: boolean
}

export function CustomerPricingPanel({
  customerId,
  customerGroupId,
  pets,
  defaultExpanded = false,
  embedded = false,
}: CustomerPricingPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [catalogPrices, setCatalogPrices] = useState<CatalogPrice[]>([])
  const [categories, setCategories] = useState<PriceCategory[]>([])
  const [groupPriceOverrides, setGroupPriceOverrides] = useState<Record<string, PriceOverrideRow>>({})
  const [customerPriceForms, setCustomerPriceForms] = useState<Record<string, PriceOverrideFormState>>({})
  const [petPriceForms, setPetPriceForms] = useState<Record<string, Record<string, PriceRuleFormState>>>({})
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [savingPetId, setSavingPetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('customer')
  const [loadError, setLoadError] = useState<string | null>(null)

  const editablePrices = catalogPrices.filter((price) => isOverridableCatalogPrice(price))
  const hasFixedPercentageSurcharge = catalogPrices.some((price) => price.price_type === 'percentage')

  const petIdsKey = pets
    .map((pet) => pet.id)
    .sort()
    .join(',')

  useEffect(() => {
    void loadAll()
  }, [customerId, petIdsKey])

  useEffect(() => {
    void loadGroupOverrides(customerGroupId)
  }, [customerGroupId])

  async function loadGroupOverrides(groupId: string | null) {
    if (!groupId) {
      setGroupPriceOverrides({})
      return
    }
    try {
      const response = await authenticatedFetch(`/api/admin/group-prices?group_id=${groupId}`)
      const data = await response.json()
      const groupMap: Record<string, PriceOverrideRow> = {}
      if (data.overrides) {
        data.overrides.forEach((entry: PriceOverrideRow) => {
          groupMap[entry.price_id] = entry
        })
      }
      setGroupPriceOverrides(groupMap)
    } catch (error) {
      console.error('Error loading group price overrides:', error)
    }
  }

  async function loadAll() {
    setLoading(true)
    setLoadError(null)
    try {
      const [catalogRes, customerRulesRes, ...petRulesResponses] = await Promise.all([
        authenticatedFetch('/api/admin/prices'),
        authenticatedFetch(`/api/admin/price-rules?scope_type=customer&scope_id=${customerId}`),
        ...pets.map((pet) =>
          authenticatedFetch(`/api/admin/price-rules?scope_type=pet&scope_id=${pet.id}`)
        ),
      ])

      const catalogData = await catalogRes.json()
      if (!catalogRes.ok) {
        setLoadError(catalogData.error || 'Preiskatalog konnte nicht geladen werden')
        setCatalogPrices([])
        setCategories([])
        setCustomerPriceForms({})
        setPetPriceForms({})
        return
      }

      const prices = (catalogData.prices || []) as CatalogPrice[]
      setCatalogPrices(prices)
      setCategories(catalogData.categories || [])

      const customerRulesData = await customerRulesRes.json()
      const customerForms: Record<string, PriceOverrideFormState> = {}
      for (const rule of (customerRulesData.rules || []) as PriceRuleRow[]) {
        if (rule.rule_mode === 'custom') {
          customerForms[rule.price_id] = overrideRowToForm(rule)
        }
      }
      setCustomerPriceForms(customerForms)

      const nextPetForms: Record<string, Record<string, PriceRuleFormState>> = {}
      for (let index = 0; index < pets.length; index++) {
        const pet = pets[index]
        const petRulesData = await petRulesResponses[index].json()
        const formsMap: Record<string, PriceRuleFormState> = {}
        for (const price of prices.filter((entry) => isOverridableCatalogPrice(entry))) {
          const rule = (petRulesData.rules || []).find(
            (entry: PriceRuleRow) => entry.price_id === price.id
          )
          formsMap[price.id] = rule
            ? ruleRowToForm(rule)
            : { ...emptyPriceRuleForm(), rule_mode: 'inherit' }
        }
        nextPetForms[pet.id] = formsMap
      }
      setPetPriceForms(nextPetForms)
    } catch (error) {
      console.error('Error loading customer pricing:', error)
      setLoadError('Preise konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveCustomer() {
    setSavingCustomer(true)
    try {
      const rules = Object.entries(customerPriceForms)
        .map(([price_id, form]) =>
          formToOverrideRow(price_id, { ...form, rule_mode: form.rule_mode || 'custom' })
        )
        .filter(Boolean)

      const response = await authenticatedFetch('/api/admin/price-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope_type: 'customer',
          scope_id: customerId,
          rules,
        }),
      })

      if (response.ok) {
        toast({ title: 'Erfolg', description: 'Kundenpreise gespeichert' })
      } else {
        const error = await response.json()
        toast({
          title: 'Fehler',
          description: error.error || 'Speichern fehlgeschlagen',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving customer prices:', error)
    } finally {
      setSavingCustomer(false)
    }
  }

  async function handleSavePet(petId: string, petName: string) {
    setSavingPetId(petId)
    try {
      const forms = petPriceForms[petId] ?? {}
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
        toast({ title: 'Erfolg', description: `Preise für ${petName} gespeichert` })
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
      setSavingPetId(null)
    }
  }

  function updateCustomerForm(priceId: string, next: PriceOverrideFormState) {
    setCustomerPriceForms((prev) => {
      const isEmpty =
        next.price === '' && next.discount_type === '' && next.discount_value === ''
      if (isEmpty) {
        const updated = { ...prev }
        delete updated[priceId]
        return updated
      }
      return { ...prev, [priceId]: next }
    })
  }

  function updatePetForm(petId: string, priceId: string, next: PriceRuleFormState) {
    setPetPriceForms((prev) => ({
      ...prev,
      [petId]: {
        ...(prev[petId] ?? {}),
        [priceId]: next,
      },
    }))
  }

  async function copyPetPricesFrom(sourcePetId: string, targetPetId: string) {
    try {
      const response = await authenticatedFetch(
        `/api/admin/price-rules?scope_type=pet&scope_id=${sourcePetId}`
      )
      const data = await response.json()
      const sourceRules = (data.rules || []) as PriceRuleRow[]
      const nextForms: Record<string, PriceRuleFormState> = {}

      for (const price of editablePrices) {
        const rule = sourceRules.find((entry) => entry.price_id === price.id)
        nextForms[price.id] = rule
          ? ruleRowToForm(rule)
          : { ...emptyPriceRuleForm(), rule_mode: 'inherit' }
      }

      setPetPriceForms((prev) => ({ ...prev, [targetPetId]: nextForms }))
      toast({
        title: 'Übernommen',
        description: 'Einstellungen kopiert – bitte speichern.',
      })
    } catch (error) {
      console.error('Error copying pet prices:', error)
    }
  }

  return (
    <AdminSection embedded={embedded} defaultExpanded={defaultExpanded} title={embedded ? undefined : 'Preise'}>
      {loading ? (
        <p className="text-sm text-sage-500">Preise werden geladen…</p>
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : editablePrices.length === 0 ? (
        <p className="text-sm text-sage-500">Keine Preise im Katalog vorhanden.</p>
      ) : (
        <>
          <p className="text-sm text-sage-600 mb-4">
            Kundenpreise gelten für alle Tiere, sofern kein Tier eine eigene Regel hat. Pro Tier kannst
            du geerbt, eigenen Preis oder „Trifft nicht zu“ wählen.
          </p>

          {hasFixedPercentageSurcharge && (
            <p className="text-sm text-sage-600 mb-4 rounded-lg border border-sage-200 bg-sage-50/60 px-3 py-2">
              Sonn- und Feiertagszuschlag: {formatFixedPercentageLabel(FIXED_PERCENTAGE_SURCHARGE_RATE)}{' '}
              (fest im Katalog, gilt für Hundepension und Katzenbetreuung – nicht individuell anpassbar).
            </p>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-sage-100/60 p-1 rounded-lg border border-sage-200 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="customer" className="rounded-md px-3 py-1.5 text-sm">
                Kunde
              </TabsTrigger>
              {pets.map((pet) => (
                <TabsTrigger key={pet.id} value={pet.id} className="rounded-md px-3 py-1.5 text-sm">
                  {pet.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="customer" className="mt-4 space-y-4">
              <div className="space-y-3">
                {editablePrices.map((price) => (
                  <PriceOverrideEditorRow
                    key={price.id}
                    catalogPrice={price}
                    categoryName={
                      categories.find((category) => category.id === price.category_id)?.name ||
                      'Allgemein'
                    }
                    form={customerPriceForms[price.id] ?? emptyPriceOverrideForm()}
                    onChange={(next) => updateCustomerForm(price.id, next)}
                    groupOverride={groupPriceOverrides[price.id] ?? null}
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveCustomer}
                  disabled={savingCustomer}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  {savingCustomer ? 'Wird gespeichert…' : 'Kundenpreise speichern'}
                </Button>
              </div>
            </TabsContent>

            {pets.map((pet) => {
              const otherPets = pets.filter((entry) => entry.id !== pet.id)
              return (
                <TabsContent key={pet.id} value={pet.id} className="mt-4 space-y-4">
                  {otherPets.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {otherPets.map((other) => (
                        <Button
                          key={other.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyPetPricesFrom(other.id, pet.id)}
                        >
                          Von {other.name} kopieren
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    {editablePrices.map((price) => (
                      <PetPriceRuleEditorRow
                        key={price.id}
                        catalogPrice={price}
                        categoryName={
                          categories.find((category) => category.id === price.category_id)?.name
                        }
                        form={
                          petPriceForms[pet.id]?.[price.id] ?? {
                            ...emptyPriceRuleForm(),
                            rule_mode: 'inherit',
                          }
                        }
                        onChange={(next) => updatePetForm(pet.id, price.id, next)}
                      />
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSavePet(pet.id, pet.name)}
                      disabled={savingPetId === pet.id}
                      className="bg-sage-600 hover:bg-sage-700"
                    >
                      {savingPetId === pet.id ? 'Wird gespeichert…' : `${pet.name} speichern`}
                    </Button>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </>
      )}
    </AdminSection>
  )
}
