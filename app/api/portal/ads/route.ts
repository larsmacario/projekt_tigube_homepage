import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  filterActiveAds,
  filterActiveFormats,
  type AdRotationSettings,
  type PortalAd,
  type AdFormat,
} from '@/lib/portal-ads'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    const activeAds = filterActiveAds((ads || []) as PortalAd[])
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
