import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { sendCampaignTestEmail } from '@/lib/newsletter-send'

export const runtime = 'nodejs'

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
    const body = await request.json().catch(() => ({}))
    const testEmail = body.testEmail || process.env.NEWSLETTER_TEST_EMAIL || auth.user.email

    const adminClient = getAdminDbClient()
    const { data: campaign, error } = await adminClient
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 })
    }

    const result = await sendCampaignTestEmail(campaign, testEmail)

    if (result.status === 'failed') {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, to: testEmail })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
