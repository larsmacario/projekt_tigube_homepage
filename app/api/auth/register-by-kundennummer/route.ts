import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setAuthCookies } from '@/lib/auth-cookies'
import { customerEmailsEqual, normalizeCustomerEmail } from '@/lib/customer-email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const GENERIC_REGISTRATION_ERROR =
  'Kundennummer und E-Mail passen nicht zusammen, oder das Konto ist bereits aktiviert.'

type CustomerRow = {
  id: string
  email: string
  user_id: string | null
  kundennummer: string | null
  status: string | null
  deleted_at: string | null
}

function isCustomerEligibleForRegistration(
  customer: CustomerRow | null,
  email: string
): customer is CustomerRow {
  if (!customer) return false
  if (customer.user_id) return false
  if (customer.status === 'deleted') return false
  if (customer.deleted_at) return false
  return customerEmailsEqual(customer.email, email)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const kundennummer =
      typeof body.kundennummer === 'string' ? body.kundennummer.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const rawEmail = body.email

    if (!kundennummer || !rawEmail || !password) {
      return NextResponse.json(
        { error: 'Kundennummer, E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      )
    }

    let email: string
    try {
      email = normalizeCustomerEmail(rawEmail)
    } catch {
      return NextResponse.json({ error: GENERIC_REGISTRATION_ERROR }, { status: 400 })
    }

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server-Konfiguration fehlerhaft' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('contacts')
      .select('id, email, user_id, kundennummer, status, deleted_at')
      .eq('contact_type', 'customer')
      .eq('kundennummer', kundennummer)
      .maybeSingle()

    if (customerError || !isCustomerEligibleForRegistration(customer, email)) {
      return NextResponse.json({ error: GENERIC_REGISTRATION_ERROR }, { status: 400 })
    }

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createUserError || !createdUser.user) {
      return NextResponse.json({ error: GENERIC_REGISTRATION_ERROR }, { status: 400 })
    }

    const { error: linkError } = await supabaseAdmin
      .from('contacts')
      .update({ user_id: createdUser.user.id, status: 'active', onboarding_completed: false })
      .eq('id', customer.id)
      .is('user_id', null)

    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      return NextResponse.json({ error: GENERIC_REGISTRATION_ERROR }, { status: 400 })
    }

    const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError || !signInData.session) {
      return NextResponse.json(
        { error: 'Konto erstellt. Bitte melde dich mit deinen Zugangsdaten an.' },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ success: true, session: signInData.session })
    setAuthCookies(response, signInData.session)
    return response
  } catch (error: unknown) {
    console.error('Registration by kundennummer error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Fehler bei der Registrierung',
      },
      { status: 400 }
    )
  }
}
