import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { resolveCatalogPrice } from '@/lib/price-resolver'
import {
  loadActivePriceCatalog,
  loadPriceRulesForScope,
} from '@/lib/price-catalog-loader'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const priceId = body.price_id as string | undefined
    const customerGroupId = (body.customer_group_id as string | null | undefined) ?? null
    const customerId = (body.customer_id as string | null | undefined) ?? null
    const petId = (body.pet_id as string | null | undefined) ?? null

    if (!priceId) {
      return NextResponse.json({ error: 'price_id ist erforderlich' }, { status: 400 })
    }

    const catalog = await loadActivePriceCatalog(auth.client)
    const price = catalog.prices.find((item) => item.id === priceId)
    if (!price) {
      return NextResponse.json({ error: 'Preis nicht gefunden' }, { status: 404 })
    }

    const [groupRules, customerRules, petRules] = await Promise.all([
      customerGroupId
        ? loadPriceRulesForScope(auth.client, 'group', customerGroupId)
        : Promise.resolve([]),
      customerId
        ? loadPriceRulesForScope(auth.client, 'customer', customerId)
        : Promise.resolve([]),
      petId ? loadPriceRulesForScope(auth.client, 'pet', petId) : Promise.resolve([]),
    ])

    const groupRule = groupRules.find((rule) => rule.price_id === priceId) ?? null
    const customerRule = customerRules.find((rule) => rule.price_id === priceId) ?? null
    const petRule = petRules.find((rule) => rule.price_id === priceId) ?? null

    const resolved = resolveCatalogPrice(price, {
      groupRule,
      customerRule,
      petRule,
    })

    return NextResponse.json({ resolved })
  } catch (error: unknown) {
    console.error('Error previewing price:', error)
    const message = error instanceof Error ? error.message : 'Fehler bei der Preisvorschau'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
