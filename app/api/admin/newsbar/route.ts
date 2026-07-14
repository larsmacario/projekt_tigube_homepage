import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Hole alle Einstellungen
    const { data: settings, error: settingsError } = await supabase
      .from('newsbar_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return NextResponse.json({ settings: null, vacationDates: [] })
    }

    // Hole Ferienzeiten
    const { data: vacationDates } = await supabase
      .from('newsbar_vacation_dates')
      .select('*')
      .eq('settings_id', settings.id)
      .order('sort_order', { ascending: true })

    return NextResponse.json({
      settings,
      vacationDates: vacationDates || [],
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { settings, vacationDates } = await request.json()

    // Update Einstellungen
    const { data: updatedSettings, error: settingsError } = await supabase
      .from('newsbar_settings')
      .update({
        title: settings.title,
        subtitle: settings.subtitle,
        dialog_title: settings.dialog_title,
        dialog_description: settings.dialog_description,
        hint_text: settings.hint_text,
        is_active: settings.is_active,
      })
      .eq('id', settings.id)
      .select()
      .single()

    if (settingsError) {
      throw settingsError
    }

    // Lösche alte Ferienzeiten
    await supabase
      .from('newsbar_vacation_dates')
      .delete()
      .eq('settings_id', settings.id)

    // Füge neue Ferienzeiten ein
    if (vacationDates && vacationDates.length > 0) {
      const { error: datesError } = await supabase
        .from('newsbar_vacation_dates')
        .insert(
          vacationDates.map((date: any, index: number) => ({
            settings_id: settings.id,
            period: date.period,
            label: date.label,
            sort_order: index,
          }))
        )

      if (datesError) {
        throw datesError
      }
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error: any) {
    console.error('Error updating newsbar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

