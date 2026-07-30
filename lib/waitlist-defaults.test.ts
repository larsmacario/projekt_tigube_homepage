import { describe, expect, it } from 'vitest'
import { DEFAULT_WAITLIST_CMS, mergeWaitlistCmsContent } from '@/lib/waitlist-defaults'

describe('mergeWaitlistCmsContent', () => {
  it('liefert Standardtexte wenn keine CMS-Daten vorliegen', () => {
    expect(mergeWaitlistCmsContent(undefined)).toEqual(DEFAULT_WAITLIST_CMS)
    expect(mergeWaitlistCmsContent(null)).toEqual(DEFAULT_WAITLIST_CMS)
  })

  it('überschreibt nur gesetzte Felder', () => {
    expect(
      mergeWaitlistCmsContent({
        formTitle: 'Individueller Titel',
      })
    ).toMatchObject({
      formTitle: 'Individueller Titel',
      formHint: DEFAULT_WAITLIST_CMS.formHint,
    })
  })

  it('ignoriert leere Strings und fällt auf Defaults zurück', () => {
    expect(
      mergeWaitlistCmsContent({
        formHint: '   ',
      }).formHint
    ).toBe(DEFAULT_WAITLIST_CMS.formHint)
  })
})
