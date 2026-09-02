import { getAdminDbClient } from '@/lib/admin-auth'
import type {
  SevdeskContact,
  SevdeskContactDetail,
  SevdeskInvoiceDraftResult,
  SevdeskInvoicePosition,
  SevdeskPart,
  SevdeskSettings,
  SevdeskTag,
} from '@/lib/types'
import { buildSevdeskPartUsageCounts } from '@/lib/sevdesk-part-usage'

const SEVDESK_API_BASE = 'https://my.sevdesk.de/api/v1'
const DEFAULT_PAGE_SIZE = 100
const PERSON_CATEGORY_ID = '1'
const DEFAULT_TAX_RATE = 19

export const SEVDESK_ACTIVE_CUSTOMER_TAG = 'aktiv'

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
  object?: T
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
    familyname: typeof raw.familyname === 'string' ? raw.familyname : null,
    customerNumber:
      typeof raw.customerNumber === 'string' ? raw.customerNumber : null,
    category: category ?? null,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((tag) => ({
          id: String((tag as Record<string, unknown>).id ?? ''),
          name: String((tag as Record<string, unknown>).name ?? ''),
        }))
      : [],
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

function mapSevdeskInvoicePosition(raw: Record<string, unknown>): SevdeskInvoicePosition {
  const partRaw = raw.part as Record<string, unknown> | undefined
  const partId =
    partRaw?.id != null && String(partRaw.id).length > 0 ? String(partRaw.id) : null

  return {
    id: String(raw.id ?? ''),
    partId,
  }
}

function mapSevdeskTag(raw: Record<string, unknown>): SevdeskTag {
  return {
    id: String(raw.id ?? ''),
    name: typeof raw.name === 'string' ? raw.name : '',
  }
}

async function fetchAllPages<T>(
  buildPath: (offset: number, limit: number) => string,
  mapItem: (raw: Record<string, unknown>) => T
): Promise<T[]> {
  const items: T[] = []
  let offset = 0

  while (true) {
    const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
      buildPath(offset, DEFAULT_PAGE_SIZE)
    )
    const batch = (data.objects ?? []).map(mapItem)
    items.push(...batch)
    if (batch.length < DEFAULT_PAGE_SIZE) {
      break
    }
    offset += DEFAULT_PAGE_SIZE
  }

  return items
}

export async function listSevdeskContacts(limit = 50): Promise<SevdeskContact[]> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/Contact?limit=${limit}`
  )
  return (data.objects ?? []).map(mapSevdeskContact)
}

export async function listAllSevdeskContacts(): Promise<SevdeskContact[]> {
  return fetchAllPages(
    (offset, limit) => `/Contact?limit=${limit}&offset=${offset}&depth=1&embed=tags`,
    mapSevdeskContact
  )
}

export async function listSevdeskTags(): Promise<SevdeskTag[]> {
  return fetchAllPages(
    (offset, limit) => `/Tag?limit=${limit}&offset=${offset}`,
    mapSevdeskTag
  )
}

export async function listSevdeskParts(limit = 50): Promise<SevdeskPart[]> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/Part?limit=${limit}`
  )
  return (data.objects ?? []).map(mapSevdeskPart)
}

export async function listAllSevdeskParts(): Promise<SevdeskPart[]> {
  return fetchAllPages(
    (offset, limit) => `/Part?limit=${limit}&offset=${offset}`,
    mapSevdeskPart
  )
}

export async function listAllSevdeskInvoicePositions(): Promise<SevdeskInvoicePosition[]> {
  return fetchAllPages(
    (offset, limit) => `/InvoicePos?limit=${limit}&offset=${offset}`,
    mapSevdeskInvoicePosition
  )
}

export async function fetchSevdeskPartUsageCounts(): Promise<Map<string, number>> {
  const positions = await listAllSevdeskInvoicePositions()
  return buildSevdeskPartUsageCounts(positions)
}

export async function findSevdeskPartByName(name: string): Promise<SevdeskPart | null> {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return null

  const parts = await listAllSevdeskParts()
  return parts.find((part) => (part.name ?? '').trim().toLowerCase() === normalized) ?? null
}

export interface CreateSevdeskPartInput {
  name: string
  partNumber: string
  price: number
  text?: string | null
}

export async function createSevdeskPart(
  input: CreateSevdeskPartInput
): Promise<{ partId: string; partNumber: string }> {
  const payload = {
    name: input.name.trim(),
    partNumber: input.partNumber.trim(),
    price: input.price,
    taxRate: DEFAULT_TAX_RATE,
    stock: 0,
    stockEnabled: false,
    status: '100',
    text: input.text?.trim() || undefined,
    unity: {
      id: '1',
      objectName: 'Unity',
    },
  }

  const created = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>('/Part', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const partRaw = (created.objects ?? [])[0] ?? created.object
  if (!partRaw?.id) {
    throw new Error('SevDesk-Artikel konnte nicht angelegt werden')
  }

  return {
    partId: String(partRaw.id),
    partNumber:
      typeof partRaw.partNumber === 'string'
        ? partRaw.partNumber
        : input.partNumber.trim(),
  }
}

export async function findSevdeskTagByName(name: string): Promise<SevdeskTag | null> {
  const normalized = name.trim().toLowerCase()
  const tags = await listSevdeskTags()
  return tags.find((tag) => tag.name.trim().toLowerCase() === normalized) ?? null
}

export async function getSevdeskContactTags(contactId: string): Promise<SevdeskTag[]> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/Contact/${contactId}/getTags`
  )
  return (data.objects ?? []).map(mapSevdeskTag)
}

export async function contactHasTag(contact: SevdeskContact, tagName: string): Promise<boolean> {
  const normalized = tagName.trim().toLowerCase()
  if (contact.tags?.some((tag) => tag.name.trim().toLowerCase() === normalized)) {
    return true
  }
  const tags = await getSevdeskContactTags(contact.id)
  return tags.some((tag) => tag.name.trim().toLowerCase() === normalized)
}

export async function getSevdeskCommunicationWays(contactId: string): Promise<
  Array<{ type: string; value: string; key?: string | null }>
> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/CommunicationWay?contact[id]=${encodeURIComponent(contactId)}&contact[objectName]=Contact&limit=${DEFAULT_PAGE_SIZE}`
  )
  return (data.objects ?? []).map((raw) => ({
    type: String(raw.type ?? ''),
    value: String(raw.value ?? ''),
    key: typeof raw.key === 'string' ? raw.key : null,
  }))
}

export async function getSevdeskContactAddresses(contactId: string): Promise<
  Array<{
    street: string | null
    zip: string | null
    city: string | null
    category: string | null
  }>
> {
  const data = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    `/ContactAddress?contact[id]=${encodeURIComponent(contactId)}&contact[objectName]=Contact&limit=${DEFAULT_PAGE_SIZE}`
  )
  return (data.objects ?? []).map((raw) => ({
    street: typeof raw.street === 'string' ? raw.street : null,
    zip: typeof raw.zip === 'string' ? raw.zip : null,
    city: typeof raw.city === 'string' ? raw.city : null,
    category: typeof raw.category === 'string' ? raw.category : null,
  }))
}

export async function loadSevdeskContactDetail(
  contact: SevdeskContact
): Promise<SevdeskContactDetail> {
  const [communicationWays, addresses, tags] = await Promise.all([
    getSevdeskCommunicationWays(contact.id),
    getSevdeskContactAddresses(contact.id),
    contact.tags?.length ? Promise.resolve(contact.tags) : getSevdeskContactTags(contact.id),
  ])

  return {
    ...contact,
    tags,
    communicationWays,
    addresses,
  }
}

export async function getNextSevdeskCustomerNumber(): Promise<string> {
  const data = await sevdeskRequest<{ objects?: { nextCustomerNumber?: string | number } }>(
    '/Contact/Factory/getNextCustomerNumber'
  )
  const value = data.objects?.nextCustomerNumber
  if (value == null) {
    throw new Error('SevDesk lieferte keine neue Kundennummer')
  }
  return String(value)
}

export interface CreateSevdeskContactInput {
  vorname: string | null
  nachname: string
  email: string
  telefonnummer?: string | null
  kundennummer?: string | null
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
}

function buildStreetLine(strasse?: string | null, hausnummer?: string | null): string | null {
  const parts = [strasse?.trim(), hausnummer?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

export async function createSevdeskContact(
  input: CreateSevdeskContactInput
): Promise<{ contactId: string; customerNumber: string }> {
  const customerNumber =
    input.kundennummer?.trim() || (await getNextSevdeskCustomerNumber())

  const payload = {
    category: {
      id: PERSON_CATEGORY_ID,
      objectName: 'Category',
    },
    familyname: input.nachname.trim(),
    surename: input.vorname?.trim() || null,
    customerNumber,
    status: '100',
  }

  const created = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    '/Contact/Factory/create',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  const contactRaw = (created.objects ?? [])[0] ?? created.object
  if (!contactRaw || !contactRaw.id) {
    throw new Error('SevDesk-Kontakt konnte nicht angelegt werden')
  }

  const contactId = String(contactRaw.id)

  const email = input.email.trim()
  if (email) {
    await sevdeskRequest('/CommunicationWay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact: { id: contactId, objectName: 'Contact' },
        type: 'EMAIL',
        value: email,
        key: {
          id: '2',
          objectName: 'CommunicationWayKey',
        },
      }),
    })
  }

  const phone = input.telefonnummer?.trim()
  if (phone) {
    await sevdeskRequest('/CommunicationWay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact: { id: contactId, objectName: 'Contact' },
        type: 'PHONE',
        value: phone,
        key: {
          id: '1',
          objectName: 'CommunicationWayKey',
        },
      }),
    })
  }

  const street = buildStreetLine(input.strasse, input.hausnummer)
  if (street || input.plz || input.ort) {
    await sevdeskRequest('/ContactAddress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact: { id: contactId, objectName: 'Contact' },
        street,
        zip: input.plz?.trim() || null,
        city: input.ort?.trim() || null,
        country: {
          id: '1',
          objectName: 'StaticCountry',
        },
        category: {
          id: '47',
          objectName: 'Category',
        },
      }),
    })
  }

  return { contactId, customerNumber }
}

export interface InvoicePositionInput {
  label: string
  description?: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  sevdeskArticleId?: string | null
}

export async function createSevdeskInvoiceDraft(input: {
  contactId: string
  positions: InvoicePositionInput[]
  header?: string
}): Promise<SevdeskInvoiceDraftResult> {
  if (input.positions.length === 0) {
    throw new Error('Rechnung benötigt mindestens eine Position')
  }

  const today = new Date().toISOString().slice(0, 10)
  const invoicePosSave = input.positions.map((position) => {
    const base: Record<string, unknown> = {
      objectName: 'InvoicePos',
      mapAll: true,
      name: position.label,
      text: position.description || undefined,
      quantity: position.quantity,
      price: position.unitPrice,
      taxRate: DEFAULT_TAX_RATE,
      unity: {
        id: '1',
        objectName: 'Unity',
      },
    }

    if (position.sevdeskArticleId) {
      base.part = {
        id: position.sevdeskArticleId,
        objectName: 'Part',
      }
    }

    return base
  })

  const payload = {
    invoice: {
      objectName: 'Invoice',
      mapAll: true,
      contact: {
        id: input.contactId,
        objectName: 'Contact',
      },
      invoiceDate: today,
      status: '100',
      currency: 'EUR',
      taxType: 'default',
      header: input.header || 'Tierbetreuung',
    },
    invoicePosSave,
    invoicePosDelete: null,
  }

  const created = await sevdeskRequest<SevdeskApiEnvelope<Record<string, unknown>>>(
    '/Invoice/Factory/saveInvoice',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  const invoiceRaw = (created.objects ?? [])[0] ?? created.object
  if (!invoiceRaw?.id) {
    throw new Error('SevDesk-Rechnungsentwurf konnte nicht erstellt werden')
  }

  return {
    invoiceId: String(invoiceRaw.id),
    invoiceNumber:
      typeof invoiceRaw.invoiceNumber === 'string' ? invoiceRaw.invoiceNumber : null,
  }
}

export async function updateSevdeskCustomerImportSummary(summary: Record<string, unknown>): Promise<void> {
  const db = getAdminDbClient()
  const { error } = await db
    .from('sevdesk_settings')
    .update({
      last_customer_import_at: new Date().toISOString(),
      last_customer_import_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'sevdesk')

  if (error) {
    throw new Error(error.message || 'Import-Zusammenfassung konnte nicht gespeichert werden')
  }
}

export async function updateSevdeskArticleImportSummary(summary: Record<string, unknown>): Promise<void> {
  const db = getAdminDbClient()
  const { error } = await db
    .from('sevdesk_settings')
    .update({
      last_article_import_at: new Date().toISOString(),
      last_article_import_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'sevdesk')

  if (error) {
    throw new Error(error.message || 'Artikel-Import-Zusammenfassung konnte nicht gespeichert werden')
  }
}
