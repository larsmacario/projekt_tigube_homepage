import type { Pet } from '@/lib/types'

export function isPetDeceased(pet: Pick<Pet, 'deceased_at'>): boolean {
  return !!pet.deceased_at
}

export function formatDeceasedLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return 'Verstorben'
  }
  return `Verstorben seit ${parsed.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`
}
