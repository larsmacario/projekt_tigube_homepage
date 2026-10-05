import type { SchoolHolidayPeriod } from '@/lib/school-holidays-bw'

/**
 * Offizielle Ferientermine BW (KMK / Kultusministerium), Fallback wenn ferien-api.de leer/ausfällt.
 * Jährlich prüfen und ergänzen.
 */
export const SCHOOL_HOLIDAYS_BW_FALLBACK: SchoolHolidayPeriod[] = [
  { start: '2024-07-25', end: '2024-09-07', name: 'Sommerferien 2024' },
  { start: '2024-10-28', end: '2024-10-30', name: 'Herbstferien 2024' },
  { start: '2024-12-23', end: '2025-01-06', name: 'Weihnachtsferien 2024/25' },
  { start: '2025-04-14', end: '2025-04-26', name: 'Osterferien 2025' },
  { start: '2025-06-10', end: '2025-06-20', name: 'Pfingstferien 2025' },
  { start: '2025-07-31', end: '2025-09-13', name: 'Sommerferien 2025' },
  { start: '2025-10-27', end: '2025-10-30', name: 'Herbstferien 2025' },
  { start: '2025-12-22', end: '2026-01-05', name: 'Weihnachtsferien 2025/26' },
  { start: '2026-03-30', end: '2026-04-11', name: 'Osterferien 2026' },
  { start: '2026-05-26', end: '2026-06-05', name: 'Pfingstferien 2026' },
  { start: '2026-07-30', end: '2026-09-12', name: 'Sommerferien 2026' },
  { start: '2026-10-26', end: '2026-10-30', name: 'Herbstferien 2026' },
  { start: '2026-12-23', end: '2027-01-09', name: 'Weihnachtsferien 2026/27' },
  { start: '2027-03-30', end: '2027-04-03', name: 'Osterferien 2027' },
  { start: '2027-05-18', end: '2027-05-29', name: 'Pfingstferien 2027' },
  { start: '2027-07-29', end: '2027-09-11', name: 'Sommerferien 2027' },
  { start: '2027-11-02', end: '2027-11-06', name: 'Herbstferien 2027' },
  { start: '2027-12-23', end: '2028-01-06', name: 'Weihnachtsferien 2027/28' },
  { start: '2028-04-11', end: '2028-04-22', name: 'Osterferien 2028' },
  { start: '2028-05-30', end: '2028-06-09', name: 'Pfingstferien 2028' },
  { start: '2028-07-27', end: '2028-09-09', name: 'Sommerferien 2028' },
  { start: '2028-10-30', end: '2028-11-03', name: 'Herbstferien 2028' },
]
