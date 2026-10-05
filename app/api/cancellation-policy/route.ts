import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient } from '@/lib/admin-auth'
import {
  getPolicyDisplayTitle,
  policyToCancellationSections,
  type CancellationDisplayChannel,
  type CancellationServiceScope,
} from '@/lib/cancellation-policy-display'
import { loadActiveCancellationPolicy } from '@/lib/cancellation-policy-loader'

export const runtime = 'nodejs'

function parseScope(value: string | null): CancellationServiceScope {
  if (value === 'katzenbetreuung') return 'katzenbetreuung'
  if (value === 'tagesbetreuung') return 'tagesbetreuung'
  return 'hundepension'
}

function parseChannel(value: string | null): CancellationDisplayChannel {
  if (value === 'landing') return 'landing'
  if (value === 'portal') return 'portal'
  return 'contract'
}

export async function GET(request: NextRequest) {
  try {
    const scope = parseScope(request.nextUrl.searchParams.get('scope'))
    const channel = parseChannel(request.nextUrl.searchParams.get('channel'))

    const { policy, config } = await loadActiveCancellationPolicy(getAdminDbClient())

    return NextResponse.json({
      version: policy?.version ?? null,
      updatedAt: policy?.updated_at ?? null,
      title: getPolicyDisplayTitle(config, scope, channel),
      sections: policyToCancellationSections(config, scope, channel),
      generalNotes: config.generalNotes,
      cutoffHour: config.cutoffHour,
    })
  } catch (error: unknown) {
    console.error('Error loading public cancellation policy:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Stornierungsbedingungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
