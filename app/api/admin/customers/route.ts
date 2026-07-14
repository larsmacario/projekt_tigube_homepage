import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import type { Customer } from '@/lib/types'

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

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    const authError = await checkAdminAuth(supabase, accessToken)
    
    if (authError) {
      return NextResponse.json(
        { error: authError.error },
        { status: authError.status }
      )
    }

    const { data: customers, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_type', 'customer')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Lade Property Values für alle Kunden
    const customerIds = (customers || []).map((c: any) => c.id)
    let propertyValues: any[] = []

    if (customerIds.length > 0) {
      const { data: values, error: valuesError } = await supabase
        .from('property_values')
        .select(`
          *,
          property_definition:property_definitions(*)
        `)
        .eq('entity_type', 'customer')
        .in('entity_id', customerIds)

      if (!valuesError && values) {
        propertyValues = values
      }
    }

    // Erweitere Kunden mit Property Values
    const customersWithProperties = (customers || []).map((customer: any) => {
      const customerProperties: Record<string, any> = {}
      propertyValues
        .filter(pv => pv.entity_id === customer.id)
        .forEach(pv => {
          const propId = `property_${pv.property_definition_id}`
          // Bestimme Wert basierend auf Feldtyp
          if (pv.value_text !== null) customerProperties[propId] = pv.value_text
          else if (pv.value_number !== null) customerProperties[propId] = pv.value_number
          else if (pv.value_date !== null) customerProperties[propId] = pv.value_date
          else if (pv.value_boolean !== null) customerProperties[propId] = pv.value_boolean
        })
      return { ...customer, ...customerProperties }
    })

    return NextResponse.json({ customers: customersWithProperties })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Kunden' },
      { status: 500 }
    )
  }
}

