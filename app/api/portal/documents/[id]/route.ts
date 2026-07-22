import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/admin-auth'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  CUSTOMER_DOCUMENT_SIGNED_URL_TTL,
  normalizeCustomerDocumentStoragePath,
} from '@/lib/customer-documents'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await props.params
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Hole Document-Daten
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, customer:contacts!documents_customer_id_fkey(user_id)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })
    }

    // Prüfe ob Dokument zum User gehört
    if (document.customer.user_id !== user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const storagePath = normalizeCustomerDocumentStoragePath(document.file_path)

    // Erstelle Signed URL für den Download
    const { data: signedData, error: signedError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, CUSTOMER_DOCUMENT_SIGNED_URL_TTL)

    if (signedError || !signedData) {
      throw signedError || new Error('Signed URL konnte nicht erstellt werden')
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl })
  } catch (error: any) {
    console.error('Error generating download link:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Abrufen des Download-Links' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await props.params
    const { client: supabase, accessToken } = await getServerClient(request)
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Hole Document-Daten
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, customer:contacts!documents_customer_id_fkey(user_id)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 })
    }

    // Prüfe ob Dokument zum User gehört
    if (document.customer.user_id !== user.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const storagePath = normalizeCustomerDocumentStoragePath(document.file_path)

    // Lösche aus Storage
    const { error: storageError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .remove([storagePath])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Lösche aus Datenbank
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      throw dbError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen des Dokuments' },
      { status: 500 }
    )
  }
}
