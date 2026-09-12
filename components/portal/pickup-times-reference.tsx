import type { KundenportalPickupRow } from '@/lib/cms/portal-defaults'
import { resolvePickupTimesRows } from '@/lib/pickup-times-reference'
import { cn } from '@/lib/utils'

export { resolvePickupTimesRows } from '@/lib/pickup-times-reference'

export function PickupTimesReference({
  rows,
  title = 'Offizielle Bring- und Holzeiten:',
  className,
}: {
  rows?: KundenportalPickupRow[] | null
  title?: string | null
  className?: string
}) {
  const resolvedRows = resolvePickupTimesRows(rows)
  if (resolvedRows.length === 0) return null

  return (
    <div className={cn('space-y-2 text-sage-700', className)}>
      {title ? <p className="font-medium text-sage-900">{title}</p> : null}
      {resolvedRows.map((row, idx) => (
        <div key={`${row.days}-${idx}`}>
          <p className="font-medium">{row.days}</p>
          <p>{row.times}</p>
        </div>
      ))}
    </div>
  )
}
