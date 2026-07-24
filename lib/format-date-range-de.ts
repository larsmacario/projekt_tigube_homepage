import { format, isSameDay, isSameMonth, isSameYear } from 'date-fns'
import { de } from 'date-fns/locale'

const opts = { locale: de }

/**
 * Datumsbereich für Buchungen (de-DE), z. B. „24. – 31. Juli 2026“.
 */
export function formatDateRangeDE(from: Date, to: Date): string {
  const end = to ?? from

  if (isSameDay(from, end)) {
    return format(from, 'd. MMMM yyyy', opts)
  }

  const thisYear = isSameYear(from, new Date()) && isSameYear(end, new Date())
  const yearPart = thisYear ? '' : ` ${format(end, 'yyyy', opts)}`

  if (isSameMonth(from, end) && isSameYear(from, end)) {
    return `${format(from, 'd.', opts)} – ${format(end, 'd. MMMM', opts)}${yearPart}`
  }

  if (isSameYear(from, end)) {
    return `${format(from, 'd. MMMM', opts)} – ${format(end, 'd. MMMM', opts)}${yearPart}`
  }

  return `${format(from, 'd. MMMM yyyy', opts)} – ${format(end, 'd. MMMM yyyy', opts)}`
}
