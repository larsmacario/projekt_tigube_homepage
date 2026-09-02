import { formatEuro } from '@/lib/price-override'

export const DEFAULT_VAT_RATE = 19

export function computeGrossFromNet(net: number, taxRate = DEFAULT_VAT_RATE): number {
  if (!Number.isFinite(net)) return 0
  const gross = net * (1 + taxRate / 100)
  return Math.round(gross * 100) / 100
}

export function computeNetFromGross(gross: number, taxRate = DEFAULT_VAT_RATE): number {
  if (!Number.isFinite(gross)) return 0
  const net = gross / (1 + taxRate / 100)
  return Math.round(net * 100) / 100
}

export function getNetGrossAmounts(
  net: number,
  taxRate = DEFAULT_VAT_RATE
): { net: number; gross: number } {
  return { net, gross: computeGrossFromNet(net, taxRate) }
}

/** Kompakt für Dropdowns: Brutto, Netto in Klammern. */
export function formatNetGrossInline(net: number, taxRate = DEFAULT_VAT_RATE): string {
  const { gross } = getNetGrossAmounts(net, taxRate)
  return `${formatEuro(gross)} (${formatEuro(net)} netto)`
}

/** @deprecated Nutze VatPriceDisplay oder formatNetGrossInline */
export function formatNetGrossLabel(net: number, taxRate = DEFAULT_VAT_RATE): string {
  return formatNetGrossInline(net, taxRate)
}
