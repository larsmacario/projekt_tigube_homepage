import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_IMPFASS_PHOTOS } from '@/lib/impfpass-photo-categories'
import {
  buildDocumentMetadataUpdates,
  parseDocumentMetadataPatchBody,
  type ExistingDocumentForUpdate,
} from '@/lib/document-metadata-update'

export async function applyDocumentMetadataPatch(
  client: SupabaseClient,
  document: ExistingDocumentForUpdate,
  body: unknown,
  options: {
    verifyPetOwnership: (petId: string) => Promise<boolean>
  }
): Promise<
  | { ok: true; document: ExistingDocumentForUpdate & Record<string, unknown> }
  | { ok: false; error: string; status: number }
> {
  const input = parseDocumentMetadataPatchBody(body)
  const result = buildDocumentMetadataUpdates(document, input)

  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status }
  }

  const targetPetId = (result.updates.pet_id ?? document.pet_id) as string | null
  const targetType = (result.updates.document_type ?? document.document_type) as string

  if ((targetType === 'impfpass' || targetType === 'wurmtest') && targetPetId) {
    const ownsPet = await options.verifyPetOwnership(targetPetId)
    if (!ownsPet) {
      return { ok: false, error: 'Tier nicht gefunden', status: 404 }
    }
  }

  if (result.checkImpfpassLimitPetId) {
    const { count, error: countError } = await client
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', result.checkImpfpassLimitPetId)
      .eq('document_type', 'impfpass')
      .neq('id', document.id)

    if (countError) throw countError
    if ((count ?? 0) >= MAX_IMPFASS_PHOTOS) {
      return {
        ok: false,
        error: `Maximal ${MAX_IMPFASS_PHOTOS} Impfpass-Fotos pro Tier erlaubt.`,
        status: 400,
      }
    }
  }

  const { data, error: updateError } = await client
    .from('documents')
    .update(result.updates)
    .eq('id', document.id)
    .select()
    .single()

  if (updateError) throw updateError

  return { ok: true, document: data }
}
