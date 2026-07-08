import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Supabase Cookie-Namen basierend auf Projekt-URL
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
  const cookieName = `sb-${projectRef}-auth-token`
  
  // Hole Session aus Cookie
  const authCookie = request.cookies.get(cookieName)?.value
  let accessToken: string | undefined

  if (authCookie) {
    try {
      const sessionData = JSON.parse(decodeURIComponent(authCookie))
      accessToken = sessionData.access_token
    } catch (e) {
      accessToken = authCookie
    }
  }

  // Fallback: Versuche aus Authorization Header
  if (!accessToken) {
    const authHeader = request.headers.get('authorization')
    accessToken = authHeader?.replace('Bearer ', '')
  }

  // Fallback: Versuche aus Custom Cookie
  if (!accessToken) {
    accessToken = request.cookies.get('sb-access-token')?.value
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return { client, accessToken }
}

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json({ documents: [] })
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ documents: data || [] })
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Dokumente' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('document_type') as string
    const petId = formData.get('pet_id') as string | null

    if (!file || !documentType) {
      return NextResponse.json(
        { error: 'Datei und Dokumenttyp sind erforderlich' },
        { status: 400 }
      )
    }

    // Hole Customer-ID
    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Kundenprofil nicht gefunden' },
        { status: 404 }
      )
    }

    // Upload zu Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${customer.id}/${documentType}/${Date.now()}.${fileExt}`
    const filePath = `customer-documents/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('customer-documents')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    // Erstelle Datenbank-Eintrag
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        customer_id: customer.id,
        pet_id: petId || null,
        document_type: documentType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({ document: data })
  } catch (error: any) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Hochladen des Dokuments' },
      { status: 500 }
    )
  }
}
