import type { SupabaseClient } from '@supabase/supabase-js'

import {
  DEFAULT_CANCELLATION_POLICY_CONFIG,
  normalizeCancellationPolicyConfig,
  type CancellationPolicyConfig,
  type CancellationPolicyRecord,
} from '@/lib/cancellation-policy-config'

export async function loadActiveCancellationPolicy(
  supabase: SupabaseClient
): Promise<{ policy: CancellationPolicyRecord | null; config: CancellationPolicyConfig }> {
  const { data, error } = await supabase
    .from('cancellation_policies')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return {
      policy: null,
      config: DEFAULT_CANCELLATION_POLICY_CONFIG,
    }
  }

  const record = data as CancellationPolicyRecord
  return {
    policy: record,
    config: normalizeCancellationPolicyConfig(record.config),
  }
}
