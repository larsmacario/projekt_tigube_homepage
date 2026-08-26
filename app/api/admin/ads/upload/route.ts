import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'

function getWritableDbClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return getAdminDbClient()
  } catch {
    return fallback
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = getWritableDbClient(auth.client)
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Nur Bilddateien sind erlaubt' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const filePath = `ads/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('cms-assets')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('cms-assets').getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: unknown) {
    console.error('Error uploading ad image:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Bild-Upload'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
