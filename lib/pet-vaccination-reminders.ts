import type { SupabaseClient } from '@supabase/supabase-js'
import { sendVaccinationReminderEmail } from '@/lib/email'
import {
  formatDateDE,
  getReminderCandidatesForPet,
  getVaccinationTypeLabel,
  type VaccinationReminderCandidate,
} from '@/lib/pet-vaccination'
import type { Pet } from '@/lib/types'

type PetWithCustomer = Pet & {
  contacts: {
    email: string | null
    vorname: string | null
    nachname: string | null
  } | null
}

export type VaccinationReminderResult = {
  sent: number
  skipped: number
  failed: number
  details: Array<{
    petId: string
    vaccinationType: string
    dueDate: string
    daysBefore: number
    status: 'sent' | 'skipped' | 'failed'
    error?: string
  }>
}

function getCustomerName(contact: PetWithCustomer['contacts']): string {
  if (!contact) return ''
  return [contact.vorname, contact.nachname].filter(Boolean).join(' ').trim()
}

async function wasReminderAlreadySent(
  adminClient: SupabaseClient,
  candidate: VaccinationReminderCandidate
): Promise<boolean> {
  const { data, error } = await adminClient
    .from('pet_vaccination_reminder_log')
    .select('id')
    .eq('pet_id', candidate.petId)
    .eq('vaccination_type', candidate.vaccinationType)
    .eq('due_date', candidate.dueDate)
    .eq('days_before', candidate.daysBefore)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return !!data
}

async function logReminderSent(
  adminClient: SupabaseClient,
  candidate: VaccinationReminderCandidate
): Promise<void> {
  const { error } = await adminClient.from('pet_vaccination_reminder_log').insert({
    pet_id: candidate.petId,
    vaccination_type: candidate.vaccinationType,
    due_date: candidate.dueDate,
    days_before: candidate.daysBefore,
    recipient_email: candidate.customerEmail,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function executeVaccinationReminders(
  adminClient: SupabaseClient,
  today: Date = new Date()
): Promise<VaccinationReminderResult> {
  const result: VaccinationReminderResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  }

  const { data: pets, error } = await adminClient
    .from('pets')
    .select(
      'id, name, tierart, letzte_impfung, intervall_impfung, letzte_impfung_zusatz, customer_id, contacts(email, vorname, nachname)'
    )
    .ilike('tierart', 'hund')

  if (error) {
    throw new Error(error.message)
  }

  const portalUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://tierischgutbetreut.de'

  for (const pet of (pets || []) as PetWithCustomer[]) {
    const customerEmail = pet.contacts?.email
    if (!customerEmail) {
      continue
    }

    const customerName = getCustomerName(pet.contacts)
    const candidates = getReminderCandidatesForPet({
      pet,
      customerEmail,
      customerName,
      today,
    })

    for (const candidate of candidates) {
      try {
        const alreadySent = await wasReminderAlreadySent(adminClient, candidate)
        if (alreadySent) {
          result.skipped += 1
          result.details.push({
            petId: candidate.petId,
            vaccinationType: candidate.vaccinationType,
            dueDate: candidate.dueDate,
            daysBefore: candidate.daysBefore,
            status: 'skipped',
          })
          continue
        }

        const delivery = await sendVaccinationReminderEmail({
          email: candidate.customerEmail,
          customerName: candidate.customerName,
          petName: candidate.petName,
          vaccinationLabel: getVaccinationTypeLabel(candidate.vaccinationType),
          dueDateLabel: formatDateDE(candidate.dueDate),
          daysBefore: candidate.daysBefore,
          portalUrl: `${portalUrl}/portal/pets`,
        })

        if (delivery.status === 'failed') {
          result.failed += 1
          result.details.push({
            petId: candidate.petId,
            vaccinationType: candidate.vaccinationType,
            dueDate: candidate.dueDate,
            daysBefore: candidate.daysBefore,
            status: 'failed',
            error: delivery.error || 'Unbekannter Fehler',
          })
          continue
        }

        await logReminderSent(adminClient, candidate)
        result.sent += 1
        result.details.push({
          petId: candidate.petId,
          vaccinationType: candidate.vaccinationType,
          dueDate: candidate.dueDate,
          daysBefore: candidate.daysBefore,
          status: 'sent',
        })
      } catch (err) {
        result.failed += 1
        result.details.push({
          petId: candidate.petId,
          vaccinationType: candidate.vaccinationType,
          dueDate: candidate.dueDate,
          daysBefore: candidate.daysBefore,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unbekannter Fehler',
        })
      }
    }
  }

  return result
}
