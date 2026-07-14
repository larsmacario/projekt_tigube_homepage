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
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const supabase = getWritableDbClient(adminCheck.client)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
    const filePath = `cms/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('cms-assets')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('cms-assets')
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: any) {
    console.error('Error uploading image to CMS storage:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
