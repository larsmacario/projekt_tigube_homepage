import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import {
  resolveRequestBaseUrl,
  sendOnboardingInviteForCustomer,
} from '@/lib/onboarding-invite'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const db = getAdminDbClient()
    const result = await sendOnboardingInviteForCustomer({
      db,
      customerId: id,
      baseUrl: resolveRequestBaseUrl(request),
    })

    if (result.emailDelivery.status === 'failed') {
      return NextResponse.json(
        {
          error: result.emailDelivery.error || 'E-Mail konnte nicht versendet werden',
          onboarding_url: result.onboardingUrl,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      onboarding_url: result.onboardingUrl,
      email_delivery: result.emailDelivery,
    })
  } catch (error) {
    console.error('Onboarding invite failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Onboarding-Einladung fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
