import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { randomBytes } from 'crypto'
import { sendOnboardingEmail } from '@/lib/email'

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

    const cleanEmail = email.toLowerCase().trim()
    const cleanVorname = vorname.trim()
    const cleanNachname = nachname.trim()

    // 1. Prüfen, ob bereits ein Kunde mit dieser E-Mail existiert
    const { data: existingCustomer } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', cleanEmail)
      .eq('contact_type', 'customer')
      .maybeSingle()

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Ein Kunde mit dieser E-Mail existiert bereits' },
        { status: 400 }
      )
    }

    let customerId: string

    // 2. Prüfen, ob bereits ein Lead mit dieser E-Mail existiert
    const { data: existingLead } = await supabase
      .from('contacts')
      .select('*')
      .eq('email', cleanEmail)
      .eq('contact_type', 'lead')
      .maybeSingle()

    if (existingLead) {
      customerId = existingLead.id

      // Lead zu Kunde konvertieren
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({
          contact_type: 'customer',
          status: 'pending',
          vorname: cleanVorname || existingLead.vorname, // falls leer, behalte alten Vornamen
          nachname: cleanNachname || existingLead.nachname, // falls leer, behalte alten Nachnamen
        })
        .eq('id', customerId)

      if (updateErr) throw updateErr

      // Property Values auf entity_type customer anpassen
      await supabase
        .from('property_values')
        .update({ entity_type: 'customer' })
        .eq('entity_type', 'lead')
        .eq('entity_id', customerId)

      // Bestehende Onboarding-Tokens entwerten
      await supabase
        .from('onboarding_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('used', false)

    } else {
      // Neuen Kunden anlegen (mit leeren Werten für Pflichtfelder in DB)
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
          datenschutz: false
        })
        .select()
        .single()

      if (insertError) {
        console.error('Fehler beim Erstellen des neuen Kunden:', insertError)
        throw insertError
      }

      customerId = newCustomer.id
    }

    // 3. Onboarding Token generieren
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 Tage gültig

    const { data: onboardingToken, error: tokenError } = await supabase
      .from('onboarding_tokens')
      .insert({
        customer_id: customerId,
        token,
        expires_at: expiresAt,
        used: false,
      })
      .select()
      .single()

    if (tokenError) {
      console.error('Fehler beim Erstellen des Onboarding-Tokens:', tokenError)
      throw tokenError
    }

    // 4. Onboarding E-Mail senden
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    const onboardingUrl = `${baseUrl}/onboarding/${token}`
    
    const emailDelivery = await sendOnboardingEmail({
      email: cleanEmail,
      name: [cleanVorname, cleanNachname].filter(Boolean).join(' '),
      onboardingUrl,
    })

    // 5. Webhook triggern
    const webhookUrl = process.env.ONBOARDING_WEBHOOK_URL
    if (webhookUrl) {
      try {
        const { data: contactRow } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', customerId)
          .single()

        const webhookPayload = {
          event: 'onboarding_link_created',
          customer: contactRow ? {
            id: contactRow.id,
            name: contactRow.nachname,
            vorname: contactRow.vorname,
            email: contactRow.email,
            phone: contactRow.telefonnummer,
            status: contactRow.status,
          } : {},
          onboarding_url: onboardingUrl,
          timestamp: new Date().toISOString(),
        }

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          console.error('Webhook-Fehler:', webhookResponse.status, errorText)
        }
      } catch (webhookError: any) {
        console.error('Fehler beim Senden des Webhooks:', webhookError.message || webhookError)
      }
    }

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      token: onboardingToken,
      onboarding_url: onboardingUrl,
      email_delivery: emailDelivery,
    })

  } catch (error: any) {
    console.error('Error inviting customer:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Einladen des Kunden' },
      { status: 500 }
    )
  }
}
