import { NextRequest, NextResponse } from 'next/server'
import { getAdminDbClient } from '@/lib/admin-auth'
import { executeVaccinationReminders } from '@/lib/pet-vaccination-reminders'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  try {
    const adminClient = getAdminDbClient()
    const result = await executeVaccinationReminders(adminClient)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
