import { NextRequest, NextResponse } from 'next/server'
import { getServerClient, getAdminDbClient } from '@/lib/admin-auth'
import { validateBookingAvailabilityForRange, validateBookingAvailabilityForDateListServer } from '@/lib/booking-availability-server'
import type { ServiceType } from '@/lib/types'
import { isServiceAllowedForPetType } from '@/lib/booking-service'
import {
  buildBookingInsertRow,
  parsePortalPetLines,
  validatePortalPetLines,
} from '@/lib/booking-batch-create'
import { isRangeService } from '@/lib/day-care-booking'
import {
  buildLineItemsForRequest,
  loadBookingExtraCatalogForCustomer,
  validateExtraSelections,
} from '@/lib/booking-extras-server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!userData) {
      return NextResponse.json({ bookings: [] })
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json({ bookings: [] })
    }

    // Parse query parameters für Filter
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') // 'past', 'current', 'future'

    let query = supabase
      .from('bookings')
      .select(`
        *,
        pet:pets(id, name, tierart),
        customer:contacts!bookings_customer_id_fkey(id, vorname, nachname)
      `)
      .eq('customer_id', customer.id)
      .order('start_date', { ascending: false })

    // Filter nach Zeitraum
    const today = new Date().toISOString().split('T')[0]
    
    if (filter === 'past') {
      query = query.lt('end_date', today)
    } else if (filter === 'current') {
      query = query.lte('start_date', today).gte('end_date', today)
    } else if (filter === 'future') {
      query = query.gt('start_date', today)
    }

    const { data, error } = await query

    if (error) {
      console.warn('Bookings with relations failed, falling back:', error.message)
      let fallbackQuery = supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customer.id)
        .order('start_date', { ascending: false })

      if (filter === 'past') {
        fallbackQuery = fallbackQuery.lt('end_date', today)
      } else if (filter === 'current') {
        fallbackQuery = fallbackQuery.lte('start_date', today).gte('end_date', today)
      } else if (filter === 'future') {
        fallbackQuery = fallbackQuery.gt('start_date', today)
      }

      const { data: basicBookings, error: basicError } = await fallbackQuery
      if (basicError) {
        throw basicError
      }

      return NextResponse.json({ bookings: basicBookings || [] })
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

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert - Keine Session gefunden' },
        { status: 401 }
      )
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User-Daten nicht gefunden' },
        { status: 401 }
      )
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id, customer_group_id')
      .eq('user_id', userData.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Kundenprofil nicht gefunden' },
        { status: 404 }
      )
    }

    const bookingData = await request.json()
    const {
      pet_id,
      service_type,
      start_date,
      end_date,
      message,
      pets: petsPayload,
      extras: extrasPayload,
    } = bookingData

    const isBatch = Array.isArray(petsPayload) && petsPayload.length > 0

    if (isBatch) {
      const groupRange =
        start_date && end_date ? { start_date, end_date } : null

      const petLines = parsePortalPetLines(petsPayload)
      const seenPetIds = new Set<string>()

      for (const line of petLines) {
        if (!line?.pet_id || !line?.service_type) {
          return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
        }
        if (seenPetIds.has(line.pet_id)) {
          return NextResponse.json(
            { error: 'Jedes Tier darf nur einmal ausgewählt werden.' },
            { status: 400 }
          )
        }
        seenPetIds.add(line.pet_id)
      }

      const lineValidation = validatePortalPetLines(petLines, groupRange)
      if (!lineValidation.valid) {
        return NextResponse.json({ error: lineValidation.error }, { status: 400 })
      }

      const petIds = petLines.map((l) => l.pet_id)
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('id, customer_id, tierart')
        .in('id', petIds)

      if (petsError || !petsData || petsData.length !== petIds.length) {
        return NextResponse.json(
          { error: 'Tier nicht gefunden oder gehört nicht zu diesem Kunden' },
          { status: 403 }
        )
      }

      const petById = new Map(petsData.map((p) => [p.id, p]))

      for (const line of petLines) {
        const pet = petById.get(line.pet_id)
        if (!pet || pet.customer_id !== customer.id) {
          return NextResponse.json(
            { error: 'Tier nicht gefunden oder gehört nicht zu diesem Kunden' },
            { status: 403 }
          )
        }
        if (!isServiceAllowedForPetType(line.service_type, pet.tierart)) {
          return NextResponse.json(
            { error: 'Der gewählte Service passt nicht zur Tierart.' },
            { status: 400 }
          )
        }
      }

      const serviceTypes = [...new Set(petLines.map((l) => l.service_type))]

      if (groupRange) {
        for (const st of serviceTypes.filter(isRangeService)) {
          const availability = await validateBookingAvailabilityForRange({
            serviceType: st,
            startDate: groupRange.start_date,
            endDate: groupRange.end_date,
            checkCapacity: false,
          })
          if (!availability.valid) {
            return NextResponse.json(
              { error: availability.error || 'Der gewählte Zeitraum ist nicht verfügbar.' },
              { status: 400 }
            )
          }
        }
      }

      for (const line of petLines) {
        if (line.service_type !== 'tagesbetreuung') continue

        if (line.day_care_mode === 'once' && line.selected_dates?.length) {
          const availability = await validateBookingAvailabilityForDateListServer(
            'tagesbetreuung',
            line.selected_dates,
            false
          )
          if (!availability.valid) {
            return NextResponse.json(
              { error: availability.error || 'Ausgewählte Tage sind nicht verfügbar.' },
              { status: 400 }
            )
          }
        }

        if (line.day_care_mode === 'recurring' && line.start_date) {
          const availability = await validateBookingAvailabilityForRange({
            serviceType: 'tagesbetreuung',
            startDate: line.start_date,
            endDate: line.start_date,
            checkCapacity: false,
          })
          if (!availability.valid) {
            return NextResponse.json(
              { error: availability.error || 'Das Startdatum ist nicht verfügbar.' },
              { status: 400 }
            )
          }
        }
      }

      const extras = Array.isArray(extrasPayload) ? extrasPayload : []
      const requestGroupId = randomUUID()
      const allowedPetIds = new Set(petLines.map((line) => line.pet_id))

      let extraValidation:
        | { valid: true; priceById: Map<string, import('@/lib/booking-extras').BookingExtraPrice> }
        | { valid: false; error: string }
        | null = null

      if (extras.length > 0) {
        for (const selection of extras) {
          if (selection.pet_id && !allowedPetIds.has(selection.pet_id)) {
            return NextResponse.json(
              { error: 'Zusatzleistung bezieht sich auf ein ungültiges Tier.' },
              { status: 400 }
            )
          }
        }

        const catalog = await loadBookingExtraCatalogForCustomer(
          supabase,
          customer.id,
          customer.customer_group_id,
          serviceTypes
        )
        extraValidation = validateExtraSelections(extras, catalog.prices)
        if (!extraValidation.valid) {
          return NextResponse.json({ error: extraValidation.error }, { status: 400 })
        }
      }

      const createdBookingIds: string[] = []
      const createdBookings: any[] = []
      const bookingIdByPetId = new Map<string, string>()
      const petNameByPetId = new Map<string, string>()

      try {
        for (const line of petLines) {
          const insertRow = buildBookingInsertRow(
            line,
            groupRange,
            customer.id,
            requestGroupId,
            message || null
          )

          const { data: row, error: insertError } = await supabase
            .from('bookings')
            .insert(insertRow)
            .select(`
              *,
              pet:pets(id, name, tierart),
              customer:contacts!bookings_customer_id_fkey(id, vorname, nachname)
            `)
            .single()

          if (insertError || !row) {
            throw insertError || new Error('Buchung konnte nicht erstellt werden')
          }

          createdBookingIds.push(row.id)
          createdBookings.push(row)
          bookingIdByPetId.set(line.pet_id, row.id)
          const petName = (row as { pet?: { name?: string } }).pet?.name
          if (petName) {
            petNameByPetId.set(line.pet_id, petName)
          }
        }

        let lineItemsToInsert: ReturnType<typeof buildLineItemsForRequest> = []
        if (extras.length > 0 && extraValidation?.valid) {
          lineItemsToInsert = buildLineItemsForRequest(
            requestGroupId,
            extras,
            extraValidation.priceById,
            userData.id,
            { bookingIdByPetId, petNameByPetId }
          )
        }

        if (lineItemsToInsert.length > 0) {
          const adminClient = getAdminDbClient()
          const { data: lineItems, error: lineError } = await adminClient
            .from('booking_line_items')
            .insert(lineItemsToInsert)
            .select('*')

          if (lineError) {
            throw lineError
          }

          return NextResponse.json({
            request_group_id: requestGroupId,
            bookings: createdBookings,
            line_items: lineItems || [],
          })
        }

        return NextResponse.json({
          request_group_id: requestGroupId,
          bookings: createdBookings,
          line_items: [],
        })
      } catch (batchError: any) {
        if (createdBookingIds.length > 0) {
          const adminClient = getAdminDbClient()
          await adminClient.from('bookings').delete().in('id', createdBookingIds)
        }
        throw batchError
      }
    }

    // Legacy: ein Tier pro Anfrage
    if (!pet_id || !service_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      )
    }

    // Prüfe ob das Tier dem Kunden gehört
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, customer_id, tierart')
      .eq('id', pet_id)
      .single()

    if (petError || !pet || pet.customer_id !== customer.id) {
      return NextResponse.json(
        { error: 'Tier nicht gefunden oder gehört nicht zu diesem Kunden' },
        { status: 403 }
      )
    }

    if (!isServiceAllowedForPetType(service_type, pet.tierart)) {
      return NextResponse.json(
        { error: 'Der gewählte Service passt nicht zur Tierart.' },
        { status: 400 }
      )
    }

    // Prüfe ob end_date >= start_date
    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { error: 'Enddatum muss nach Startdatum liegen' },
        { status: 400 }
      )
    }

    const availability = await validateBookingAvailabilityForRange({
      serviceType: service_type as ServiceType,
      startDate: start_date,
      endDate: end_date,
      checkCapacity: false,
    })

    if (!availability.valid) {
      return NextResponse.json(
        { error: availability.error || 'Der gewählte Zeitraum ist nicht verfügbar.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_id: customer.id,
        pet_id,
        service_type,
        start_date,
        end_date,
        message: message || null,
        status: 'pending',
      })
      .select(`
        *,
        pet:pets(id, name, tierart),
        customer:contacts!bookings_customer_id_fkey(id, vorname, nachname)
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ booking: data })
  } catch (error: any) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Buchung' },
      { status: 500 }
    )
  }
}

