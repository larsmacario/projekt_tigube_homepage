import { NextRequest, NextResponse } from 'next/server'
import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import { CustomerEmailError, assertCustomerEmailAvailable, normalizeCustomerEmail } from '@/lib/customer-email'
import {
  resolveRequestBaseUrl,
  sendOnboardingInviteForCustomer,
} from '@/lib/onboarding-invite'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403 }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)

    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const body = await request.json()
    const { vorname = '', nachname, email } = body

    if (!nachname || !email) {
      return NextResponse.json(
        { error: 'Nachname und E-Mail sind Pflichtfelder' },
        { status: 400 }
      )
    }

    const cleanEmail = normalizeCustomerEmail(email)
    const cleanVorname = vorname.trim()
    const cleanNachname = nachname.trim()

    try {
      await assertCustomerEmailAvailable({
        db: getAdminDbClient(),
        email: cleanEmail,
      })
    } catch (error) {
      if (error instanceof CustomerEmailError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      throw error
    }

    let customerId: string

    const { data: existingLead } = await supabase
      .from('contacts')
      .select('*')
      .ilike('email', cleanEmail)
      .in('contact_type', ['lead', 'lost', 'waitlist'])
      .maybeSingle()

    if (existingLead) {
      customerId = existingLead.id

      const { error: updateErr } = await supabase
        .from('contacts')
        .update({
          contact_type: 'customer',
          status: 'pending',
          vorname: cleanVorname || existingLead.vorname,
          nachname: cleanNachname || existingLead.nachname,
        })
        .eq('id', customerId)

      if (updateErr) throw updateErr

      await supabase
        .from('property_values')
        .update({ entity_type: 'customer' })
        .eq('entity_type', 'lead')
        .eq('entity_id', customerId)
    } else {
      const { data: newCustomer, error: insertError } = await supabase
        .from('contacts')
        .insert({
          contact_type: 'customer',
          status: 'pending',
          vorname: cleanVorname,
          nachname: cleanNachname,
          email: cleanEmail,
          telefonnummer: '',
          service: '',
          message: '',
          availability: '',
          datenschutz: false,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Fehler beim Erstellen des neuen Kunden:', insertError)
        throw insertError
      }

      customerId = newCustomer.id
    }

    const result = await sendOnboardingInviteForCustomer({
      db: supabase,
      customerId,
      baseUrl: resolveRequestBaseUrl(request),
    })

    if (result.emailDelivery.status === 'failed') {
      return NextResponse.json(
        {
          error: result.emailDelivery.error || 'E-Mail konnte nicht versendet werden',
          customer_id: customerId,
          onboarding_url: result.onboardingUrl,
          email_delivery: result.emailDelivery,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      onboarding_url: result.onboardingUrl,
      email_delivery: result.emailDelivery,
    })
  } catch (error: any) {
    console.error('Error inviting customer:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Einladen des Kunden' },
      { status: error instanceof CustomerEmailError ? 400 : 500 }
    )
  }
}
