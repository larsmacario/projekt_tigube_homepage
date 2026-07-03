import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Authentifizierung prüfen
  const auth = await requireAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id: targetLeadId } = await params
  let payload: { sourceLeadId?: string }
  try {
    payload = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Ungültiger JSON-Payload' }, { status: 400 })
  }

  const { sourceLeadId } = payload

  if (!sourceLeadId) {
    return NextResponse.json({ error: 'Quell-Lead-ID (sourceLeadId) ist erforderlich' }, { status: 400 })
  }

  if (sourceLeadId === targetLeadId) {
    return NextResponse.json({ error: 'Ein Lead kann nicht mit sich selbst zusammengeführt werden' }, { status: 400 })
  }

  try {
    const adminClient = getAdminDbClient()

    // 2. Leads laden
    const { data: targetLead, error: targetError } = await adminClient
      .from('contacts')
      .select('*')
      .eq('id', targetLeadId)
      .single()

    if (targetError || !targetLead) {
      return NextResponse.json({ error: 'Haupt-Lead nicht gefunden' }, { status: 404 })
    }

    if (targetLead.contact_type !== 'lead') {
      return NextResponse.json({ error: 'Der Haupt-Kontakt ist kein Lead' }, { status: 400 })
    }

    const { data: sourceLead, error: sourceError } = await adminClient
      .from('contacts')
      .select('*')
      .eq('id', sourceLeadId)
      .single()

    if (sourceError || !sourceLead) {
      return NextResponse.json({ error: 'Quell-Lead nicht gefunden' }, { status: 404 })
    }

    if (sourceLead.contact_type !== 'lead') {
      return NextResponse.json({ error: 'Der Quell-Kontakt ist kein Lead' }, { status: 400 })
    }

    // 3. Zusammenführen der Datenfelder
    const updates: Record<string, any> = {}

    // Felder, die im Haupt-Lead leer sind, aber im Quell-Lead existieren, übernehmen
    const fieldsToMerge = [
      'vorname',
      'nachname',
      'telefonnummer',
      'telefon_2',
      'service',
      'pet',
      'kundennummer',
      'notfall_kontakt_name',
      'notfallnummer',
      'futtermenge',
      'medikamente',
      'besonderheiten',
      'intervall_impfung',
      'intervall_entwurmung',
      'anzahl_tiere',
      'tiernamen',
      'alter_tier',
      'intakt_kastriert',
      'urlaub_von',
      'urlaub_bis',
      'konkreter_urlaub',
      'ip_address',
      'user_agent',
      'timestamp',
      'assigned_to',
      'user_id'
    ]

    for (const field of fieldsToMerge) {
      const targetVal = targetLead[field]
      const sourceVal = sourceLead[field]

      if ((targetVal === null || targetVal === '' || targetVal === undefined) && 
          (sourceVal !== null && sourceVal !== '' && sourceVal !== undefined)) {
        updates[field] = sourceVal
      }
    }

    // Besonderheit: Telefonnummern verschieben
    // Wenn Target eine Telefonnummer hat, Source eine Telefonnummer hat, diese aber unterschiedlich sind,
    // und Target keine telefon_2 hat -> speichere Source-Nummer als telefon_2 im Target.
    if (
      targetLead.telefonnummer && 
      sourceLead.telefonnummer && 
      targetLead.telefonnummer.trim() !== sourceLead.telefonnummer.trim() &&
      (!targetLead.telefon_2 || targetLead.telefon_2.trim() === '')
    ) {
      updates.telefon_2 = sourceLead.telefonnummer
    }

    // Freitexte message und availability verketten
    if (sourceLead.message && sourceLead.message.trim() !== '') {
      if (targetLead.message && targetLead.message.trim() !== '') {
        if (targetLead.message.trim() !== sourceLead.message.trim()) {
          const dateStr = new Date(sourceLead.created_at).toLocaleDateString('de-DE')
          updates.message = `${targetLead.message}\n\n--- Zusammengeführt aus Lead vom ${dateStr}: ---\n${sourceLead.message}`
        }
      } else {
        updates.message = sourceLead.message
      }
    }

    if (sourceLead.availability && sourceLead.availability.trim() !== '') {
      if (targetLead.availability && targetLead.availability.trim() !== '') {
        if (targetLead.availability.trim() !== sourceLead.availability.trim()) {
          updates.availability = `${targetLead.availability}\n\n--- Zusammengeführt: ---\n${sourceLead.availability}`
        }
      } else {
        updates.availability = sourceLead.availability
      }
    }

    // Booleans zusammenführen (OR)
    updates.datenschutz = targetLead.datenschutz || sourceLead.datenschutz
    if (sourceLead.schulferien_bw !== null && targetLead.schulferien_bw === null) {
      updates.schulferien_bw = sourceLead.schulferien_bw
    } else if (sourceLead.schulferien_bw !== null && targetLead.schulferien_bw !== null) {
      updates.schulferien_bw = targetLead.schulferien_bw || sourceLead.schulferien_bw
    }
    updates.onboarding_completed = targetLead.onboarding_completed || sourceLead.onboarding_completed

    // Newsletter unsubscribed (das frühere Datum übernehmen, falls vorhanden)
    if (sourceLead.newsletter_unsubscribed_at) {
      if (!targetLead.newsletter_unsubscribed_at) {
        updates.newsletter_unsubscribed_at = sourceLead.newsletter_unsubscribed_at
      } else {
        const targetDate = new Date(targetLead.newsletter_unsubscribed_at)
        const sourceDate = new Date(sourceLead.newsletter_unsubscribed_at)
        if (sourceDate < targetDate) {
          updates.newsletter_unsubscribed_at = sourceLead.newsletter_unsubscribed_at
        }
      }
    }

    // 4. Verknüpfte Daten umschreiben

    // a) Eigenschaften (property_values)
    const { data: targetProperties, error: targetPropsError } = await adminClient
      .from('property_values')
      .select('*')
      .eq('entity_type', 'lead')
      .eq('entity_id', targetLeadId)

    if (targetPropsError) throw targetPropsError

    const { data: sourceProperties, error: sourcePropsError } = await adminClient
      .from('property_values')
      .select('*')
      .eq('entity_type', 'lead')
      .eq('entity_id', sourceLeadId)

    if (sourcePropsError) throw sourcePropsError

    const targetPropIds = new Set((targetProperties || []).map(p => p.property_definition_id))

    if (sourceProperties && sourceProperties.length > 0) {
      for (const prop of sourceProperties) {
        if (!targetPropIds.has(prop.property_definition_id)) {
          // Eigenschaft existiert im Target noch nicht: Umschreiben
          const { error: updatePropError } = await adminClient
            .from('property_values')
            .update({ entity_id: targetLeadId })
            .eq('id', prop.id)
          if (updatePropError) throw updatePropError
        } else {
          // Eigenschaft existiert im Target bereits: Quell-Eigenschaft löschen
          const { error: deletePropError } = await adminClient
            .from('property_values')
            .delete()
            .eq('id', prop.id)
          if (deletePropError) throw deletePropError
        }
      }
    }

    // b) Notizen umschreiben
    const { error: notesError } = await adminClient
      .from('notes')
      .update({ contact_id: targetLeadId })
      .eq('contact_id', sourceLeadId)

    if (notesError) throw notesError

    // c) E-Mails umschreiben
    const { error: emailsError } = await adminClient
      .from('contact_emails')
      .update({ contact_id: targetLeadId })
      .eq('contact_id', sourceLeadId)

    if (emailsError) throw emailsError

    // d) Newsletter-Logs umschreiben
    const { error: newsletterLogsError } = await adminClient
      .from('newsletter_send_logs')
      .update({ contact_id: targetLeadId })
      .eq('contact_id', sourceLeadId)

    if (newsletterLogsError) throw newsletterLogsError

    // 5. Haupt-Lead in contacts aktualisieren
    if (Object.keys(updates).length > 0) {
      const { error: updateTargetError } = await adminClient
        .from('contacts')
        .update(updates)
        .eq('id', targetLeadId)

      if (updateTargetError) throw updateTargetError
    }

    // 6. System-Notiz erstellen
    const adminEmail = auth.user.email || 'Admin'
    const sourceName = [sourceLead.vorname, sourceLead.nachname].filter(Boolean).join(' ') || 'Unbekannt'
    const sourceEmail = sourceLead.email || 'Keine E-Mail'
    
    const mergeNote = `System-Notiz: Lead "${sourceName}" (${sourceEmail}) wurde in diesen Lead zusammengeführt.
Original-Erstellungsdatum: ${new Date(sourceLead.created_at).toLocaleString('de-DE')}
Ausgeführt von: ${adminEmail}`

    const { error: createNoteError } = await adminClient
      .from('notes')
      .insert({
        contact_id: targetLeadId,
        note: mergeNote,
        created_by: auth.user.id
      })

    if (createNoteError) throw createNoteError

    // 7. Quell-Lead löschen
    const { error: deleteSourceError } = await adminClient
      .from('contacts')
      .delete()
      .eq('id', sourceLeadId)

    if (deleteSourceError) throw deleteSourceError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error merging leads:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Zusammenführen der Leads' },
      { status: 500 }
    )
  }
}
