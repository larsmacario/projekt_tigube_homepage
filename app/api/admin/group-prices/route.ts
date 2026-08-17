import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadPriceRulesForScope } from '@/lib/price-catalog-loader'

/** @deprecated Nutze /api/admin/price-rules?scope_type=group */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('group_id')
    if (!groupId) {
      return NextResponse.json({ error: 'group_id ist erforderlich' }, { status: 400 })
    }

    const rules = await loadPriceRulesForScope(auth.client, 'group', groupId)
    const overrides = rules.map((rule) => ({
      price_id: rule.price_id,
      rule_mode: rule.rule_mode,
      price: rule.price,
      discount_type: rule.discount_type,
      discount_value: rule.discount_value,
    }))

    return NextResponse.json({ overrides, rules })
  } catch (error: unknown) {
    console.error('Error fetching group prices:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Gruppenpreise'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = '/api/admin/price-rules'
  const body = await request.json()
  const forward = new NextRequest(url, {
    method: 'PUT',
    headers: request.headers,
    body: JSON.stringify({
      scope_type: 'group',
      scope_id: body.group_id,
      rules: (body.overrides ?? []).map((override: Record<string, unknown>) => ({
        price_id: override.price_id,
        rule_mode: override.rule_mode ?? 'custom',
        price: override.price,
        discount_type: override.discount_type,
        discount_value: override.discount_value,
      })),
    }),
  })
  const { PUT: putRules } = await import('@/app/api/admin/price-rules/route')
  return putRules(forward)
}
