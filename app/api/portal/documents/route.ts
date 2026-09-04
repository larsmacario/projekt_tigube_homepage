import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import { registerCustomerDocument } from '@/lib/customer-document-register'
import {
  ALLOWED_CUSTOMER_DOCUMENT_TYPES,
  buildCustomerDocumentStoragePath,
  CUSTOMER_DOCUMENTS_BUCKET,
  formatCustomerDocumentStorageError,
  getCustomerDocumentFileExtension,
  getCustomerDocumentUploadMimeType,
  type CustomerDocumentType,
  validateCustomerDocumentFile,
} from '@/lib/customer-documents'

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

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
  } catch (error: unknown) {
    console.error('Error fetching documents:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Dokumente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type JsonDocumentUploadBody = {
  file_path?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  document_type?: string
  pet_id?: string | null
  page_category?: string | null
  description?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, accessToken } = await getServerClient(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: customer } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('contact_type', 'customer')
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Kundenprofil nicht gefunden' }, { status: 404 })
    }

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as JsonDocumentUploadBody
      const documentType = body.document_type

      if (
        !body.file_path ||
        !body.file_name ||
        typeof body.file_size !== 'number' ||
        !body.mime_type ||
        !documentType
      ) {
        return NextResponse.json(
          { error: 'Dateimetadaten und Dokumenttyp sind erforderlich' },
          { status: 400 }
        )
      }

      if (
        !ALLOWED_CUSTOMER_DOCUMENT_TYPES.includes(documentType as CustomerDocumentType)
      ) {
        return NextResponse.json({ error: 'Ungültiger Dokumenttyp' }, { status: 400 })
      }

      const result = await registerCustomerDocument(supabase, {
        customerId: customer.id,
        documentType: documentType as CustomerDocumentType,
        filePath: body.file_path,
        fileName: body.file_name,
        fileSize: body.file_size,
        mimeType: body.mime_type,
        petId: body.pet_id ?? null,
        pageCategory: body.page_category ?? null,
        description: body.description ?? null,
      })

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }

      return NextResponse.json({ document: result.document })
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

    const validationError = validateCustomerDocumentFile(file)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (
      !ALLOWED_CUSTOMER_DOCUMENT_TYPES.includes(documentType as CustomerDocumentType)
    ) {
      return NextResponse.json({ error: 'Ungültiger Dokumenttyp' }, { status: 400 })
    }

    const fileExt = getCustomerDocumentFileExtension(file.name)
    const filePath = buildCustomerDocumentStoragePath(
      customer.id,
      documentType,
      fileExt,
      petId
    )
    const mimeType = getCustomerDocumentUploadMimeType(file)

    const { error: uploadError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .upload(filePath, file, { contentType: mimeType, upsert: false })

    if (uploadError) {
      return NextResponse.json(
        { error: formatCustomerDocumentStorageError(uploadError.message) },
        { status: 400 }
      )
    }

    const result = await registerCustomerDocument(supabase, {
      customerId: customer.id,
      documentType: documentType as CustomerDocumentType,
      filePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      petId,
      pageCategory: pageCategoryRaw,
      description: descriptionRaw,
    })

    if ('error' in result) {
      await supabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([filePath])
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ document: result.document })
  } catch (error: unknown) {
    console.error('Error uploading document:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Hochladen des Dokuments'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
