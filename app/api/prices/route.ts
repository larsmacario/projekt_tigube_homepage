import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

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

    let prices = (defaultPrices || []).map((p: any) => ({
      ...p,
      is_override: false,
      override_type: null as 'individual' | 'group' | null,
    }))

    // Prüfe ob ein User eingeloggt ist (für Kundenportal)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Suche den zugehörigen Kunden-Kontakt
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, customer_group_id')
        .eq('user_id', user.id)
        .eq('contact_type', 'customer')
        .maybeSingle()

      if (contact) {
        // Lade Individualpreise und Gruppenpreise parallel
        const [customerPricesRes, groupPricesRes] = await Promise.all([
          supabase
            .from('customer_prices')
            .select('price_id, price')
            .eq('customer_id', contact.id),
          contact.customer_group_id
            ? supabase
                .from('group_prices')
                .select('price_id, price')
                .eq('group_id', contact.customer_group_id)
            : { data: [] }
        ])

        const customerOverrides = new Map<string, number>()
        if (customerPricesRes.data) {
          customerPricesRes.data.forEach((o: any) => customerOverrides.set(o.price_id, o.price))
        }

        const groupOverrides = new Map<string, number>()
        if (groupPricesRes.data) {
          groupPricesRes.data.forEach((o: any) => groupOverrides.set(o.price_id, o.price))
        }

        // Mische die Preise
        prices = prices.map((p: any) => {
          if (customerOverrides.has(p.id)) {
            return {
              ...p,
              price: customerOverrides.get(p.id)!,
              is_override: true,
              override_type: 'individual',
            }
          } else if (groupOverrides.has(p.id)) {
            return {
              ...p,
              price: groupOverrides.get(p.id)!,
              is_override: true,
              override_type: 'group',
            }
          }
          return p
        })
      }
    }

    return NextResponse.json({ prices, categories })
  } catch (error: any) {
    console.error('Error fetching prices:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Preise' },
      { status: 500 }
    )
  }
}

