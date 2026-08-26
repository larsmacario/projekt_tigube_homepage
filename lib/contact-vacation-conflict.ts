import {
  findOverlappingVacation,
  parseIsoDate,
  type VacationDate,
} from '@/lib/vacation-dates'

export interface ContactVacationConflictResult {
  conflict: boolean
  overlappingPeriod?: VacationDate
}

function parseContactDate(dateString: string): Date | null {
  const isoDate = dateString.split('T')[0]
  return parseIsoDate(isoDate) ?? (isNaN(new Date(dateString).getTime()) ? null : new Date(dateString))
}

export function resolveContactVacationConflict(params: {
  service: string
  konkreterUrlaub?: string | null
  urlaubVon?: string | null
  urlaubBis?: string | null
  vacationDates: VacationDate[]
}): ContactVacationConflictResult {
  const { service, konkreterUrlaub, urlaubVon, urlaubBis, vacationDates } = params

  if (service !== 'hundepension' || konkreterUrlaub !== 'ja') {
    return { conflict: false }
  }

  if (!urlaubVon || !urlaubBis) {
    return { conflict: false }
  }

  const vonDate = parseContactDate(urlaubVon)
  const bisDate = parseContactDate(urlaubBis)

  if (!vonDate || !bisDate || bisDate < vonDate) {
    return { conflict: false }
  }

  const overlapping = findOverlappingVacation(vacationDates, vonDate, bisDate)
  if (overlapping) {
    return { conflict: true, overlappingPeriod: overlapping }
  }

  return { conflict: false }
}
