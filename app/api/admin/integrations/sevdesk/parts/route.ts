import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listSevdeskParts } from '@/lib/sevdesk'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 50, 1), 100) : 50

  try {
    const parts = await listSevdeskParts(limit)
    return NextResponse.json({ parts })
  } catch (error) {
    console.error('SevDesk parts failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'SevDesk-Artikel konnten nicht geladen werden',
      },
      { status: 502 }
    )
  }
}
