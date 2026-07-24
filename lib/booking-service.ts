import type { ServiceType } from '@/lib/types'

export interface BookingServiceOption {
  value: ServiceType
  label: string
}

const DOG_SERVICES: BookingServiceOption[] = [
  { value: 'hundepension', label: 'Urlaubsbetreuung' },
  { value: 'tagesbetreuung', label: 'Tagesbetreuung' },
]

const CAT_SERVICES: BookingServiceOption[] = [
  { value: 'katzenbetreuung', label: 'Katzenbetreuung' },
]

export function getServicesForPetType(
  petType: string | null | undefined
): BookingServiceOption[] {
  switch (petType?.trim().toLowerCase()) {
    case 'hund':
      return DOG_SERVICES
    case 'katze':
      return CAT_SERVICES
    default:
      return []
  }
}

export function isServiceAllowedForPetType(
  serviceType: string,
  petType: string | null | undefined
): serviceType is ServiceType {
  return getServicesForPetType(petType).some(
    (service) => service.value === serviceType
  )
}
