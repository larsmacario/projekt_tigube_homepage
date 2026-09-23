import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { getPortalCustomer } from '@/lib/portal-customer'
import {
  filterActiveAds,
  filterActiveFormats,
  filterAdsForCustomerAudience,
  getCustomerPetAudienceFlags,
  type AdRotationSettings,
  type PortalAd,
  type AdFormat,
} from '@/lib/portal-ads'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert - Keine Session gefunden' }, { status: 401 })
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const customerResult = await getPortalCustomer(supabase, authUser.id)
    let audienceFlags = { hasDog: false, hasCat: false }

    if (!('error' in customerResult)) {
      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select('tierart, deceased_at')
        .eq('customer_id', customerResult.customer.id)

      if (petsError) throw petsError
      audienceFlags = getCustomerPetAudienceFlags(pets || [])
    }

    const [{ data: formats, error: formatsError }, { data: ads, error: adsError }, { data: settingsRows, error: settingsError }] =
      await Promise.all([
        supabase
          .from('ad_formats')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('portal_ads')
          .select('*, ad_formats(*)')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.from('ad_rotation_settings').select('*').limit(1),
      ])

    if (formatsError) throw formatsError
    if (adsError) throw adsError
    if (settingsError) throw settingsError

    const activeFormats = filterActiveFormats((formats || []) as AdFormat[])
    const activeAds = filterAdsForCustomerAudience(
      filterActiveAds((ads || []) as PortalAd[]),
      audienceFlags
    )
    const settings = ((settingsRows || [])[0] as AdRotationSettings | undefined) ?? null

    return NextResponse.json({
      formats: activeFormats,
      ads: activeAds,
      settings,
    })
  } catch (error: unknown) {
    console.error('Error fetching portal ads:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Werbeanzeigen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
