import { NextRequest, NextResponse } from 'next/server'
import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import { sendSpringerOfferEmail } from '@/lib/springer-email'
import { buildSpringerOfferUrl, getSiteOrigin } from '@/lib/springer'

export const runtime = 'nodejs'

async function checkAdminAuth(supabase: any, accessToken: string | undefined) {
  if (!accessToken) {
    return { error: 'Nicht autorisiert - Keine Session gefunden', status: 401 }
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nicht autorisiert', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403, userData: null }
  }

  return { error: null, status: 200, userData }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function customerDisplayName(customer: {
  vorname?: string | null
  nachname?: string | null
} | null): string {
  if (!customer) return 'zusammen'
  return [customer.vorname, customer.nachname].filter(Boolean).join(' ') || 'zusammen'
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger Anfrage-Body' }, { status: 400 })
    }

    const offerDate = typeof body.offer_date === 'string' ? body.offer_date : ''
    if (!isIsoDate(offerDate)) {
      return NextResponse.json(
        { error: 'offer_date muss im Format YYYY-MM-DD vorliegen' },
        { status: 400 }
      )
    }

    const registrationIds = Array.isArray(body.registration_ids)
      ? body.registration_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : []

    if (registrationIds.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine registration_id ist erforderlich' },
        { status: 400 }
      )
    }

    const sourceBookingId =
      typeof body.source_booking_id === 'string' && body.source_booking_id
        ? body.source_booking_id
        : null

    const { data: registrations, error: regError } = await supabase
      .from('springer_registrations')
      .select(
        `
        *,
        pet:pets(id, name, tierart),
        customer:contacts!springer_registrations_customer_id_fkey(id, vorname, nachname, email)
      `
      )
      .in('id', registrationIds)
      .eq('is_active', true)

    if (regError) {
      throw regError
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json(
        { error: 'Keine aktiven Registrierungen gefunden' },
        { status: 404 }
      )
    }

    const admin = getAdminDbClient()
    const origin = getSiteOrigin()
    const results: Array<{
      registration_id: string
      offer_id: string | null
      status: 'sent' | 'send_failed' | 'error'
      error: string | null
    }> = []

    for (const registration of registrations) {
      const customer = registration.customer as {
        id: string
        vorname?: string | null
        nachname?: string | null
        email?: string | null
      } | null
      const pet = registration.pet as { id: string; name?: string | null } | null
      const email = customer?.email?.trim()

      if (!email) {
        results.push({
          registration_id: registration.id,
          offer_id: null,
          status: 'error',
          error: 'Kunde hat keine E-Mail-Adresse',
        })
        continue
      }

      const { data: existingOffer } = await admin
        .from('springer_offers')
        .select('*')
        .eq('registration_id', registration.id)
        .eq('offer_date', offerDate)
        .maybeSingle()

      if (existingOffer && !['draft', 'sent', 'send_failed'].includes(existingOffer.status)) {
        results.push({
          registration_id: registration.id,
          offer_id: existingOffer.id,
          status: 'error',
          error: `Angebot bereits ${existingOffer.status}`,
        })
        continue
      }

      let offer = existingOffer
      if (!offer) {
        const { data: created, error: offerError } = await admin
          .from('springer_offers')
          .insert({
            registration_id: registration.id,
            customer_id: registration.customer_id,
            pet_id: registration.pet_id,
            source_booking_id: sourceBookingId,
            offer_date: offerDate,
            status: 'draft',
          })
          .select()
          .single()

        if (offerError || !created) {
          results.push({
            registration_id: registration.id,
            offer_id: null,
            status: 'error',
            error: offerError?.message || 'Angebot konnte nicht erstellt werden',
          })
          continue
        }
        offer = created
      } else if (sourceBookingId && !offer.source_booking_id) {
        await admin
          .from('springer_offers')
          .update({
            source_booking_id: sourceBookingId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', offer.id)
      }

      const acceptUrl = buildSpringerOfferUrl(origin, offer.token)
      const delivery = await sendSpringerOfferEmail({
        to: email,
        customerName: customerDisplayName(customer),
        petName: pet?.name || 'dein Tier',
        offerDate,
        acceptUrl,
      })

      const nextStatus = delivery.status === 'sent' ? 'sent' : 'send_failed'
      const sentAt = delivery.status === 'sent' ? new Date().toISOString() : null

      const { error: updateError } = await admin
        .from('springer_offers')
        .update({
          status: nextStatus,
          sent_at: sentAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offer.id)

      if (updateError) {
        results.push({
          registration_id: registration.id,
          offer_id: offer.id,
          status: 'error',
          error: updateError.message,
        })
        continue
      }

      results.push({
        registration_id: registration.id,
        offer_id: offer.id,
        status: nextStatus,
        error: delivery.error,
      })
    }

    return NextResponse.json({ results })
  } catch (error: unknown) {
    console.error('Error creating springer offers:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Erstellen der Springer-Angebote'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
