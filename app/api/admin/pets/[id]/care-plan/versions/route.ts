import { NextRequest, NextResponse } from 'next/server'
import { toPetCarePlanVersions } from '@/lib/care-plan-versions'
import {
  CARE_PLAN_CHANGE_SELECT,
  mapCarePlanChangeRow,
} from '@/lib/care-plan-change-mapper'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id: petId } = await params

    const { data, error } = await auth.client
      .from('pet_care_plan_changes')
      .select(CARE_PLAN_CHANGE_SELECT)
      .eq('pet_id', petId)
      .order('changed_at', { ascending: false })

    if (error) throw error

    const changes = (data || []).map((row) => mapCarePlanChangeRow(row))
    const versions = toPetCarePlanVersions(changes)
    const current = versions.find((version) => version.is_current) ?? null

    return NextResponse.json({
      versions,
      changes,
      current_version_id: current?.id ?? null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error fetching care plan versions:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
