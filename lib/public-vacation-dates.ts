import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { VacationDate } from '@/lib/vacation-dates'

export function getPublicSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function loadPublicVacationDates(
  client: SupabaseClient = getPublicSupabaseClient()
): Promise<VacationDate[]> {
  const { data: settings, error: settingsError } = await client
    .from('newsbar_settings')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  if (settingsError) {
    throw settingsError
  }

  if (!settings?.id) {
    return []
  }

  const { data, error } = await client
    .from('newsbar_vacation_dates')
    .select('*')
    .eq('settings_id', settings.id)
    .order('sort_order', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as VacationDate[]
}
