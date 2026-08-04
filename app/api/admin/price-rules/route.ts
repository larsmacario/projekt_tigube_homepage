import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  loadPriceRulesForScope,
  savePriceRulesForScope,
} from '@/lib/price-catalog-loader'
import { normalizeRulePayload, type PriceScopeType } from '@/lib/price-resolver'

function parseScopeType(value: string | null): PriceScopeType | null {
  if (value === 'group' || value === 'customer' || value === 'pet') {
    return value
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const scopeType = parseScopeType(searchParams.get('scope_type'))
    const scopeId = searchParams.get('scope_id')

    if (!scopeType || !scopeId) {
      return NextResponse.json(
        { error: 'scope_type und scope_id sind erforderlich' },
        { status: 400 }
      )
    }

    const rules = await loadPriceRulesForScope(auth.client, scopeType, scopeId)
    return NextResponse.json({ rules })
  } catch (error: unknown) {
    console.error('Error fetching price rules:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Preisregeln'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const scopeType = parseScopeType(body.scope_type ?? null)
    const scopeId = body.scope_id as string | undefined
    const rulesInput = body.rules

    if (!scopeType || !scopeId) {
      return NextResponse.json(
        { error: 'scope_type und scope_id sind erforderlich' },
        { status: 400 }
      )
    }

    if (!Array.isArray(rulesInput)) {
      return NextResponse.json({ error: 'rules muss ein Array sein' }, { status: 400 })
    }

    const rules = rulesInput
      .map((rule: Record<string, unknown>) =>
        normalizeRulePayload({
          price_id: String(rule.price_id),
          rule_mode: rule.rule_mode as string | undefined,
          price: rule.price as string | number | null | undefined,
          discount_type: rule.discount_type as string | undefined,
          discount_value: rule.discount_value as string | number | null | undefined,
        })
      )
      .filter(Boolean)

    await savePriceRulesForScope(auth.client, scopeType, scopeId, rules)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error saving price rules:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Speichern der Preisregeln'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
