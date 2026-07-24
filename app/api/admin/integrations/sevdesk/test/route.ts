import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getSevdeskSettings,
  testSevdeskConnection,
  updateSevdeskTestResult,
} from '@/lib/sevdesk'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
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
    console.error('SevDesk test failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Verbindungstest konnte nicht ausgeführt werden',
      },
      { status: 500 }
    )
  }
}
