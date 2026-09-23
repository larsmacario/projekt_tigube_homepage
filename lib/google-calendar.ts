import { createHash, randomBytes } from 'crypto'
import { getAdminDbClient } from '@/lib/admin-auth'
import {
  busyIntervalsToBlockedIsoDates,
  isoDateRangeEndExclusive,
  type BusyInterval,
} from '@/lib/google-calendar-busy'
import type { GoogleCalendarSettings } from '@/lib/types'
import { toIsoDate } from '@/lib/vacation-dates'

export const GOOGLE_CALENDAR_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly'

export const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = 'google_calendar_oauth_state'

const FREE_BUSY_CACHE_MS = 8 * 60 * 1000

interface FreeBusyCacheEntry {
  fromDate: string
  toDate: string
  calendarId: string
  blockedDates: string[]
  fetchedAt: number
}

let freeBusyCache: FreeBusyCacheEntry | null = null

export function getGoogleCalendarRedirectUri(siteUrl?: string): string {
  const base =
    siteUrl?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  return `${base}/api/admin/integrations/google-calendar/oauth/callback`
}

export function createGoogleOAuthState(adminUserId: string): string {
  const nonce = randomBytes(16).toString('hex')
  const payload = `${adminUserId}:${nonce}:${Date.now()}`
  const sig = createHash('sha256')
    .update(`${payload}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-state-secret'}`)
    .digest('hex')
    .slice(0, 16)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyGoogleOAuthState(state: string): { adminUserId: string } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    const lastColon = decoded.lastIndexOf(':')
    if (lastColon <= 0) return null
    const sig = decoded.slice(lastColon + 1)
    const payload = decoded.slice(0, lastColon)
    const expectedSig = createHash('sha256')
      .update(`${payload}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-state-secret'}`)
      .digest('hex')
      .slice(0, 16)
    if (sig !== expectedSig) return null

    const [adminUserId, , timestampStr] = payload.split(':')
    const timestamp = Number.parseInt(timestampStr, 10)
    if (!adminUserId || Number.isNaN(timestamp)) return null
    if (Date.now() - timestamp > 15 * 60 * 1000) return null

    return { adminUserId }
  } catch {
    return null
  }
}

export async function getGoogleCalendarSettings(): Promise<GoogleCalendarSettings | null> {
  const db = getAdminDbClient()
  const { data, error } = await db
    .from('google_calendar_settings')
    .select('*')
    .eq('id', 'google_calendar')
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Google-Kalender-Einstellungen konnten nicht geladen werden')
  }

  return data as GoogleCalendarSettings | null
}

export async function setGoogleOAuthCredentials(
  clientId: string,
  clientSecret: string,
  adminUserId: string
): Promise<void> {
  const db = getAdminDbClient()
  const { error } = await db.rpc('google_calendar_set_oauth_credentials', {
    p_client_id: clientId.trim(),
    p_client_secret: clientSecret.trim(),
    p_admin_id: adminUserId,
  })

  if (error) {
    throw new Error(error.message || 'OAuth-Daten konnten nicht gespeichert werden')
  }
}

export async function setGoogleRefreshToken(refreshToken: string, adminUserId: string): Promise<void> {
  const db = getAdminDbClient()
  const { error } = await db.rpc('google_calendar_set_refresh_token', {
    p_refresh_token: refreshToken.trim(),
    p_admin_id: adminUserId,
  })

  if (error) {
    throw new Error(error.message || 'Google-Verbindung konnte nicht gespeichert werden')
  }
}

export async function clearGoogleCalendarConnection(): Promise<void> {
  const db = getAdminDbClient()
  freeBusyCache = null
  const { error } = await db.rpc('google_calendar_clear_connection')
  if (error) {
    throw new Error(error.message || 'Google-Verbindung konnte nicht getrennt werden')
  }
}

async function getOAuthClientSecret(): Promise<string | null> {
  const db = getAdminDbClient()
  const { data, error } = await db.rpc('google_calendar_get_oauth_client_secret')
  if (error) {
    throw new Error(error.message || 'OAuth-Geheimnis konnte nicht geladen werden')
  }
  return typeof data === 'string' && data.length > 0 ? data : null
}

async function getRefreshToken(): Promise<string | null> {
  const db = getAdminDbClient()
  const { data, error } = await db.rpc('google_calendar_get_refresh_token')
  if (error) {
    throw new Error(error.message || 'Refresh Token konnte nicht geladen werden')
  }
  return typeof data === 'string' && data.length > 0 ? data : null
}

export function buildGoogleAuthorizationUrl(clientId: string, state: string, redirectUri: string): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_CALENDAR_READONLY_SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string | null; accessToken: string }> {
  const settings = await getGoogleCalendarSettings()
  if (!settings?.client_id) {
    throw new Error('OAuth ist nicht konfiguriert')
  }

  const clientSecret = await getOAuthClientSecret()
  if (!clientSecret) {
    throw new Error('OAuth-Geheimnis fehlt')
  }

  const body = new URLSearchParams({
    code,
    client_id: settings.client_id,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token-Austausch fehlgeschlagen')
  }

  return {
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
    accessToken: data.access_token as string,
  }
}

export async function getGoogleAccessToken(): Promise<string> {
  const settings = await getGoogleCalendarSettings()
  if (!settings?.client_id) {
    throw new Error('OAuth ist nicht konfiguriert')
  }

  const clientSecret = await getOAuthClientSecret()
  const refreshToken = await getRefreshToken()
  if (!clientSecret || !refreshToken) {
    throw new Error('Google-Konto ist nicht verbunden')
  }

  const body = new URLSearchParams({
    client_id: settings.client_id,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Access Token konnte nicht aktualisiert werden')
  }

  if (typeof data.access_token !== 'string') {
    throw new Error('Ungültige Token-Antwort von Google')
  }

  return data.access_token
}

export interface GoogleCalendarListEntry {
  id: string
  summary: string
  primary?: boolean
}

export async function listGoogleCalendars(): Promise<GoogleCalendarListEntry[]> {
  const accessToken = await getGoogleAccessToken()
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Kalenderliste konnte nicht geladen werden')
  }

  const items = Array.isArray(data.items) ? data.items : []
  return items
    .map((item: { id?: string; summary?: string; primary?: boolean }) => ({
      id: item.id ?? '',
      summary: item.summary ?? item.id ?? 'Kalender',
      primary: item.primary === true,
    }))
    .filter((entry: GoogleCalendarListEntry) => entry.id.length > 0)
}

export async function updateGoogleCalendarSettings(
  patch: Partial<
    Pick<GoogleCalendarSettings, 'calendar_id' | 'calendar_summary' | 'blocking_enabled' | 'timezone'>
  >
): Promise<GoogleCalendarSettings | null> {
  const db = getAdminDbClient()
  const { data, error } = await db
    .from('google_calendar_settings')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'google_calendar')
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Einstellungen konnten nicht gespeichert werden')
  }

  freeBusyCache = null
  return data as GoogleCalendarSettings | null
}

export async function recordGoogleFreeBusyResult(ok: boolean, errorMessage: string | null): Promise<void> {
  const db = getAdminDbClient()
  await db
    .from('google_calendar_settings')
    .update({
      last_freebusy_at: new Date().toISOString(),
      last_freebusy_ok: ok,
      last_freebusy_error: ok ? null : errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'google_calendar')
}

async function fetchBusyIntervals(
  calendarId: string,
  timeMin: string,
  timeMax: string,
  timeZone: string
): Promise<BusyInterval[]> {
  const accessToken = await getGoogleAccessToken()
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone,
      items: [{ id: calendarId }],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'FreeBusy-Abfrage fehlgeschlagen')
  }

  const calendars = data.calendars ?? {}
  const entry = calendars[calendarId]
  const busy = Array.isArray(entry?.busy) ? entry.busy : []
  return busy.map((slot: { start?: string; end?: string }) => ({
    start: slot.start ?? '',
    end: slot.end ?? '',
  }))
}

function cacheCoversRange(fromDate: string, toDate: string, calendarId: string): boolean {
  if (!freeBusyCache) return false
  if (freeBusyCache.calendarId !== calendarId) return false
  if (Date.now() - freeBusyCache.fetchedAt > FREE_BUSY_CACHE_MS) return false
  return fromDate >= freeBusyCache.fromDate && toDate <= freeBusyCache.toDate
}

export async function getGoogleBlockedDatesForRange(
  fromDate: string,
  toDate: string
): Promise<string[]> {
  const settings = await getGoogleCalendarSettings()
  if (
    !settings?.blocking_enabled ||
    !settings.is_connected ||
    !settings.calendar_id
  ) {
    return []
  }

  const timeZone = settings.timezone || 'Europe/Berlin'
  const calendarId = settings.calendar_id

  if (cacheCoversRange(fromDate, toDate, calendarId) && freeBusyCache) {
    return freeBusyCache.blockedDates.filter((d) => d >= fromDate && d <= toDate)
  }

  try {
    const timeMin = `${fromDate}T00:00:00`
    const endExclusive = isoDateRangeEndExclusive(toDate, 1)
    const timeMax = `${endExclusive}T00:00:00`
    const busyIntervals = await fetchBusyIntervals(calendarId, timeMin, timeMax, timeZone)
    const blockedDates = busyIntervalsToBlockedIsoDates(
      busyIntervals,
      fromDate,
      toDate,
      timeZone
    )

    freeBusyCache = {
      fromDate,
      toDate,
      calendarId,
      blockedDates,
      fetchedAt: Date.now(),
    }

    await recordGoogleFreeBusyResult(true, null)
    return blockedDates
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FreeBusy fehlgeschlagen'
    await recordGoogleFreeBusyResult(false, message)
    return []
  }
}

export async function testGoogleCalendarFreeBusy(
  daysAhead: number = 14
): Promise<{ blockedDates: string[]; fromDate: string; toDate: string }> {
  const settings = await getGoogleCalendarSettings()
  if (!settings?.is_connected || !settings.calendar_id) {
    throw new Error('Google-Kalender ist nicht verbunden oder kein Kalender gewählt')
  }

  freeBusyCache = null
  const fromDate = toIsoDate(new Date())
  const toDate = isoDateRangeEndExclusive(fromDate, daysAhead - 1)
  const blockedDates = await getGoogleBlockedDatesForRange(fromDate, toDate)
  return { blockedDates, fromDate, toDate }
}

export function clearGoogleCalendarFreeBusyCache(): void {
  freeBusyCache = null
}
