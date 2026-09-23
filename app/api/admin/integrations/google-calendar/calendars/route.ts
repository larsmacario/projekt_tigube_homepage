import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listGoogleCalendars } from '@/lib/google-calendar'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const calendars = await listGoogleCalendars()
    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('Google Calendar list failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Kalenderliste konnte nicht geladen werden',
      },
      { status: 502 }
    )
  }
}
