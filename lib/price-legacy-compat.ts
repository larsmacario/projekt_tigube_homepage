export function isMissingDbObject(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === '42703') return true
  return /does not exist/i.test(error.message ?? '')
}

type LegacyPriceRow = {
  usage?: string | null
  customer_selectable?: boolean | null
  price_type?: string
  [key: string]: unknown
}

export function normalizeCatalogPriceRow<T extends LegacyPriceRow>(row: T): T & { usage: string } {
  if (row.usage) {
    return row as T & { usage: string }
  }

  if (row.price_type === 'text') {
    return { ...row, usage: 'info' }
  }

  if (row.customer_selectable === false) {
    return { ...row, usage: 'info' }
  }

  return { ...row, usage: 'extra' }
}
