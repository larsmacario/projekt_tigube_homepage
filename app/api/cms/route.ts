import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      const { data, error } = await supabase
        .from('cms_content')
        .select('*')
        .eq('key', key)
        .single()

      if (error) {
        return NextResponse.json({ data: null })
      }
      return NextResponse.json({ data: data.data })
    }

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
    console.error('Error fetching CMS content:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
