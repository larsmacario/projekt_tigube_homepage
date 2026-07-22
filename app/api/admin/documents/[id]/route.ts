import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  CUSTOMER_DOCUMENT_SIGNED_URL_TTL,
  normalizeCustomerDocumentStoragePath,
} from '@/lib/customer-documents'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: document, error: docError } = await auth.client
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (docError) throw docError
    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })
    }

    const storagePath = normalizeCustomerDocumentStoragePath(document.file_path)

    const { data: signedData, error: signedError } = await auth.client.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, CUSTOMER_DOCUMENT_SIGNED_URL_TTL)

    if (signedError || !signedData) {
      throw signedError || new Error('Signed URL konnte nicht erstellt werden')
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl })
  } catch (error: any) {
    console.error('Error generating admin download link:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Abrufen des Download-Links' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: document, error: docError } = await auth.client
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (docError) throw docError
    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })
    }

    const storagePath = normalizeCustomerDocumentStoragePath(document.file_path)

    const { error: storageError } = await auth.client.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .remove([storagePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    const { error: dbError } = await auth.client
      .from('documents')
      .delete()
      .eq('id', params.id)

    if (dbError) throw dbError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting admin document:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Dokuments' },
      { status: 500 }
    )
  }
}
