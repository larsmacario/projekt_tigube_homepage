import type { SupabaseClient } from '@supabase/supabase-js'

type PortalCustomerResult =
  | { customer: { id: string }; userId: string }
  | { error: string; status: number }

export async function getPortalCustomer(
  supabase: SupabaseClient,
  authUserId: string
): Promise<PortalCustomerResult> {
  const { data: customer, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', authUserId)
    .eq('contact_type', 'customer')
    .maybeSingle()

  if (error) {
    return { error: error.message, status: 500 }
  }

  if (!customer) {
    return { error: 'Kundenprofil nicht gefunden', status: 404 }
  }

  return { customer, userId: authUserId }
}

export async function assertPetOwnership(
  supabase: SupabaseClient,
  petId: string,
  customerId: string
): Promise<{ pet: { id: string; customer_id: string } } | { error: string; status: number }> {
  const { data: pet, error } = await supabase
    .from('pets')
    .select('id, customer_id')
    .eq('id', petId)
    .eq('customer_id', customerId)
    .maybeSingle()

  if (error) {
    return { error: error.message, status: 500 }
  }

  if (!pet) {
    return { error: 'Tier nicht gefunden', status: 404 }
  }

  return { pet }
}

export async function deletePetPhotoStorageFiles(
  supabase: SupabaseClient,
  filePaths: string[]
): Promise<void> {
  if (filePaths.length === 0) return

  const { error } = await supabase.storage.from('pet-photos').remove(filePaths)
  if (error) {
    console.error('Pet photo storage delete error:', error)
  }
}
