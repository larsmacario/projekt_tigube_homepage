import { SEVDESK_CAT_CUSTOMER_TAG } from '@/lib/sevdesk'

export function isCat(tierart: string | null | undefined): boolean {
  return tierart?.trim().toLowerCase() === 'katze'
}

export type CatCustomerContext = {
  sevdesk_tags?: string[] | null
}

export function isCatCustomer(customer: CatCustomerContext | null | undefined): boolean {
  const tags = customer?.sevdesk_tags ?? []
  return tags.some((tag) => tag.trim().toLowerCase() === SEVDESK_CAT_CUSTOMER_TAG)
}

export function isCatPetContext(input: {
  tierart?: string | null
  customer?: CatCustomerContext | null
}): boolean {
  return isCat(input.tierart) || isCatCustomer(input.customer)
}

export function requiresImpfpass(input: {
  tierart?: string | null
  customer?: CatCustomerContext | null
}): boolean {
  return !isCatPetContext(input)
}

