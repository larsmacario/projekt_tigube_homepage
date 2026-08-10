import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CUSTOMER_DOCUMENTS_BUCKET } from '@/lib/customer-documents'
import {
  assertImpfpassUploadCapacity,
  buildImpfpassSessionStoragePath,
  createImpfpassDocumentFromSessionItem,
  isImpfpassUploadSessionExpired,
  normalizeImpfpassUploadDescription,
  type ImpfpassUploadSessionItem,
} from '@/lib/impfpass-upload-session'
import {
  isImpfpassPageCategory,
  normalizeImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const sessionId = formData.get('session_id') as string | null
    const file = formData.get('file') as File | null
    const pageCategoryRaw = formData.get('page_category') as string | null
    const descriptionRaw = formData.get('description') as string | null

    if (!sessionId || !file) {
      return NextResponse.json({ error: 'Session-ID und Datei sind erforderlich' }, { status: 400 })
    }

    if (pageCategoryRaw && !isImpfpassPageCategory(pageCategoryRaw)) {
      return NextResponse.json({ error: 'Ungültige Impfpass-Kategorie' }, { status: 400 })
    }

    const { data: session, error: sessionError } = await serviceSupabase
      .from('impfpass_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Upload-Session nicht gefunden' }, { status: 404 })
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Diese Upload-Session ist nicht mehr aktiv' }, { status: 400 })
    }

    if (isImpfpassUploadSessionExpired(session.expires_at)) {
      await serviceSupabase
        .from('impfpass_upload_sessions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
      return NextResponse.json({ error: 'Diese Upload-Session ist abgelaufen' }, { status: 400 })
    }

    await assertImpfpassUploadCapacity(serviceSupabase, session.pet_id, sessionId)

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = buildImpfpassSessionStoragePath(session.customer_id, sessionId, fileExt)
    const pageCategory = normalizeImpfpassPageCategory(pageCategoryRaw)
    const description = normalizeImpfpassUploadDescription(descriptionRaw)

    const { error: uploadError } = await serviceSupabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) throw uploadError

    const { data: item, error: itemError } = await serviceSupabase
      .from('impfpass_upload_session_items')
      .insert({
        session_id: sessionId,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        page_category: pageCategory,
        description,
      })
      .select()
      .single()

    if (itemError) {
      await serviceSupabase.storage.from(CUSTOMER_DOCUMENTS_BUCKET).remove([filePath])
      throw itemError
    }

    let document = null

    if (session.pet_id) {
      const created = await createImpfpassDocumentFromSessionItem({
        supabase: serviceSupabase,
        customerId: session.customer_id,
        petId: session.pet_id,
        item: item as ImpfpassUploadSessionItem,
      })

      await serviceSupabase
        .from('impfpass_upload_session_items')
        .update({ document_id: created.id })
        .eq('id', item.id)

      const { data: fullDocument } = await serviceSupabase
        .from('documents')
        .select('*')
        .eq('id', created.id)
        .single()

      document = fullDocument
    }

    return NextResponse.json({ item, document })
  } catch (error: unknown) {
    console.error('Error uploading impfpass via session:', error)
    const message = error instanceof Error ? error.message : 'Upload fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
