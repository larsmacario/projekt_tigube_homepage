export interface WaitlistCmsContent {
  formTitle: string
  formHint: string
  formDescription: string
  successMessage: string
  emailSubject: string
  emailIntro: string
}

export interface SiteSettingsRow {
  id: string
  waitlist_enabled: boolean
  updated_at: string
}

export const DEFAULT_WAITLIST_CMS: WaitlistCmsContent = {
  formTitle: 'Warteliste für Kennenlernen',
  formHint:
    'Aktuell ist ein Kennenlernen nur über unsere Warteliste möglich. Trag dich ein – wir melden uns, sobald ein Platz frei wird.',
  formDescription:
    'Deine Angaben helfen uns, dich passend einzuplanen, sobald wieder Kapazität für ein Kennenlernen frei ist.',
  successMessage:
    'Vielen Dank! Du stehst auf unserer Warteliste. Wir melden uns bei dir, sobald ein Kennenlerntermin möglich ist.',
  emailSubject: 'Deine Wartelisten-Anmeldung bei tierisch gut betreut GmbH',
  emailIntro:
    'vielen Dank für deine Anmeldung auf unsere Warteliste. Aktuell ist ein Kennenlernen nur über die Warteliste möglich. Wir haben deine Angaben erhalten und melden uns bei dir, sobald ein Platz frei wird.',
}

export function mergeWaitlistCmsContent(
  data: Partial<WaitlistCmsContent> | null | undefined
): WaitlistCmsContent {
  return {
    formTitle: data?.formTitle?.trim() || DEFAULT_WAITLIST_CMS.formTitle,
    formHint: data?.formHint?.trim() || DEFAULT_WAITLIST_CMS.formHint,
    formDescription: data?.formDescription?.trim() || DEFAULT_WAITLIST_CMS.formDescription,
    successMessage: data?.successMessage?.trim() || DEFAULT_WAITLIST_CMS.successMessage,
    emailSubject: data?.emailSubject?.trim() || DEFAULT_WAITLIST_CMS.emailSubject,
    emailIntro: data?.emailIntro?.trim() || DEFAULT_WAITLIST_CMS.emailIntro,
  }
}
