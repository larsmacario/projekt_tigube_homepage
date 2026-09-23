import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getGoogleCalendarSettings, testGoogleCalendarFreeBusy } from '@/lib/google-calendar'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const result = await testGoogleCalendarFreeBusy(14)
    const settings = await getGoogleCalendarSettings()
    return NextResponse.json({ ...result, settings })
  } catch (error) {
    console.error('Google Calendar test failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Verbindungstest konnte nicht ausgeführt werden',
      },
      { status: 502 }
    )
  }
}
