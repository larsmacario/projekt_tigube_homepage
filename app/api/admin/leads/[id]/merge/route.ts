import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

import { isLeadContactType, computeMergedLeadFields, buildMergeSystemNote } from '@/lib/lead-merge'

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

    if (!isLeadContactType(targetLead.contact_type)) {
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

    if (!isLeadContactType(sourceLead.contact_type)) {
      return NextResponse.json({ error: 'Der Quell-Kontakt ist kein Lead' }, { status: 400 })
    }

    // 3. Zusammenführen der Datenfelder
    const updates = computeMergedLeadFields(targetLead, sourceLead)

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

    // e) Onboarding-Tokens umschreiben
    await adminClient
      .from('onboarding_tokens')
      .update({ customer_id: targetLeadId })
      .eq('customer_id', sourceLeadId)

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
    const mergeNote = buildMergeSystemNote(sourceLead, adminEmail)

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
