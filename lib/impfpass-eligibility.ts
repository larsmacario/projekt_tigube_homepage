import type { SupabaseClient } from '@supabase/supabase-js'

import { isCatCustomer, requiresImpfpass } from '@/lib/cat-customer'

export const IMFPASS_UPLOAD_NOT_ALLOWED_MESSAGE =
  'Impfpass-Upload ist für Katzen nicht erforderlich.'

export async function isImpfpassUploadAllowed(
  supabase: SupabaseClient,
  options: { customerId: string; petId?: string | null }
): Promise<boolean> {
  const { data: customer } = await supabase
    .from('contacts')
    .select('sevdesk_tags')
    .eq('id', options.customerId)
    .maybeSingle()

  if (isCatCustomer(customer ?? undefined)) {
    return false
  }

  if (!options.petId) {
    return true
  }

  const { data: pet } = await supabase
    .from('pets')
    .select('tierart')
    .eq('id', options.petId)
    .eq('customer_id', options.customerId)
    .maybeSingle()

  if (!pet) return false

  return requiresImpfpass({
    tierart: pet.tierart,
    customer: customer ?? undefined,
  })
}
