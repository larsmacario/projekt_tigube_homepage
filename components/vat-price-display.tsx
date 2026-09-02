import { formatEuro } from '@/lib/price-override'
import { computeGrossFromNet, computeNetFromGross, DEFAULT_VAT_RATE } from '@/lib/vat-amount'
import { cn } from '@/lib/utils'

interface VatPriceDisplayProps {
  net: number
  taxRate?: number
  className?: string
  grossClassName?: string
  netClassName?: string
}

/** Brutto prominent, Netto darunter – für reine Anzeige (ohne Brutto-Eingabefeld). */
export function VatPriceDisplay({
  net,
  taxRate = DEFAULT_VAT_RATE,
  className,
  grossClassName,
  netClassName,
}: VatPriceDisplayProps) {
  if (!Number.isFinite(net) || net < 0) return null

  const gross = computeGrossFromNet(net, taxRate)

  return (
    <div className={cn('leading-tight', className)}>
      <p className={cn('font-semibold tabular-nums text-sage-900', grossClassName)}>
        {formatEuro(gross)}
      </p>
      <p className={cn('text-xs tabular-nums text-sage-600', netClassName)}>
        {formatEuro(net)} netto
      </p>
    </div>
  )
}

/** Nur Netto-Zeile – unter Brutto-Eingabefeldern. */
export function VatNetSubline({
  gross,
  taxRate = DEFAULT_VAT_RATE,
  className,
  netClassName,
}: {
  gross: number
  taxRate?: number
  className?: string
  netClassName?: string
}) {
  if (!Number.isFinite(gross) || gross < 0) return null

  const net = computeNetFromGross(gross, taxRate)

  return (
    <p className={cn('text-xs tabular-nums text-sage-600', className, netClassName)}>
      {formatEuro(net)} netto
    </p>
  )
}

export function grossAmountInputFromNet(net: number, taxRate = DEFAULT_VAT_RATE): string {
  return String(computeGrossFromNet(net, taxRate))
}

export function netAmountFromGrossInput(grossRaw: string, taxRate = DEFAULT_VAT_RATE): number | null {
  const gross = Number(grossRaw)
  if (!Number.isFinite(gross) || gross < 0) return null
  return computeNetFromGross(gross, taxRate)
}
