import type { BookingExtraCategory, BookingExtraPrice } from '@/lib/booking-extras'
import { parseTimeHHmm } from '@/lib/pickup-time-surcharge'

export const HUNDEPENSION_EXTRAS_CATEGORY_ID = 'c3333333-3333-4333-c333-333333333333'

export const OVERNIGHT_PICKUP_CUTOFF = '20:00'

export const DEFAULT_OVERNIGHT_FEE = 10

export const OVERNIGHT_PICKUP_NOTE =
  'Gilt, wenn dein Hund am Abholtag nicht bis spätestens 20:00 Uhr abgeholt werden kann.'

function cutoffMinutes(): number {
  const parsed = parseTimeHHmm(OVERNIGHT_PICKUP_CUTOFF)
  if (!parsed) return 20 * 60
  return parsed.hours * 60 + parsed.minutes
}

export function needsOvernightOnLastDay(pickUpTime: string): boolean {
  const time = parseTimeHHmm(pickUpTime)
  if (!time) return false
  const minutes = time.hours * 60 + time.minutes
  return minutes > cutoffMinutes()
}

export function isHundepensionExtrasCategory(
  category: Pick<BookingExtraCategory, 'id' | 'name'>
): boolean {
  const name = category.name.toLowerCase()
  return (
    category.id === HUNDEPENSION_EXTRAS_CATEGORY_ID ||
    (name.includes('hundepension') && name.includes('zusatz'))
  )
}

function isOvernightPrice(price: BookingExtraPrice): boolean {
  const blob = [price.name, price.description, price.unit, price.note]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return (
    blob.includes('übernacht') ||
    blob.includes('uebernacht') ||
    blob.includes('je nacht')
  )
}

export function findOvernightCatalogPrice(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): BookingExtraPrice | null {
  const extraCategoryIds = new Set(
    categories.filter((c) => isHundepensionExtrasCategory(c)).map((c) => c.id)
  )

  const candidates = prices.filter(
    (p) =>
      extraCategoryIds.has(p.category_id) &&
      p.price_type !== 'text' &&
      isOvernightPrice(p)
  )

  return candidates.sort((a, b) => a.sort_order - b.sort_order)[0] ?? null
}

export function resolveOvernightUnitPrice(
  prices: BookingExtraPrice[],
  categories: BookingExtraCategory[]
): number {
  const catalog = findOvernightCatalogPrice(prices, categories)
  const amount = catalog?.final_price ?? catalog?.price
  if (amount != null && !Number.isNaN(amount)) return amount
  return DEFAULT_OVERNIGHT_FEE
}
