import { getAdminDbClient } from '@/lib/admin-auth'
import type { SevdeskContact, SevdeskPart, SevdeskSettings } from '@/lib/types'

const SEVDESK_API_BASE = 'https://my.sevdesk.de/api/v1'

export async function getSevdeskApiKey(): Promise<string | null> {
  const db = getAdminDbClient()
  const { data, error } = await db.rpc('sevdesk_get_api_key')

  if (error) {
    throw new Error(error.message || 'SevDesk API-Key konnte nicht geladen werden')
  }

  return typeof data === 'string' && data.length > 0 ? data : null
}

export async function setSevdeskApiKey(apiKey: string, adminUserId: string): Promise<void> {
  const trimmed = apiKey.trim()
  if (trimmed.length < 8) {
    throw new Error('Der API-Key ist zu kurz')
  }

  const db = getAdminDbClient()
  const { error } = await db.rpc('sevdesk_set_api_key', {
    p_key: trimmed,
    p_admin_id: adminUserId,
  })

  if (error) {
    throw new Error(error.message || 'SevDesk API-Key konnte nicht gespeichert werden')
  }
}

export async function clearSevdeskApiKey(): Promise<void> {
  const db = getAdminDbClient()
  const { error } = await db.rpc('sevdesk_clear_api_key')

  if (error) {
    throw new Error(error.message || 'SevDesk-Verbindung konnte nicht getrennt werden')
  }
}

export async function getSevdeskSettings(): Promise<SevdeskSettings | null> {
  const db = getAdminDbClient()
  const { data, error } = await db
    .from('sevdesk_settings')
    .select('*')
    .eq('id', 'sevdesk')
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'SevDesk-Einstellungen konnten nicht geladen werden')
  }

  return data as SevdeskSettings | null
}

export async function updateSevdeskTestResult(
  ok: boolean,
  errorMessage: string | null
): Promise<SevdeskSettings | null> {
  const db = getAdminDbClient()
  const { data, error } = await db
    .from('sevdesk_settings')
    .update({
      last_tested_at: new Date().toISOString(),
      last_test_ok: ok,
      last_test_error: ok ? null : errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'sevdesk')
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Testergebnis konnte nicht gespeichert werden')
  }

  return data as SevdeskSettings | null
}

interface SevdeskApiEnvelope<T> {
  objects?: T[]
  error?: { message?: string }
}

async function sevdeskRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const apiKey = await getSevdeskApiKey()
  if (!apiKey) {
    throw new Error('Kein SevDesk API-Key hinterlegt')
  }

  const url = path.startsWith('http') ? path : `${SEVDESK_API_BASE}${path}`
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: apiKey,
      ...init.headers,
    },
  })

  const bodyText = await response.text()
  let parsed: unknown = null
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    const message =
      (parsed as SevdeskApiEnvelope<unknown>)?.error?.message ||
      bodyText ||
      `SevDesk API Fehler (${response.status})`
    throw new Error(message)
  }

  return parsed as T
}

export async function testSevdeskConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await sevdeskRequest<SevdeskApiEnvelope<unknown>>('/Contact?limit=1')
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }
  }
}

function mapSevdeskContact(raw: Record<string, unknown>): SevdeskContact {
  const category = raw.category as SevdeskContact['category']
  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : null,
    surename: typeof raw.surename === 'string' ? raw.surename : null,
    customerNumber:
      typeof raw.customerNumber === 'string' ? raw.customerNumber : null,
    category: category ?? null,
  }
}

function mapSevdeskPart(raw: Record<string, unknown>): SevdeskPart {
  const priceRaw = raw.price
  const taxRaw = raw.taxRate
  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : null,
    partNumber: typeof raw.partNumber === 'string' ? raw.partNumber : null,
    price:
      typeof priceRaw === 'number'
        ? priceRaw
        : typeof priceRaw === 'string'
          ? Number.parseFloat(priceRaw)
          : null,
    taxRate:
      typeof taxRaw === 'number'
        ? taxRaw
        : typeof taxRaw === 'string'
          ? Number.parseFloat(taxRaw)
          : null,
  }
}

export async function listSevdeskContacts(limit = 50): Promise<SevdeskContact[]> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/Contact?limit=${limit}`
  )
  return (data.objects ?? []).map(mapSevdeskContact)
}

export async function listSevdeskParts(limit = 50): Promise<SevdeskPart[]> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/Part?limit=${limit}`
  )
  return (data.objects ?? []).map(mapSevdeskPart)
}
