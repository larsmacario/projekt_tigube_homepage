import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const unseenOnly = new URL(request.url).searchParams.get('unseen') === 'true'

    let query = auth.client
      .from('pet_care_plan_changes')
      .select(
        `
        id,
        pet_id,
        customer_id,
        changed_at,
        changed_by,
        summary,
        seen_at,
        pets:pet_id ( id, name ),
        contacts:customer_id ( id, vorname, nachname, email )
      `
      )
      .order('changed_at', { ascending: false })
      .limit(100)

    if (unseenOnly) {
      query = query.is('seen_at', null)
    }

    const { data, error } = await query
    if (error) throw error

    const changes = (data || []).map((row) => {
      const pets = row.pets as { id: string; name: string } | { id: string; name: string }[] | null
      const contacts = row.contacts as
        | { id: string; vorname: string | null; nachname: string | null; email: string | null }
        | Array<{ id: string; vorname: string | null; nachname: string | null; email: string | null }>
        | null

      return {
        id: row.id,
        pet_id: row.pet_id,
        customer_id: row.customer_id,
        changed_at: row.changed_at,
        changed_by: row.changed_by,
        summary: row.summary,
        seen_at: row.seen_at,
        pet: Array.isArray(pets) ? pets[0] ?? null : pets,
        customer: Array.isArray(contacts) ? contacts[0] ?? null : contacts,
      }
    })

    return NextResponse.json({ changes })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Interner Serverfehler'
    console.error('Error fetching care plan changes:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
