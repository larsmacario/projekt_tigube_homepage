import { iterateIsoDateRange } from '@/lib/booking-availability'
import { isoWeekdayFromIsoDate } from '@/lib/day-care-interval'
import { sortIsoDates } from '@/lib/day-care-booking'

export interface BookingDateBlock {
  start_date: string
  end_date: string
  /** ISO weekday 1=Mo … 7=So; when set, only matching days within the range count */
  weekdays?: number[]
}

export function expandBlockToIsoDates(block: BookingDateBlock): string[] {
  if (block.end_date < block.start_date) return []

  const all = iterateIsoDateRange(block.start_date, block.end_date)
  if (!block.weekdays?.length) return all

  const weekdaySet = new Set(block.weekdays)
  return all.filter((iso) => weekdaySet.has(isoWeekdayFromIsoDate(iso)))
}

export function mergeIsoDates(...lists: (string[] | undefined)[]): string[] {
  const set = new Set<string>()
  for (const list of lists) {
    if (!list) continue
    for (const d of list) set.add(d)
  }
  return sortIsoDates([...set])
}

export function envelopeFromBlocks(
  blocks: BookingDateBlock[]
): { start_date: string; end_date: string } | null {
  if (blocks.length === 0) return null
  const starts = blocks.map((b) => b.start_date).sort()
  const ends = blocks.map((b) => b.end_date).sort()
  const start = starts[0]
  const end = ends[ends.length - 1]
  if (end < start) return null
  return { start_date: start, end_date: end }
}

export function parseDateBlocksFromRaw(raw: unknown): BookingDateBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: BookingDateBlock[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const start = (item as { start_date?: unknown }).start_date
    const end = (item as { end_date?: unknown }).end_date
    if (typeof start !== 'string' || typeof end !== 'string') continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue
    const weekdaysRaw = (item as { weekdays?: unknown }).weekdays
    let weekdays: number[] | undefined
    if (Array.isArray(weekdaysRaw) && weekdaysRaw.length > 0) {
      weekdays = weekdaysRaw.filter(
        (d): d is number => typeof d === 'number' && d >= 1 && d <= 7
      )
      if (weekdays.length === 0) weekdays = undefined
    }
    blocks.push({
      start_date: start,
      end_date: end,
      ...(weekdays?.length ? { weekdays } : {}),
    })
  }
  return blocks
}

/** `date_blocks[]` or legacy top-level start/end → normalized blocks */
export function normalizeDateBlocksFromRequest(body: {
  date_blocks?: unknown
  start_date?: unknown
  end_date?: unknown
}): BookingDateBlock[] {
  const parsed = parseDateBlocksFromRaw(body.date_blocks)
  if (parsed.length > 0) return parsed

  const start = body.start_date
  const end = body.end_date
  if (typeof start === 'string' && typeof end === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return [{ start_date: start, end_date: end }]
    }
  }
  return []
}

export function expandBlocksToIsoDates(blocks: BookingDateBlock[]): string[] {
  return mergeIsoDates(...blocks.map(expandBlockToIsoDates))
}

export function validateDateBlocks(
  blocks: BookingDateBlock[]
): { valid: true } | { valid: false; error: string } {
  if (blocks.length === 0) {
    return { valid: false, error: 'Bitte wähle mindestens einen Betreuungszeitraum.' }
  }
  for (const block of blocks) {
    if (block.end_date < block.start_date) {
      return { valid: false, error: 'Enddatum muss am oder nach dem Startdatum liegen.' }
    }
  }
  return { valid: true }
}
