import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  ALLOWED_CUSTOMER_DOCUMENT_TYPES,
  buildCustomerDocumentStoragePath,
  CUSTOMER_DOCUMENTS_BUCKET,
} from '@/lib/customer-documents'
import {
  DEFAULT_IMPFASS_PAGE_CATEGORY,
  isImpfpassPageCategory,
  MAX_IMPFASS_PHOTOS,
  normalizeImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)
    
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
    const { client: supabase, accessToken } = await getServerClient(request)
    
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
    const pageCategoryRaw = formData.get('page_category') as string | null
    const descriptionRaw = formData.get('description') as string | null

    if (!file || !documentType) {
      return NextResponse.json(
        { error: 'Datei und Dokumenttyp sind erforderlich' },
        { status: 400 }
      )
    }

    const requiresPet = documentType === 'impfpass' || documentType === 'wurmtest'
    if (requiresPet && !petId) {
      return NextResponse.json(
        { error: 'Dieses Dokument muss einem Tier zugeordnet werden.' },
        { status: 400 }
      )
    }

    const descriptionRequired =
      documentType !== 'impfpass' && documentType !== 'vertrag' && documentType !== 'wurmtest'
    if (descriptionRequired && !descriptionRaw?.trim()) {
      return NextResponse.json(
        { error: 'Beschreibung ist erforderlich' },
        { status: 400 }
      )
    }

    if (pageCategoryRaw && !isImpfpassPageCategory(pageCategoryRaw)) {
      return NextResponse.json({ error: 'Ungültige Impfpass-Kategorie' }, { status: 400 })
    }

    if (
      !ALLOWED_CUSTOMER_DOCUMENT_TYPES.includes(
        documentType as (typeof ALLOWED_CUSTOMER_DOCUMENT_TYPES)[number]
      )
    ) {
      return NextResponse.json({ error: 'Ungültiger Dokumenttyp' }, { status: 400 })
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

    if (requiresPet && petId) {
      if (documentType === 'impfpass') {
        const { count, error: countError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('pet_id', petId)
          .eq('document_type', 'impfpass')

        if (countError) throw countError
        if ((count ?? 0) >= MAX_IMPFASS_PHOTOS) {
          return NextResponse.json(
            { error: `Maximal ${MAX_IMPFASS_PHOTOS} Impfpass-Fotos pro Tier erlaubt.` },
            { status: 400 }
          )
        }
      }

      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id')
        .eq('id', petId)
        .eq('customer_id', customer.id)
        .maybeSingle()

      if (petError) throw petError
      if (!pet) {
        return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
      }
    }

    const fileExt = file.name.split('.').pop() || 'bin'
    const filePath = buildCustomerDocumentStoragePath(
      customer.id,
      documentType,
      fileExt,
      petId
    )

    const { error: uploadError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const pageCategory =
      documentType === 'impfpass'
        ? normalizeImpfpassPageCategory(pageCategoryRaw ?? DEFAULT_IMPFASS_PAGE_CATEGORY)
        : null
    const defaultDescription =
      documentType === 'vertrag'
        ? 'Betreuungsvertrag'
        : documentType === 'wurmtest'
        ? 'Wurmtest'
        : null
    const description =
      descriptionRaw?.trim() ? descriptionRaw.trim().slice(0, 500) : defaultDescription

    // Erstelle Datenbank-Eintrag
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        customer_id: customer.id,
        pet_id: petId || null,
        document_type: documentType,
        page_category: pageCategory,
        description,
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
