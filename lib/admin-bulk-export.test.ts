import { describe, expect, it } from 'vitest'
import {
  buildBulkCustomersZipFilename,
  buildCustomerFolderName,
  sanitizeZipSegment,
} from '@/lib/admin-bulk-export'

describe('admin-bulk-export helpers', () => {
  it('sanitizes zip segment names', () => {
    expect(sanitizeZipSegment('Müller / Anna')).toBe('Muller_Anna')
    expect(sanitizeZipSegment('   ')).toBe('Unbekannt')
  })

  it('builds unique customer folder names', () => {
    const used = new Set<string>()
    const first = buildCustomerFolderName(
      { nachname: 'Müller', vorname: 'Anna', kundennummer: 'K-001' },
      used
    )
    const second = buildCustomerFolderName(
      { nachname: 'Müller', vorname: 'Anna', kundennummer: 'K-002' },
      used
    )

    expect(first).not.toBe(second)
    expect(used.has(first)).toBe(true)
    expect(used.has(second)).toBe(true)
  })

  it('builds bulk zip filename with date', () => {
    expect(buildBulkCustomersZipFilename(new Date('2026-09-02T10:00:00Z'))).toBe(
      'Tierhalter-Berichte_2026-09-02.zip'
    )
  })
})
