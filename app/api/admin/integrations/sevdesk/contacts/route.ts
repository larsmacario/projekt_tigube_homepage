import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listSevdeskContacts } from '@/lib/sevdesk'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 50, 1), 100) : 50

  try {
    const contacts = await listSevdeskContacts(limit)
    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('SevDesk contacts failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'SevDesk-Kontakte konnten nicht geladen werden',
      },
      { status: 502 }
    )
  }
}
