'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

interface Price {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  unit: string | null
  note: string | null
  sort_order: number
  is_override?: boolean
  override_type?: 'individual' | 'group' | null
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrices()
  }, [])

  async function loadPrices() {
    try {
      const response = await authenticatedFetch('/api/prices')
      const data = await response.json()
      setPrices(data.prices || [])
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error loading prices:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatPrice(price: Price): string {
    if (price.price_type === 'text') {
      return price.description || ''
    }
    
    if (price.price === null) return ''
    
    if (price.price_type === 'percentage') {
      return `+${price.price}%${price.unit ? ` ${price.unit}` : ''}`
    }
    
    if (price.price_type === 'per_unit') {
      return `${price.price.toFixed(2).replace('.', ',')}€${price.unit ? ` ${price.unit}` : ''}`
    }
    
    return `${price.price.toFixed(2).replace('.', ',')}€${price.unit ? ` ${price.unit}` : ''}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const renderCategoryCard = (category: PriceCategory) => {
    const categoryPrices = prices.filter(p => p.category_id === category.id)
    if (categoryPrices.length === 0) return null

    // Special styling for warnings/notes categories
    const isWarningCat = category.name.toLowerCase().includes('hinweis') || category.name.toLowerCase().includes('achtung')

    if (isWarningCat) {
      return (
        <Card key={category.id} className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 text-lg font-semibold">{category.name}</CardTitle>
            {category.description && (
              <CardDescription className="text-amber-700/80 text-xs">{category.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryPrices.map((price) => (
              <p key={price.id} className="text-sm text-amber-900">
                {price.price_type === 'text' ? (
                  price.description
                ) : (
                  <span>
                    <strong>{price.name}:</strong> {formatPrice(price)} {price.note && <span className="text-xs">({price.note})</span>}
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
            <div key={price.id} className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-sage-100 pb-3 last:border-0 last:pb-0 gap-2">
              <div className="flex-1">
                <p className="font-semibold text-sage-900">{price.name}</p>
                {price.price_type !== 'text' && price.description && (
                  <p className="text-xs text-sage-600 mt-0.5">{price.description}</p>
                )}
                {price.note && (
                  <p className="text-xs text-sage-500 italic mt-0.5">{price.note}</p>
                )}
              </div>
              
              <div className="flex flex-col items-start sm:items-end min-w-[120px]">
                {price.price_type === 'text' ? (
                  <p className="text-sm text-sage-700 whitespace-pre-wrap">{price.description}</p>
                ) : (
                  <p className="text-lg font-bold text-sage-900">{formatPrice(price)}</p>
                )}
                {price.is_override && (
                  <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full mt-1">
                    Dein Sonderpreis
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Filter categories by service type
  const dogCategories = categories.filter(c => c.service_type === 'hundepension' || c.service_type === 'all')
  const catCategories = categories.filter(c => c.service_type === 'katzenbetreuung' || c.service_type === 'all')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-sage-900 font-sans tracking-tight">Unsere Preise & Leistungen</h1>
        <p className="mt-2 text-sage-600">Transparente Preisgestaltung für all unsere Betreuungsangebote.</p>
      </div>

      <Tabs defaultValue="hundepension" className="w-full">
        <TabsList className="bg-sage-100/60 p-1 rounded-lg border border-sage-200">
          <TabsTrigger value="hundepension" className="rounded-md px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-sage-900 data-[state=active]:shadow-sm">
            Hundepension
          </TabsTrigger>
          <TabsTrigger value="katzenbetreuung" className="rounded-md px-6 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-sage-900 data-[state=active]:shadow-sm">
            Katzenbetreuung
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hundepension" className="space-y-6 mt-6">
          {dogCategories.length === 0 ? (
            <p className="text-sm text-sage-600 italic">Keine Preise für die Hundepension eingetragen.</p>
          ) : (
            dogCategories.map(renderCategoryCard)
          )}
        </TabsContent>

        <TabsContent value="katzenbetreuung" className="space-y-6 mt-6">
          {catCategories.length === 0 ? (
            <p className="text-sm text-sage-600 italic">Keine Preise für die Katzenbetreuung eingetragen.</p>
          ) : (
            catCategories.map(renderCategoryCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
