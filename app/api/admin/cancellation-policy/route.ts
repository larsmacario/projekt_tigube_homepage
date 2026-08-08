import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  DEFAULT_CANCELLATION_POLICY_CONFIG,
  normalizeCancellationPolicyConfig,
  type CancellationPolicyConfig,
} from '@/lib/cancellation-policy-config'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { client: supabase } = auth
    const { data, error } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        policy: null,
        config: DEFAULT_CANCELLATION_POLICY_CONFIG,
      })
    }

    return NextResponse.json({
      policy: data,
      config: normalizeCancellationPolicyConfig(data.config),
    })
  } catch (error: unknown) {
    console.error('Error loading cancellation policy:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Laden der Stornierungsbedingungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function validateConfig(config: CancellationPolicyConfig): string | null {
  if (!config.title.trim()) return 'Titel ist erforderlich.'
  if (config.ruleSets.length === 0) return 'Mindestens ein Regelwerk ist erforderlich.'

  for (const ruleSet of config.ruleSets) {
    if (!ruleSet.id.trim() || !ruleSet.name.trim()) {
      return 'Jedes Regelwerk braucht ID und Name.'
    }
    if (ruleSet.tiers.length === 0) {
      return `Regelwerk "${ruleSet.name}" braucht mindestens eine Staffel.`
    }
    for (const tier of ruleSet.tiers) {
      if (tier.minDaysBefore < 0) return 'Fristen dürfen nicht negativ sein.'
      if (tier.chargePercent < 0 || tier.chargePercent > 100) {
        return 'Storno-Anteil muss zwischen 0 und 100 liegen.'
      }
    }
  }

  return null
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { client: supabase } = auth
    const body = await request.json()
    const config = normalizeCancellationPolicyConfig(body.config)
    const validationError = validateConfig(config)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data: activePolicy } = await supabase
      .from('cancellation_policies')
      .select('id, version')
      .eq('is_active', true)
      .maybeSingle()

    const nextVersion = (activePolicy?.version ?? 0) + 1

    if (activePolicy?.id) {
      const deactivate = await supabase
        .from('cancellation_policies')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', activePolicy.id)
      if (deactivate.error) throw deactivate.error
    }

    const insert = await supabase
      .from('cancellation_policies')
      .insert({
        version: nextVersion,
        is_active: true,
        config,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insert.error) throw insert.error

    return NextResponse.json({
      policy: insert.data,
      config: normalizeCancellationPolicyConfig(insert.data.config),
    })
  } catch (error: unknown) {
    console.error('Error saving cancellation policy:', error)
    const message =
      error instanceof Error ? error.message : 'Fehler beim Speichern der Stornierungsbedingungen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
