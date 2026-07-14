import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'

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
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Nicht autorisiert', status: 403, userData: null }
  }

  return { error: null, status: 200, userData }
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authResult = await checkAdminAuth(supabase, accessToken)
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const serviceType = searchParams.get('service_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const customerId = searchParams.get('customer_id')

    let query = supabase
      .from('bookings')
      .select(`
        *,
        pet:pets(id, name, tierart),
        customer:contacts!bookings_customer_id_fkey(id, vorname, nachname, email, telefonnummer),
        responded_by_user:users!bookings_responded_by_fkey(id, email)
      `)
      .order('created_at', { ascending: false })

    // Filter
    if (status) {
      query = query.eq('status', status)
    }
    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }
    if (startDate) {
      query = query.gte('start_date', startDate)
    }
    if (endDate) {
      query = query.lte('end_date', endDate)
    }
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ bookings: data || [] })
  } catch (error: any) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Buchungen' },
      { status: 500 }
    )
  }
}

