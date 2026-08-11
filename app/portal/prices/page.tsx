'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { formatDiscountLabel, formatEuro } from '@/lib/price-override'
import {
  FIXED_PERCENTAGE_SURCHARGE_RATE,
  formatFixedPercentageLabel,
} from '@/lib/price-catalog-policy'
import type { Pet } from '@/lib/types'

interface Price {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  catalog_price?: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  unit: string | null
  note: string | null
  sort_order: number
  usage?: string
  applicable?: boolean
  rule_mode?: 'inherit' | 'custom' | 'not_applicable' | null
  base_price?: number | null
  discount_type?: 'fixed' | 'percentage' | null
  discount_value?: number | null
  discount_amount?: number | null
  final_price?: number | null
  is_override?: boolean
  override_type?: 'individual' | 'group' | 'pet' | null
}

interface PriceCategory {
  id: string
  name: string
  description: string | null
  service_type: 'hundepension' | 'katzenbetreuung' | 'all'
  sort_order: number
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([])
  const [categories, setCategories] = useState<PriceCategory[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPetId, setSelectedPetId] = useState<string>('customer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadPets()
  }, [])

  useEffect(() => {
    void loadPrices(selectedPetId)
  }, [selectedPetId])

  async function loadPets() {
    try {
      const response = await authenticatedFetch('/api/portal/pets')
      const data = await response.json()
      setPets(data.pets || [])
    } catch (error) {
      console.error('Error loading pets:', error)
    }
  }

  async function loadPrices(petId: string) {
    setLoading(true)
    try {
      const url =
        petId === 'customer'
          ? '/api/prices'
          : `/api/prices?pet_id=${encodeURIComponent(petId)}`
      const response = await authenticatedFetch(url)
      const data = await response.json()
      setPrices(data.prices || [])
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error loading prices:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatCatalogPrice(price: Price): string {
    if (price.price_type === 'text') {
      return price.description || ''
    }

    const catalogAmount = price.catalog_price ?? price.price
    if (catalogAmount === null) return ''

    if (price.price_type === 'percentage') {
      return formatFixedPercentageLabel(FIXED_PERCENTAGE_SURCHARGE_RATE)
    }

    if (price.price_type === 'per_unit') {
      return `${formatEuro(catalogAmount)}${price.unit ? ` ${price.unit}` : ''}`
    }

    return `${formatEuro(catalogAmount)}${price.unit ? ` ${price.unit}` : ''}`
  }

  function renderPriceColumn(price: Price) {
    if (price.rule_mode === 'not_applicable' || price.applicable === false) {
      return (
        <p className="text-sm text-sage-500 italic">Trifft für dieses Tier nicht zu</p>
      )
    }

    if (price.price_type === 'text') {
      return <p className="text-sm text-sage-700 whitespace-pre-wrap">{price.description}</p>
    }

    if (price.price_type === 'percentage') {
      return <p className="text-lg font-bold text-sage-900">{formatCatalogPrice(price)}</p>
    }

    if (price.is_override && price.base_price != null) {
      return (
        <div className="flex flex-col items-start sm:items-end gap-0.5 text-right">
          <p className="text-sm text-sage-600">
            Basis: {formatEuro(price.base_price)}
            {price.unit ? ` ${price.unit}` : ''}
          </p>
          {price.discount_type && price.discount_value != null && price.discount_amount != null && (
            <p className="text-sm text-green-800">
              Rabatt: {formatDiscountLabel(price.discount_type, price.discount_value)} (
              {formatEuro(price.discount_amount)})
            </p>
          )}
          <p className="text-lg font-bold text-sage-900">
            {formatEuro(price.final_price ?? price.price ?? price.base_price)}
            {price.unit ? ` ${price.unit}` : ''}
          </p>
          <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full mt-1">
            Dein Sonderpreis
          </span>
        </div>
      )
    }

    return <p className="text-lg font-bold text-sage-900">{formatCatalogPrice(price)}</p>
  }

  const renderCategoryCard = (category: PriceCategory) => {
    const categoryPrices = prices.filter((price) => price.category_id === category.id)
    if (categoryPrices.length === 0) return null

    const isWarningCat =
      category.name.toLowerCase().includes('hinweis') ||
      category.name.toLowerCase().includes('achtung')

    if (isWarningCat) {
      return (
        <Card key={category.id} className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 text-lg font-semibold">{category.name}</CardTitle>
            {category.description && (
              <CardDescription className="text-amber-700/80 text-xs">
                {category.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryPrices.map((price) => (
              <p key={price.id} className="text-sm text-amber-900">
                {price.price_type === 'text' ? (
                  price.description
                ) : (
                  <span>
                    <strong>{price.name}:</strong> {formatCatalogPrice(price)}{' '}
                    {price.note && <span className="text-xs">({price.note})</span>}
                  </span>
                )}
              </p>
            ))}
          </CardContent>
        </Card>
      )
    }

    return (
      <Card key={category.id} className="border-sage-200">
        <CardHeader>
          <CardTitle className="text-sage-900 text-lg font-bold">{category.name}</CardTitle>
          {category.description && (
            <CardDescription className="text-sage-600 text-sm">{category.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryPrices.map((price) => (
            <div
              key={price.id}
              className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-sage-100 pb-3 last:border-0 last:pb-0 gap-2"
            >
              <div className="flex-1">
                <p className="font-semibold text-sage-900">{price.name}</p>
                {price.price_type !== 'text' && price.description && (
                  <p className="text-xs text-sage-600 mt-0.5">{price.description}</p>
                )}
                {price.note && (
                  <p className="text-xs text-sage-500 italic mt-0.5">{price.note}</p>
                )}
                {price.usage === 'extra' && (
                  <p className="text-xs text-sage-500 mt-0.5">
                    Zusatzleistung – im Buchungswizard wählbar, sofern für dein Tier hinterlegt.
                  </p>
                )}
              </div>
              <div className="flex flex-col items-start sm:items-end min-w-[120px]">
                {renderPriceColumn(price)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const dogCategories = categories.filter(
    (category) => category.service_type === 'hundepension' || category.service_type === 'all'
  )
  const catCategories = categories.filter(
    (category) => category.service_type === 'katzenbetreuung' || category.service_type === 'all'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900 font-sans tracking-tight">
          Unsere Preise & Leistungen
        </h1>
        <p className="mt-2 text-sage-600">
          Transparente Preisgestaltung – wähle ein Tier für die persönliche Preisliste.
        </p>
      </div>

      {pets.length > 0 && (
        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium text-sage-800">Preisliste anzeigen für</label>
          <Select value={selectedPetId} onValueChange={setSelectedPetId}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Alle (Kundenpreise)</SelectItem>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>
                  {pet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[240px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-600" />
        </div>
      ) : (
        <Tabs defaultValue="hundepension" className="w-full">
          <TabsList className="bg-sage-100/60 p-1 rounded-lg border border-sage-200 flex flex-wrap h-auto gap-1 w-full">
            <TabsTrigger value="hundepension" className="flex-1 min-w-[8rem]">Hundepension</TabsTrigger>
            <TabsTrigger value="katzenbetreuung" className="flex-1 min-w-[8rem]">Katzenbetreuung</TabsTrigger>
          </TabsList>

          <TabsContent value="hundepension" className="space-y-6 mt-6">
            {dogCategories.length === 0 ? (
              <p className="text-sm text-sage-600 italic">Keine Preise für die Hundepension.</p>
            ) : (
              dogCategories.map(renderCategoryCard)
            )}
          </TabsContent>

          <TabsContent value="katzenbetreuung" className="space-y-6 mt-6">
            {catCategories.length === 0 ? (
              <p className="text-sm text-sage-600 italic">Keine Preise für die Katzenbetreuung.</p>
            ) : (
              catCategories.map(renderCategoryCard)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
