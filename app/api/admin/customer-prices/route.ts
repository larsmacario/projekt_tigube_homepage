import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadPriceRulesForScope } from '@/lib/price-catalog-loader'

/** @deprecated Nutze /api/admin/price-rules?scope_type=customer */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id ist erforderlich' }, { status: 400 })
    }

    const rules = await loadPriceRulesForScope(auth.client, 'customer', customerId)
    const overrides = rules
      .filter((rule) => rule.rule_mode === 'custom')
      .map((rule) => ({
        price_id: rule.price_id,
        price: rule.price,
        discount_type: rule.discount_type,
        discount_value: rule.discount_value,
      }))

    return NextResponse.json({ overrides: overrides })
  } catch (error: unknown) {
    console.error('Error fetching customer prices:', error)
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Kundenpreise'
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
      scope_type: 'customer',
      scope_id: body.customer_id,
      rules: (body.overrides ?? []).map((override: Record<string, unknown>) => ({
        price_id: override.price_id,
        rule_mode: 'custom',
        price: override.price,
        discount_type: override.discount_type,
        discount_value: override.discount_value,
      })),
    }),
  })
  const { PUT: putRules } = await import('@/app/api/admin/price-rules/route')
  return putRules(forward)
}
