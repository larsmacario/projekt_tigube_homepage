import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// Verwende Service Key, da Smartphone-Clients ggf. nicht eingeloggt sind und Unterschriften schreiben müssen
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Session ID ist erforderlich' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('signature_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Signatur-Session nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json({ session: data })
  } catch (error: any) {
    console.error('Error fetching signature session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { customer_id } = await request.json()

    if (!customer_id) {
      return NextResponse.json({ error: 'Kunden-ID ist erforderlich' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('signature_sessions')
      .insert({
        customer_id,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ session: data })
  } catch (error: any) {
    console.error('Error creating signature session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, signature_data } = await request.json()

    if (!id || !signature_data) {
      return NextResponse.json({ error: 'Session ID und Signaturdaten sind erforderlich' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('signature_sessions')
      .update({
        signature_data,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ session: data })
  } catch (error: any) {
    console.error('Error updating signature session:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
