import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const ALLOWED_DOCUMENT_TYPES = ['vertrag', 'impfpass', 'wurmtest'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const customerId = new URL(request.url).searchParams.get('customer_id')
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id ist erforderlich' }, { status: 400 })
    }

    const { data, error } = await auth.client
      .from('documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: data || [] })
  } catch (error: any) {
    console.error('Error fetching admin documents:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Dokumente' },
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('document_type') as string | null
    const customerId = formData.get('customer_id') as string | null
    const petId = formData.get('pet_id') as string | null

    if (!file || !documentType || !customerId) {
      return NextResponse.json(
        { error: 'Datei, Dokumenttyp und customer_id sind erforderlich' },
        { status: 400 }
      )
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
      return NextResponse.json({ error: 'Ungültiger Dokumenttyp' }, { status: 400 })
    }

    const { data: customer, error: customerError } = await auth.client
      .from('contacts')
      .select('id')
      .eq('id', customerId)
      .eq('contact_type', 'customer')
      .maybeSingle()

    if (customerError) throw customerError
    if (!customer) {
      return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${customerId}/${documentType}/${Date.now()}.${fileExt}`
    const filePath = `customer-documents/${fileName}`

    const { error: uploadError } = await auth.client.storage
      .from('customer-documents')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data, error: dbError } = await auth.client
      .from('documents')
      .insert({
        customer_id: customerId,
        pet_id: petId || null,
        document_type: documentType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return NextResponse.json({ document: data })
  } catch (error: any) {
    console.error('Error uploading admin document:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Hochladen des Dokuments' },
      { status: 500 }
    )
  }
}
