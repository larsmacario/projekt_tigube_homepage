import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  clearSevdeskApiKey,
  getSevdeskSettings,
  setSevdeskApiKey,
  testSevdeskConnection,
  updateSevdeskTestResult,
} from '@/lib/sevdesk'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { data, error } = await auth.client
      .from('sevdesk_settings')
      .select('*')
      .eq('id', 'sevdesk')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('SevDesk settings GET failed:', error)
    return NextResponse.json(
      { error: 'SevDesk-Einstellungen konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { apiKey?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (apiKey.length < 8) {
    return NextResponse.json(
      { error: 'Bitte einen gültigen SevDesk API-Key eingeben' },
      { status: 400 }
    )
  }

  try {
    await setSevdeskApiKey(apiKey, auth.user.id)
    const test = await testSevdeskConnection()
    const settings = await updateSevdeskTestResult(test.ok, test.error ?? null)

    if (!test.ok) {
      return NextResponse.json(
        {
          error: test.error || 'Verbindungstest fehlgeschlagen',
          settings,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ settings: settings ?? (await getSevdeskSettings()) })
  } catch (error) {
    console.error('SevDesk settings POST failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'SevDesk API-Key konnte nicht gespeichert werden',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    await clearSevdeskApiKey()
    return NextResponse.json({ settings: await getSevdeskSettings() })
  } catch (error) {
    console.error('SevDesk settings DELETE failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'SevDesk-Verbindung konnte nicht getrennt werden',
      },
      { status: 500 }
    )
  }
}
