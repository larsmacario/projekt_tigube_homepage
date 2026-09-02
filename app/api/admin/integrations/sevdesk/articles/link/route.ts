import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { retrySevdeskArticleLink, type CatalogArticleTable } from '@/lib/sevdesk-article-sync'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { table?: string; id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const table = body.table
  const id = body.id

  if (table !== 'prices' && table !== 'addon_services') {
    return NextResponse.json({ error: 'Ungültige Tabelle' }, { status: 400 })
  }

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Artikel-ID fehlt' }, { status: 400 })
  }

  try {
    const result = await retrySevdeskArticleLink({
      table: table as CatalogArticleTable,
      id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('SevDesk article link retry failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'SevDesk-Verknüpfung fehlgeschlagen',
      },
      { status: 500 }
    )
  }
}
