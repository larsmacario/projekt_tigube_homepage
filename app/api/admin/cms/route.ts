import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, getAdminDbClient } from '@/lib/admin-auth'
import { revalidateCMSPaths } from '@/lib/cms-revalidate'

function getWritableDbClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return getAdminDbClient()
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const supabase = getWritableDbClient(adminCheck.client)

    const { data, error } = await supabase
      .from('cms_content')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const contentMap = (data || []).reduce((acc: Record<string, unknown>, row: { key: string; data: unknown }) => {
      acc[row.key] = row.data
      return acc
    }, {})

    return NextResponse.json({ data: contentMap })
  } catch (error: any) {
    console.error('Error fetching admin CMS content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const { key, data } = await request.json()

    if (!key || data === undefined || data === null) {
      return NextResponse.json({ error: 'Key und Daten sind erforderlich' }, { status: 400 })
    }

    const supabase = getWritableDbClient(adminCheck.client)

    const { data: updated, error } = await supabase
      .from('cms_content')
      .upsert(
        {
          key,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select()
      .single()

    if (error) {
      console.error('CMS upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidateCMSPaths(key)

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating admin CMS content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
