import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params

    const { data, error } = await auth.client
      .from('pet_care_plan_changes')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', id)
      .is('seen_at', null)
      .select('id, seen_at')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ change: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error marking care plan change as seen:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
