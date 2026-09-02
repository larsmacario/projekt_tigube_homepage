import {
  ALLOWED_CUSTOMER_DOCUMENT_TYPES,
  type CustomerDocumentType,
} from '@/lib/customer-documents'
import {
  DEFAULT_IMPFASS_PAGE_CATEGORY,
  isImpfpassPageCategory,
  normalizeImpfpassPageCategory,
} from '@/lib/impfpass-photo-categories'
import type { Document } from '@/lib/types'

export type DocumentMetadataPatchInput = {
  document_type?: string
  pet_id?: string | null
  description?: string
  page_category?: string | null
}

export type ExistingDocumentForUpdate = Pick<
  Document,
  'id' | 'document_type' | 'pet_id' | 'description' | 'page_category' | 'customer_id'
>

export type DocumentMetadataUpdateResult =
  | {
      ok: true
      updates: Record<string, string | null>
      checkImpfpassLimitPetId?: string
    }
  | {
      ok: false
      error: string
      status: number
    }

export function parseDocumentMetadataPatchBody(body: unknown): DocumentMetadataPatchInput {
  if (!body || typeof body !== 'object') {
    return {}
  }

  const record = body as Record<string, unknown>
  const input: DocumentMetadataPatchInput = {}

  if (typeof record.document_type === 'string') {
    input.document_type = record.document_type
  }
  if (record.pet_id === null || typeof record.pet_id === 'string') {
    input.pet_id = record.pet_id as string | null
  }
  if (typeof record.description === 'string') {
    input.description = record.description
  }
  if (record.page_category === null || typeof record.page_category === 'string') {
    input.page_category = record.page_category as string | null
  }

  return input
}

function normalizeDescription(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 500) : null
}

export function buildDocumentMetadataUpdates(
  current: ExistingDocumentForUpdate,
  input: DocumentMetadataPatchInput
): DocumentMetadataUpdateResult {
  const hasAnyField =
    input.document_type !== undefined ||
    input.pet_id !== undefined ||
    input.description !== undefined ||
    input.page_category !== undefined

  if (!hasAnyField) {
    return { ok: false, error: 'Keine Änderungen angegeben', status: 400 }
  }

  const targetType = (input.document_type ?? current.document_type) as CustomerDocumentType

  if (!ALLOWED_CUSTOMER_DOCUMENT_TYPES.includes(targetType)) {
    return { ok: false, error: 'Ungültiger Dokumenttyp', status: 400 }
  }

  if (
    input.page_category !== undefined &&
    input.page_category !== null &&
    !isImpfpassPageCategory(input.page_category)
  ) {
    return { ok: false, error: 'Ungültige Impfpass-Kategorie', status: 400 }
  }

  const requiresPet = targetType === 'impfpass' || targetType === 'wurmtest'
  let targetPetId: string | null = null

  if (targetType === 'vertrag') {
    targetPetId = null
  } else if (input.pet_id !== undefined) {
    targetPetId = input.pet_id
  } else {
    targetPetId = current.pet_id
  }

  if (requiresPet && !targetPetId) {
    return {
      ok: false,
      error: 'Dieses Dokument muss einem Tier zugeordnet werden.',
      status: 400,
    }
  }

  let targetPageCategory: string | null = null
  if (targetType === 'impfpass') {
    if (input.page_category !== undefined) {
      targetPageCategory = input.page_category
        ? normalizeImpfpassPageCategory(input.page_category)
        : DEFAULT_IMPFASS_PAGE_CATEGORY
    } else if (current.document_type === 'impfpass') {
      targetPageCategory = current.page_category ?? DEFAULT_IMPFASS_PAGE_CATEGORY
    } else {
      targetPageCategory = DEFAULT_IMPFASS_PAGE_CATEGORY
    }
  }

  const targetDescription =
    input.description !== undefined
      ? normalizeDescription(input.description)
      : current.description

  const updates: Record<string, string | null> = {}

  if (targetType !== current.document_type) {
    updates.document_type = targetType
  }
  if (targetPetId !== current.pet_id) {
    updates.pet_id = targetPetId
  }
  if (targetPageCategory !== current.page_category) {
    updates.page_category = targetPageCategory
  }
  if (targetDescription !== current.description) {
    updates.description = targetDescription
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'Keine Änderungen angegeben', status: 400 }
  }

  const switchingToImpfpass = targetType === 'impfpass' && current.document_type !== 'impfpass'
  const impfpassPetChanged =
    targetType === 'impfpass' &&
    current.document_type === 'impfpass' &&
    targetPetId !== current.pet_id

  const checkImpfpassLimitPetId =
    switchingToImpfpass || impfpassPetChanged ? targetPetId ?? undefined : undefined

  return {
    ok: true,
    updates,
    checkImpfpassLimitPetId,
  }
}
