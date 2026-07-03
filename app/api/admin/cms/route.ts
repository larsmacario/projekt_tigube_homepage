import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }
    const { client: supabase } = adminCheck

    const { data, error } = await supabase
      .from('cms_content')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const contentMap = (data || []).reduce((acc: any, row: any) => {
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
    const { client: supabase } = adminCheck

    const { key, data } = await request.json()

    if (!key || !data) {
      return NextResponse.json({ error: 'Key und Daten sind erforderlich' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('cms_content')
      .upsert({
        key,
        data,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating admin CMS content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
