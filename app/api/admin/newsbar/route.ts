import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  formatVacationPeriod,
  parseIsoDate,
  resolveVacationBounds,
  toIsoDate,
  type VacationDate,
} from '@/lib/vacation-dates'

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

    const normalizedVacationDates = (vacationDates || []).map(
      (date: VacationDate) => normalizeVacationDate(date)
    )

    for (const date of normalizedVacationDates) {
      if (!date.start_date || !date.end_date) {
        return NextResponse.json(
          { error: 'Bitte geben Sie für jede Ferienzeit Start- und Enddatum an.' },
          { status: 400 }
        )
      }

      const start = parseIsoDate(date.start_date)
      const end = parseIsoDate(date.end_date)
      if (!start || !end) {
        return NextResponse.json(
          { error: 'Ungültiges Datumsformat bei Ferienzeiten.' },
          { status: 400 }
        )
      }

      if (end < start) {
        return NextResponse.json(
          { error: 'Das Enddatum muss nach dem Startdatum liegen.' },
          { status: 400 }
        )
      }
    }

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
    if (normalizedVacationDates.length > 0) {
      const { error: datesError } = await supabase
        .from('newsbar_vacation_dates')
        .insert(
          normalizedVacationDates.map((date: VacationDate, index: number) => ({
            settings_id: settings.id,
            period: date.period,
            label: date.label,
            start_date: date.start_date,
            end_date: date.end_date,
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

function normalizeVacationDate(date: VacationDate): VacationDate {
  if (date.start_date && date.end_date) {
    const start = parseIsoDate(date.start_date)
    const end = parseIsoDate(date.end_date)
    if (start && end) {
      return {
        ...date,
        start_date: toIsoDate(start),
        end_date: toIsoDate(end),
        period: date.period?.trim() || formatVacationPeriod(start, end),
      }
    }
  }

  const bounds = resolveVacationBounds(date)
  if (bounds) {
    return {
      ...date,
      start_date: toIsoDate(bounds.start),
      end_date: toIsoDate(bounds.end),
      period: date.period?.trim() || formatVacationPeriod(bounds.start, bounds.end),
    }
  }

  return date
}

