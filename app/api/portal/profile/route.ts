import { NextRequest, NextResponse } from 'next/server'
import { getAdminDbClient, getServerClient } from '@/lib/admin-auth'
import {
  pickAllowedFields,
  PORTAL_ONBOARDING_STATUS_FIELDS,
  PORTAL_PROFILE_EDITABLE_FIELDS,
} from '@/lib/contact-editable-fields'
import { CustomerEmailError, normalizeCustomerEmail } from '@/lib/customer-email'
import {
  createCustomerEmailChangeRequest,
  getCustomerEmailChangeRequest,
  reconcileConfirmedCustomerEmail,
  deleteCustomerEmailChangeRequest,
  setCustomerEmailChangeRequestStatus,
} from '@/lib/customer-email-change'
import { resolveRequestBaseUrl } from '@/lib/onboarding-invite'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      console.error('No access token found')
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }
    
    // Prüfe ob User eingeloggt ist
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Hole User-Daten aus public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      console.error('User data error:', userError)
      return NextResponse.json(
        { error: 'User-Daten nicht gefunden' },
        { status: 401 }
      )
    }

    console.log('Loading profile for user:', { id: userData.id, email: userData.email })

    // Versuche zuerst über user_id zu finden
    let { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    console.log('Query by user_id result:', { data: data?.id, error: error?.code, errorMessage: error?.message })

    // Wenn nicht gefunden, versuche über Email zu finden (für Onboarding-Fall)
    if ((error && error.code === 'PGRST116') || !data) {
      console.log('Customer nicht über user_id gefunden, versuche über Email:', authUser.email)
      const { data: emailData, error: emailError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', authUser.email)
        .eq('contact_type', 'customer')
        .single()

      console.log('Query by email result:', { data: emailData?.id, error: emailError?.code, errorMessage: emailError?.message })

      if (!emailError && emailData) {
        data = emailData
        error = null
        console.log('Customer über Email gefunden:', emailData.id, 'user_id:', emailData.user_id)
      }
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching customer:', error)
      throw error
    }

    let emailChange = null
    if (data) {
      const adminDb = getAdminDbClient()
      const confirmed = await reconcileConfirmedCustomerEmail({
        db: adminDb,
        customerId: data.id,
        authEmail: authUser.email,
      })
      if (confirmed) {
        const { data: refreshed, error: refreshedError } = await adminDb
          .from('contacts')
          .select('*')
          .eq('id', data.id)
          .eq('contact_type', 'customer')
          .single()
        if (refreshedError) throw refreshedError
        data = refreshed
      }
      emailChange = await getCustomerEmailChangeRequest(adminDb, data.id)
      console.log('Customer data loaded:', {
        id: data.id,
        nachname: data.nachname,
        vorname: data.vorname,
        email: data.email,
        user_id: data.user_id,
        status: data.status
      })
    } else {
      console.warn('No customer data found')
    }

    return NextResponse.json({ customer: data || null, emailChange })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden des Profils' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }
    
    // Prüfe ob User eingeloggt ist
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Hole User-Daten aus public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User-Daten nicht gefunden' },
        { status: 401 }
      )
    }

    const rawUpdates = await request.json()
    const allowedKeys = [
      ...PORTAL_PROFILE_EDITABLE_FIELDS,
      ...PORTAL_ONBOARDING_STATUS_FIELDS,
    ] as const
    const updates = pickAllowedFields(
      rawUpdates as Record<string, unknown>,
      allowedKeys
    )

    const requestedEmail = Object.prototype.hasOwnProperty.call(updates, 'email')
      ? normalizeCustomerEmail(updates.email)
      : null
    delete updates.email

    if (Object.keys(updates).length === 0 && !requestedEmail) {
      return NextResponse.json(
        { error: 'Keine gültigen Felder zum Aktualisieren' },
        { status: 400 }
      )
    }

    // Prüfe ob Customer bereits existiert
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    let result
    if (existing) {
      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('contacts')
          .update(updates)
          .eq('user_id', userData.id)
          .eq('contact_type', 'customer')
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('user_id', userData.id)
          .eq('contact_type', 'customer')
          .single()
        if (error) throw error
        result = data
      }
    } else {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: userData.id,
          email: normalizeCustomerEmail(authUser.email),
          contact_type: 'customer',
          status: 'active',
          service: 'portal',
          message: '',
          availability: '-',
          nachname: '',
          vorname: '',
          telefonnummer: '',
          datenschutz: false,
          onboarding_completed: false,
          ...updates,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    const adminDb = getAdminDbClient()
    let emailChange = null
    if (requestedEmail && requestedEmail !== result.email) {
      const existingChange = await getCustomerEmailChangeRequest(adminDb, result.id)
      const acceptingAdminRequest =
        existingChange?.source === 'admin' &&
        existingChange.status === 'awaiting_customer_confirmation' &&
        existingChange.requested_email === requestedEmail

      emailChange = await createCustomerEmailChangeRequest({
        db: adminDb,
        customerId: result.id,
        authUserId: authUser.id,
        email: requestedEmail,
        requestedBy: authUser.id,
        source: acceptingAdminRequest ? 'admin' : 'customer',
        status: 'awaiting_auth_confirmation',
      })

      const { error: authUpdateError } = await supabase.auth.updateUser({
        email: requestedEmail,
      }, {
        emailRedirectTo: `${resolveRequestBaseUrl(request)}/portal/profile?email-change=confirmed`,
      })
      if (authUpdateError) {
        if (acceptingAdminRequest) {
          await setCustomerEmailChangeRequestStatus({
            db: adminDb,
            customerId: result.id,
            status: 'awaiting_customer_confirmation',
          })
        } else {
          await deleteCustomerEmailChangeRequest({ db: adminDb, customerId: result.id })
        }
        throw new CustomerEmailError(authUpdateError.message)
      }
    } else {
      // Auch ohne E-Mail-Änderung den aktuellen Status zurückgeben,
      // damit Oberflächen eine ausstehende Adresse nicht verlieren.
      emailChange = await getCustomerEmailChangeRequest(adminDb, result.id)
    }

    if (rawUpdates.onboarding_completed === true && result?.id) {
      try {
        const { syncPortalCustomerToSevdesk } = await import('@/lib/sevdesk-customer-export')
        const { getAdminDbClient } = await import('@/lib/admin-auth')
        await syncPortalCustomerToSevdesk({
          db: getAdminDbClient(),
          customerId: result.id,
        })
        const { data: refreshed } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', result.id)
          .single()
        if (refreshed) {
          result = refreshed
        }
      } catch (syncError) {
        console.error('SevDesk customer export after onboarding failed:', syncError)
      }
    }

    return NextResponse.json({ customer: result, emailChange })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren des Profils' },
      { status: error instanceof CustomerEmailError ? 400 : 500 }
    )
  }
}
