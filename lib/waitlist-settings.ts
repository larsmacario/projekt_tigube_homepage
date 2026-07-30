import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_WAITLIST_CMS,
  mergeWaitlistCmsContent,
  type SiteSettingsRow,
  type WaitlistCmsContent,
} from '@/lib/waitlist-defaults'

export type PublicWaitlistConfig = {
  waitlistEnabled: boolean
  texts: WaitlistCmsContent
}

export async function getSiteSettings(
  supabase: SupabaseClient
): Promise<SiteSettingsRow | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('id, waitlist_enabled, updated_at')
    .eq('id', 'site')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function isWaitlistEnabled(supabase: SupabaseClient): Promise<boolean> {
  try {
    const settings = await getSiteSettings(supabase)
    return Boolean(settings?.waitlist_enabled)
  } catch (error) {
    console.error('Wartelisten-Einstellung konnte nicht geladen werden:', error)
    return false
  }
}

export async function getWaitlistCmsContent(
  supabase: SupabaseClient
): Promise<WaitlistCmsContent> {
  const { data, error } = await supabase
    .from('cms_content')
    .select('data')
    .eq('key', 'waitlist')
    .maybeSingle()

  if (error) {
    console.error('Wartelisten-CMS konnte nicht geladen werden:', error)
    return DEFAULT_WAITLIST_CMS
  }

  return mergeWaitlistCmsContent(data?.data as Partial<WaitlistCmsContent> | undefined)
}

export async function getPublicWaitlistConfig(
  supabase: SupabaseClient
): Promise<PublicWaitlistConfig> {
  const [settings, texts] = await Promise.all([
    getSiteSettings(supabase),
    getWaitlistCmsContent(supabase),
  ])

  return {
    waitlistEnabled: Boolean(settings?.waitlist_enabled),
    texts,
  }
}
