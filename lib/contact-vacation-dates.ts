import { createClient } from '@supabase/supabase-js'
import type { VacationDate } from '@/lib/vacation-dates'

export async function fetchVacationDatesForContact(): Promise<VacationDate[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: settings } = await supabase
    .from('newsbar_settings')
    .select('id')
    .eq('is_active', true)
    .single()

  if (!settings) {
    return []
  }

  const { data: vacationDates, error } = await supabase
    .from('newsbar_vacation_dates')
    .select('*')
    .eq('settings_id', settings.id)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching vacation dates for contact:', error)
    return []
  }

  return vacationDates ?? []
}
