import { NextRequest, NextResponse } from 'next/server'
import { canArchiveVersion } from '@/lib/care-plan-versions'
import {
  CARE_PLAN_CHANGE_SELECT,
  mapCarePlanChangeRow,
} from '@/lib/care-plan-change-mapper'
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

    const { data: targetRow, error: targetError } = await auth.client
      .from('pet_care_plan_changes')
      .select(CARE_PLAN_CHANGE_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (targetError) throw targetError
    if (!targetRow) {
      return NextResponse.json({ error: 'Version nicht gefunden' }, { status: 404 })
    }

    const target = mapCarePlanChangeRow(targetRow)

    const { data: petRows, error: petError } = await auth.client
      .from('pet_care_plan_changes')
      .select(CARE_PLAN_CHANGE_SELECT)
      .eq('pet_id', target.pet_id)
      .order('changed_at', { ascending: false })

    if (petError) throw petError

    const petChanges = (petRows || []).map((row) => mapCarePlanChangeRow(row))

    if (!canArchiveVersion(target, petChanges)) {
      return NextResponse.json(
        { error: 'Die aktuelle Version kann nicht archiviert werden.' },
        { status: 400 }
      )
    }

    const archivedAt = new Date().toISOString()
    const { data, error } = await auth.client
      .from('pet_care_plan_changes')
      .update({ archived_at: archivedAt })
      .eq('id', id)
      .is('archived_at', null)
      .select('id, archived_at')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Version bereits archiviert' }, { status: 409 })
    }

    return NextResponse.json({ change: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error archiving care plan version:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
