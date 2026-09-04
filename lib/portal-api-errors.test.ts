import { describe, expect, it } from 'vitest'

import { mapPortalApiError } from '@/lib/portal-api-errors'

describe('mapPortalApiError', () => {
  it('übersetzt Auth-Session-Fehler', () => {
    expect(mapPortalApiError('Auth session missing!')).toBe(
      'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'
    )
  })

  it('lässt andere Meldungen unverändert', () => {
    expect(mapPortalApiError('Nicht autorisiert')).toBe('Nicht autorisiert')
  })
})
