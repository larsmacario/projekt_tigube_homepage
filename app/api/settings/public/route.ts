import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPublicWaitlistConfig } from '@/lib/waitlist-settings'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const config = await getPublicWaitlistConfig(supabase)

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching public settings:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Einstellungen' },
      { status: 500 }
    )
  }
}
