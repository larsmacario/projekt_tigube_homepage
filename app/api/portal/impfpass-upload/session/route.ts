import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerClient } from '@/lib/admin-auth'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  CUSTOMER_DOCUMENT_SIGNED_URL_TTL,
} from '@/lib/customer-documents'
import {
  IMPFPASS_UPLOAD_SESSION_TTL_MS,
  assertImpfpassUploadCapacity,
  buildImpfpassSessionStoragePath,
  createImpfpassDocumentFromSessionItem,
  isImpfpassUploadSessionExpired,
  normalizeImpfpassUploadDescription,
  type ImpfpassUploadSession,
  type ImpfpassUploadSessionItem,
} from '@/lib/impfpass-upload-session'
import {
  DEFAULT_IMPFASS_PAGE_CATEGORY,
  isImpfpassPageCategory,
  normalizeImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'
import { getPortalCustomer } from '@/lib/portal-customer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function attachSignedUrlsToItems(
  items: ImpfpassUploadSessionItem[]
): Promise<ImpfpassUploadSessionItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.mime_type?.startsWith('image/')) return item
      const { data, error } = await serviceSupabase.storage
        .from(CUSTOMER_DOCUMENTS_BUCKET)
        .createSignedUrl(item.file_path, CUSTOMER_DOCUMENT_SIGNED_URL_TTL)
      if (error || !data?.signedUrl) return item
      return { ...item, signedUrl: data.signedUrl }
    })
  )
}

async function loadSessionWithItems(sessionId: string) {
  const { data: session, error: sessionError } = await serviceSupabase
    .from('impfpass_upload_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return { error: 'Upload-Session nicht gefunden', status: 404 as const }
  }

  if (session.status === 'active' && isImpfpassUploadSessionExpired(session.expires_at)) {
    await serviceSupabase
      .from('impfpass_upload_sessions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
    session.status = 'expired'
  }

  const { data: items, error: itemsError } = await serviceSupabase
    .from('impfpass_upload_session_items')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (itemsError) throw itemsError

  const itemsWithUrls = await attachSignedUrlsToItems((items || []) as ImpfpassUploadSessionItem[])

  return {
    session: { ...(session as ImpfpassUploadSession), items: itemsWithUrls },
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get('id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Session-ID ist erforderlich' }, { status: 400 })
    }

    const result = await loadSessionWithItems(sessionId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { client: supabase, accessToken } = await getServerClient(request)
    if (accessToken) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const customerResult = await getPortalCustomer(supabase, user.id)
        if (!('error' in customerResult) && customerResult.customer.id !== result.session.customer_id) {
          return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
        }
      }
    }

    return NextResponse.json({ session: result.session })
  } catch (error: unknown) {
    console.error('Error fetching impfpass upload session:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

    const customerResult = await getPortalCustomer(supabase, user.id)
    if ('error' in customerResult && 'status' in customerResult) {
      return NextResponse.json({ error: customerResult.error }, { status: customerResult.status })
    }

    const body = await request.json().catch(() => ({}))
    const petId = typeof body.pet_id === 'string' ? body.pet_id : null

    if (petId) {
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id')
        .eq('id', petId)
        .eq('customer_id', customerResult.customer.id)
        .maybeSingle()

      if (petError) throw petError
      if (!pet) {
        return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
      }
    }

    const expiresAt = new Date(Date.now() + IMPFPASS_UPLOAD_SESSION_TTL_MS).toISOString()

    const { data, error } = await serviceSupabase
      .from('impfpass_upload_sessions')
      .insert({
        customer_id: customerResult.customer.id,
        pet_id: petId,
        status: 'active',
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session: data })
  } catch (error: unknown) {
    console.error('Error creating impfpass upload session:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Erstellen der Session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const sessionId = typeof body.session_id === 'string' ? body.session_id : ''
    const petId = typeof body.pet_id === 'string' ? body.pet_id : ''

    if (!sessionId || !petId) {
      return NextResponse.json({ error: 'Session-ID und Tier-ID sind erforderlich' }, { status: 400 })
    }

    const customerResult = await getPortalCustomer(supabase, user.id)
    if ('error' in customerResult && 'status' in customerResult) {
      return NextResponse.json({ error: customerResult.error }, { status: customerResult.status })
    }

    const { data: session, error: sessionError } = await serviceSupabase
      .from('impfpass_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Upload-Session nicht gefunden' }, { status: 404 })
    }

    if (session.customer_id !== customerResult.customer.id) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', petId)
      .eq('customer_id', customerResult.customer.id)
      .maybeSingle()

    if (petError) throw petError
    if (!pet) {
      return NextResponse.json({ error: 'Tier nicht gefunden' }, { status: 404 })
    }

    const { data: pendingItems, error: itemsError } = await serviceSupabase
      .from('impfpass_upload_session_items')
      .select('*')
      .eq('session_id', sessionId)
      .is('document_id', null)

    if (itemsError) throw itemsError

    const createdDocuments = []

    for (const item of pendingItems || []) {
      await assertImpfpassUploadCapacity(serviceSupabase, petId, sessionId)
      const document = await createImpfpassDocumentFromSessionItem({
        supabase: serviceSupabase,
        customerId: session.customer_id,
        petId,
        item: item as ImpfpassUploadSessionItem,
      })

      await serviceSupabase
        .from('impfpass_upload_session_items')
        .update({ document_id: document.id })
        .eq('id', item.id)

      const { data: fullDocument } = await serviceSupabase
        .from('documents')
        .select('*')
        .eq('id', document.id)
        .single()

      if (fullDocument) createdDocuments.push(fullDocument)
    }

    await serviceSupabase
      .from('impfpass_upload_sessions')
      .update({
        pet_id: petId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json({ documents: createdDocuments })
  } catch (error: unknown) {
    console.error('Error linking impfpass upload session:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Verknüpfen der Session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
