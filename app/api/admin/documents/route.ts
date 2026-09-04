import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
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
  } catch (error: unknown) {
    console.error('Error fetching admin documents:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Dokumente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type JsonAdminDocumentUploadBody = {
  customer_id?: string
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
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body = (await request.json()) as JsonAdminDocumentUploadBody
      const customerId = body.customer_id
      const documentType = body.document_type

      if (
        !customerId ||
        !body.file_path ||
        !body.file_name ||
        typeof body.file_size !== 'number' ||
        !body.mime_type ||
        !documentType
      ) {
        return NextResponse.json(
          { error: 'Dateimetadaten, Dokumenttyp und customer_id sind erforderlich' },
          { status: 400 }
        )
      }

      if (
        !ALLOWED_CUSTOMER_DOCUMENT_TYPES.includes(documentType as CustomerDocumentType)
      ) {
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

      const result = await registerCustomerDocument(auth.client, {
        customerId,
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
    const file = formData.get('file') as File | null
    const documentType = formData.get('document_type') as string | null
    const customerId = formData.get('customer_id') as string | null
    const petId = formData.get('pet_id') as string | null
    const pageCategoryRaw = formData.get('page_category') as string | null
    const descriptionRaw = formData.get('description') as string | null

    if (!file || !documentType || !customerId) {
      return NextResponse.json(
        { error: 'Datei, Dokumenttyp und customer_id sind erforderlich' },
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

    const fileExt = getCustomerDocumentFileExtension(file.name)
    const filePath = buildCustomerDocumentStoragePath(customerId, documentType, fileExt, petId)
    const mimeType = getCustomerDocumentUploadMimeType(file)

    const { error: uploadError } = await auth.client.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .upload(filePath, file, { contentType: mimeType, upsert: false })

    if (uploadError) {
      return NextResponse.json(
        { error: formatCustomerDocumentStorageError(uploadError.message) },
        { status: 400 }
      )
    }

    const result = await registerCustomerDocument(auth.client, {
      customerId,
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
      await auth.client.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([filePath])
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ document: result.document })
  } catch (error: unknown) {
    console.error('Error uploading admin document:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Hochladen des Dokuments'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
