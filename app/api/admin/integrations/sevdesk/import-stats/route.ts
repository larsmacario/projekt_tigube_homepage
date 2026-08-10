import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const db = getAdminDbClient()

    const { data: importedCustomers, error } = await db
      .from('contacts')
      .select('id, onboarding_completed, onboarding_email_status')
      .eq('contact_type', 'customer')
      .eq('service', 'import')

    if (error) {
      throw new Error(error.message)
    }

    const rows = importedCustomers ?? []
    const importedTotal = rows.length
    const onboardingOpen = rows.filter((row) => !row.onboarding_completed).length
    const mailNotSent = rows.filter(
      (row) => !row.onboarding_completed && row.onboarding_email_status !== 'sent'
    ).length
    const mailFailed = rows.filter((row) => row.onboarding_email_status === 'failed').length
    const mailSent = rows.filter((row) => row.onboarding_email_status === 'sent').length

    return NextResponse.json({
      importedTotal,
      onboardingOpen,
      mailNotSent,
      mailFailed,
      mailSent,
    })
  } catch (error) {
    console.error('SevDesk import stats failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Import-Statistiken konnten nicht geladen werden',
      },
      { status: 500 }
    )
  }
}
