import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { petId } = await params
    const now = new Date().toISOString()

    const { data, error } = await auth.client
      .from('pet_care_plan_changes')
      .update({ seen_at: now })
      .eq('pet_id', petId)
      .is('seen_at', null)
      .select('id')

    if (error) throw error

    return NextResponse.json({
      marked_count: data?.length ?? 0,
      seen_at: now,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error marking care plan changes as seen:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
