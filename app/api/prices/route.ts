import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`
  
  const authCookie = request.cookies.get(cookieName)?.value
  let accessToken: string | undefined

  if (authCookie) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      accessToken = sessionData.access_token
    } catch (e) {
      accessToken = authCookie
    }
  }

  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    accessToken = authHeader?.replace('Bearer ', '')
  }

  if (!accessToken) {
    accessToken = request.cookies.get('sb-access-token')?.value
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { client, accessToken }
}

// Öffentlicher Zugriff für Kundenportal
export async function GET(request: NextRequest) {
  try {
    const { client: supabase } = getServerClient(request)

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

