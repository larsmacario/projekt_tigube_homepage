import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { loadResolvedPriceCatalog } from '@/lib/price-catalog-loader'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase } = await getServerClient(request)
    const { searchParams } = new URL(request.url)
    const petId = searchParams.get('pet_id')

    const { data: { user } } = await supabase.auth.getUser()

    let customerId: string | null = null
    let customerGroupId: string | null = null

    if (user) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, customer_group_id')
        .eq('user_id', user.id)
        .eq('contact_type', 'customer')
        .maybeSingle()

      if (contact) {
        customerId = contact.id
        customerGroupId = contact.customer_group_id

        if (petId) {
          const { data: pet } = await supabase
            .from('pets')
            .select('id')
            .eq('id', petId)
            .eq('customer_id', contact.id)
            .maybeSingle()

          if (!pet) {
            return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
          }
        }
      }
    }

    const catalog = await loadResolvedPriceCatalog(supabase, {
      customerId,
      customerGroupId,
      petId: petId ?? null,
    })

    const prices = catalog.prices.map((price) => ({
      ...price,
      catalog_price: price.price,
      price: price.final_price ?? price.price,
    }))

    return NextResponse.json({
      prices,
      categories: catalog.categories,
      serviceAreas: catalog.serviceAreas,
    })
  } catch (error: unknown) {
    console.error('Error fetching prices:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Preise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
