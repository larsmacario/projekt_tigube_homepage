import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { importSevdeskArticles } from '@/lib/sevdesk-article-sync'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const db = getAdminDbClient()
    const summary = await importSevdeskArticles(db, auth.user.id)
    return NextResponse.json({ summary })
  } catch (error) {
    console.error('SevDesk article import failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Artikel-Import fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
