import { describe, expect, it } from 'vitest'

import { formatDateRangeDE } from '@/lib/format-date-range-de'

describe('formatDateRangeDE', () => {
  it('formats same month in German', () => {
    const from = new Date(2026, 6, 24)
    const to = new Date(2026, 6, 31)
    expect(formatDateRangeDE(from, to)).toBe('24. – 31. Juli')
  })
})
