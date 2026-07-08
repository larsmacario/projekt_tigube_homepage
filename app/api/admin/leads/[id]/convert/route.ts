import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendOnboardingEmail } from '@/lib/email'

function getServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`
  
  const authCookie = request.cookies.get(cookieName)?.value
  let accessToken: string | undefined

  if (authCookie) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      accessToken = sessionData.access_token
    } catch (e) {
      accessToken = authCookie
    }
  }

  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    accessToken = authHeader?.replace('Bearer ', '')
  }

  if (!accessToken) {
    accessToken = request.cookies.get('sb-access-token')?.value
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { client, accessToken }
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id
    const { client: supabase, accessToken } = getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { data: lead, error: leadError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', leadId)
      .eq('contact_type', 'lead')
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead nicht gefunden' },
        { status: 404 }
      )
    }

    const { data: existingCustomer } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', lead.email)
      .eq('contact_type', 'customer')
      .neq('id', leadId)
      .maybeSingle()

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Ein Kunde mit dieser E-Mail existiert bereits' },
        { status: 400 }
      )
    }

    const { error: updateErr } = await supabase
      .from('contacts')
      .update({
        contact_type: 'customer',
        status: 'pending',
      })
      .eq('id', leadId)

    if (updateErr) throw updateErr

    await supabase
      .from('property_values')
      .update({ entity_type: 'customer' })
      .eq('entity_type', 'lead')
      .eq('entity_id', leadId)

    await supabase
      .from('onboarding_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('customer_id', leadId)
      .eq('used', false)

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: onboardingToken, error: tokenError } = await supabase
      .from('onboarding_tokens')
      .insert({
        customer_id: leadId,
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

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    const onboardingUrl = `${baseUrl}/onboarding/${token}`
    const emailDelivery = await sendOnboardingEmail({
      email: lead.email,
      name: [lead.vorname, lead.nachname].filter(Boolean).join(' '),
      onboardingUrl,
    })

    const webhookUrl = process.env.ONBOARDING_WEBHOOK_URL
    if (webhookUrl) {
      try {
        const { data: contactRow } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', leadId)
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
      customer_id: leadId,
      token: onboardingToken,
      onboarding_url: onboardingUrl,
      email_delivery: emailDelivery,
    })
  } catch (error: any) {
    console.error('Error converting lead:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler bei der Konvertierung' },
      { status: 500 }
    )
  }
}
