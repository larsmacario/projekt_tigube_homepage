import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { sendAdminInvitationEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabaseAdmin = getAdminDbClient()
    const { data: invites, error } = await supabaseAdmin
      .from('admin_invitations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invites })
  } catch (error: any) {
    console.error('Error fetching admin invites:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Einladungen' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { email, vorname, nachname } = body

    if (!email || !vorname || !nachname) {
      return NextResponse.json(
        { error: 'Vorname, Nachname und E-Mail sind Pflichtfelder' },
        { status: 400 }
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanVorname = vorname.trim()
    const cleanNachname = nachname.trim()

    const supabaseAdmin = getAdminDbClient()

    // 1. Prüfen, ob bereits ein User mit dieser E-Mail existiert
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits' },
        { status: 400 }
      )
    }

    // 2. Bestehende, nicht genutzte Einladungen für diese E-Mail löschen
    await supabaseAdmin
      .from('admin_invitations')
      .delete()
      .eq('email', cleanEmail)

    // 3. Token generieren
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 Tage gültig

    const { data: invite, error: insertError } = await supabaseAdmin
      .from('admin_invitations')
      .insert({
        email: cleanEmail,
        vorname: cleanVorname,
        nachname: cleanNachname,
        token,
        expires_at: expiresAt,
        used: false
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 4. Einladungs-E-Mail senden
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`
    const invitationUrl = `${baseUrl}/admin/accept-invitation/${token}`

    const emailDelivery = await sendAdminInvitationEmail({
      email: cleanEmail,
      name: `${cleanVorname} ${cleanNachname}`,
      invitationUrl,
    })

    if (emailDelivery.status === 'failed') {
      console.error('SMTP Error inviting admin:', emailDelivery.error)
      // Wir löschen die Einladung wieder, damit keine verwaisten Einladungen existieren,
      // wenn der E-Mail-Versand fehlschlägt.
      await supabaseAdmin
        .from('admin_invitations')
        .delete()
        .eq('id', invite.id)

      return NextResponse.json(
        { error: `Die E-Mail konnte nicht gesendet werden: ${emailDelivery.error}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, invite })
  } catch (error: any) {
    console.error('Error creating admin invite:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Einladung' },
      { status: 500 }
    )
  }
}
