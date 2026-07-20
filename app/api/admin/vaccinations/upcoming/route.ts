import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getUpcomingVaccinationRows, type UpcomingVaccinationStatus } from '@/lib/pet-vaccination'
import type { Pet } from '@/lib/types'

type PetWithCustomer = Pick<
  Pet,
  | 'id'
  | 'name'
  | 'customer_id'
  | 'tierart'
  | 'letzte_impfung'
  | 'intervall_impfung'
  | 'letzte_impfung_zusatz'
> & {
  contacts: {
    vorname: string | null
    nachname: string | null
    email: string | null
  } | null
}

function parseDaysParam(value: string | null): number {
  const parsed = Number(value ?? '90')
  if (!Number.isFinite(parsed) || parsed < 1) return 90
  return Math.min(Math.floor(parsed), 365)
}

function parseStatusParam(value: string | null): 'all' | UpcomingVaccinationStatus {
  if (
    value === 'overdue' ||
    value === 'due_soon' ||
    value === 'upcoming' ||
    value === 'incomplete'
  ) {
    return value
  }
  return 'all'
}

function parseTypeParam(value: string | null): 'all' | 'kombi' | 'zwingerhusten' {
  if (value === 'kombi' || value === 'zwingerhusten') return value
  return 'all'
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const params = new URL(request.url).searchParams
    const days = parseDaysParam(params.get('days'))
    const status = parseStatusParam(params.get('status'))
    const type = parseTypeParam(params.get('type'))

    const { data, error } = await auth.client
      .from('pets')
      .select(
        'id, name, customer_id, tierart, letzte_impfung, intervall_impfung, letzte_impfung_zusatz, contacts(vorname, nachname, email)'
      )
      .ilike('tierart', 'hund')
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    const pets = ((data || []) as PetWithCustomer[]).map((pet) => ({
      ...pet,
      customerName: [pet.contacts?.vorname, pet.contacts?.nachname].filter(Boolean).join(' ').trim(),
      customerEmail: pet.contacts?.email ?? null,
    }))

    const result = getUpcomingVaccinationRows(pets, { days, status, type })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching upcoming vaccinations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Laden der Impfungen' },
      { status: 500 }
    )
  }
}
