import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { resolvePriceOverride } from '@/lib/price-override'

// Öffentlicher Zugriff für Kundenportal
export async function GET(request: NextRequest) {
  try {
    const { client: supabase } = await getServerClient(request)

    // Lade Standard-Preise und Kategorien parallel
    const [pricesRes, categoriesRes] = await Promise.all([
      supabase
        .from('prices')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('price_categories')
        .select('*')
        .order('sort_order', { ascending: true })
    ])

    if (pricesRes.error) {
      throw pricesRes.error
    }
    if (categoriesRes.error) {
      throw categoriesRes.error
    }

    const defaultPrices = pricesRes.data || []
    const categories = categoriesRes.data || []

    const customerOverrideMap = new Map<string, any>()
    const groupOverrideMap = new Map<string, any>()

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, customer_group_id')
        .eq('user_id', user.id)
        .eq('contact_type', 'customer')
        .maybeSingle()

      if (contact) {
        const [customerPricesRes, groupPricesRes] = await Promise.all([
          supabase
            .from('customer_prices')
            .select('price_id, price, discount_type, discount_value')
            .eq('customer_id', contact.id),
          contact.customer_group_id
            ? supabase
                .from('group_prices')
                .select('price_id, price, discount_type, discount_value')
                .eq('group_id', contact.customer_group_id)
            : { data: [] }
        ])

        if (customerPricesRes.data) {
          customerPricesRes.data.forEach((o: any) => customerOverrideMap.set(o.price_id, o))
        }

        if (groupPricesRes.data) {
          groupPricesRes.data.forEach((o: any) => groupOverrideMap.set(o.price_id, o))
        }
      }
    }

    const prices = (defaultPrices || []).map((p: any) => {
      const resolved = resolvePriceOverride(
        p,
        groupOverrideMap.get(p.id),
        customerOverrideMap.get(p.id)
      )

      return {
        ...p,
        catalog_price: p.price,
        price: resolved.final_price ?? p.price,
        base_price: resolved.base_price,
        base_source: resolved.base_source,
        special_price: resolved.special_price,
        special_price_source: resolved.special_price_source,
        discount_type: resolved.discount_type,
        discount_value: resolved.discount_value,
        discount_source: resolved.discount_source,
        discount_amount: resolved.discount_amount,
        final_price: resolved.final_price,
        is_override: resolved.is_override,
        override_type: resolved.override_type,
      }
    })

    return NextResponse.json({ prices, categories })
  } catch (error: any) {
    console.error('Error fetching prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Preise' },
      { status: 500 }
    )
  }
}
