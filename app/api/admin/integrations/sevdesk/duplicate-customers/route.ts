import { NextRequest, NextResponse } from 'next/server'

import { getAdminDbClient, requireAdmin } from '@/lib/admin-auth'
import { findCustomerDuplicateGroups } from '@/lib/customer-merge'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const groups = await findCustomerDuplicateGroups(getAdminDbClient())
    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Error loading customer duplicate groups:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Dubletten konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}
