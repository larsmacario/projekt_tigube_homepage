import { supabase } from './supabase'

export async function getCMSContent(key: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('cms_content')
      .select('data')
      .eq('key', key)
      .single()

    if (error || !data) {
      return null
    }

    return data.data
  } catch (err) {
    console.error(`Error querying CMS key "${key}":`, err)
    return null
  }
}
