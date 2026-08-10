import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import {
  resolveRequestBaseUrl,
  sendOnboardingInvitesForCustomers,
} from '@/lib/onboarding-invite'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { customerIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const customerIds = Array.isArray(body.customerIds)
    ? body.customerIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []

  if (customerIds.length === 0) {
    return NextResponse.json(
      { error: 'Mindestens ein Kunde muss ausgewählt werden' },
      { status: 400 }
    )
  }

  try {
    const db = getAdminDbClient()
    const result = await sendOnboardingInvitesForCustomers({
      db,
      customerIds,
      baseUrl: resolveRequestBaseUrl(request),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk onboarding invite failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Onboarding-Einladungen konnten nicht versendet werden',
      },
      { status: 500 }
    )
  }
}
