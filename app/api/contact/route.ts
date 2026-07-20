import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLeadEmails } from '@/lib/email'
import { buildReferredLeadMessage } from '@/lib/vacation-dates'

export const runtime = 'nodejs'

interface ContactFormData {
  name: string
  vorname?: string
  email: string
  phone: string
  pet?: string
  service: string
  message: string
  availability: string
  privacy: boolean
  // Zusätzliche Felder für Hundepension
  anzahlTiere?: string
  tiernamen?: string
  schulferienBW?: boolean
  konkreterUrlaub?: string
  urlaubVon?: string
  urlaubBis?: string
  intaktKastriert?: string
  alter?: string
  timestamp?: string
  ferienKonflikt?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const formData: ContactFormData = await request.json()

    // Validierung der Pflichtfelder
    if (!formData.name || !formData.email || !formData.message || !formData.availability) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      )
    }

    // Zusätzliche Validierung für Hundepension
    if (formData.service === 'hundepension') {
      if (!formData.vorname || !formData.anzahlTiere || !formData.tiernamen || 
          !formData.alter || !formData.intaktKastriert || !formData.konkreterUrlaub) {
        return NextResponse.json(
          { error: 'Pflichtfelder für Hundepension fehlen' },
          { status: 400 }
        )
      }
      
      // Validierung: Wenn konkreter Urlaub geplant ist, müssen Datumsfelder vorhanden sein
      if (formData.konkreterUrlaub === 'ja') {
        if (!formData.urlaubVon || !formData.urlaubBis) {
          return NextResponse.json(
            { error: 'Bitte geben Sie einen Urlaubszeitraum an' },
            { status: 400 }
          )
        }

        // Parse ISO-Strings zu Date-Objekten (Format: YYYY-MM-DD oder ISO-String)
        const startDate = new Date(formData.urlaubVon)
        const endDate = new Date(formData.urlaubBis)

        // Prüfe ob Datumsfelder gültig sind
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Ungültiges Datumsformat' },
            { status: 400 }
          )
        }

        // Prüfe ob Enddatum nach Startdatum liegt
        if (endDate < startDate) {
          return NextResponse.json(
            { error: 'Das Enddatum muss nach dem Startdatum liegen' },
            { status: 400 }
          )
        }
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ferienKonflikt = formData.ferienKonflikt === true
    const storedMessage = ferienKonflikt
      ? buildReferredLeadMessage(formData.message)
      : formData.message

    const { data: lead, error: dbError } = await supabase.from('contacts').insert({
      contact_type: ferienKonflikt ? 'lost' : 'lead',
      nachname: formData.name,
      vorname: formData.vorname ?? null,
      email: formData.email,
      telefonnummer: formData.phone,
      service: formData.service,
      pet: formData.pet ?? null,
      message: storedMessage,
      availability: formData.availability,
      datenschutz: formData.privacy,
      anzahl_tiere: formData.anzahlTiere ?? null,
      tiernamen: formData.tiernamen ?? null,
      schulferien_bw: formData.schulferienBW ?? null,
      konkreter_urlaub: formData.konkreterUrlaub ?? null,
      urlaub_von: formData.urlaubVon ?? null,
      urlaub_bis: formData.urlaubBis ?? null,
      intakt_kastriert: formData.intaktKastriert ?? null,
      alter_tier: formData.alter ?? null,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      timestamp: formData.timestamp || new Date().toISOString(),
      status: ferienKonflikt ? null : 'new',
    }).select('id').single()

    if (dbError) {
      console.error('Supabase-Fehler beim Speichern der Kontaktanfrage:', dbError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Anfrage' },
        { status: 500 }
      )
    }

    console.log('Kontaktanfrage erfolgreich in Supabase gespeichert:', {
      id: lead.id,
      service: formData.service,
      name: formData.name,
      email: formData.email,
    })

    const deliveries = await sendLeadEmails({
      ...formData,
      message: storedMessage,
      ferienKonflikt,
    })
    const { error: deliveryStatusError } = await supabase
      .from('contacts')
      .update({
        email_internal_status: deliveries.internal.status,
        email_internal_error: deliveries.internal.error,
        email_confirmation_status: ferienKonflikt ? null : deliveries.confirmation.status,
        email_confirmation_error: ferienKonflikt ? null : deliveries.confirmation.error,
      })
      .eq('id', lead.id)

    if (deliveryStatusError) {
      console.error('Supabase-Fehler beim Speichern des E-Mail-Status:', deliveryStatusError)
    }

    if (deliveries.internal.status === 'failed' || (!ferienKonflikt && deliveries.confirmation.status === 'failed')) {
      console.error('SMTP-Versand für Lead fehlgeschlagen:', {
        leadId: lead.id,
        internal: deliveries.internal.error,
        confirmation: deliveries.confirmation.error,
      })

      return NextResponse.json(
        { error: 'Ihre Anfrage wurde gespeichert, aber die E-Mail-Benachrichtigung konnte nicht versendet werden. Bitte kontaktieren Sie uns direkt.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Anfrage erfolgreich gesendet'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Fehler beim Verarbeiten der Kontaktanfrage:', error)
    
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}
