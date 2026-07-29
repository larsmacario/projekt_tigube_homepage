import { describe, expect, it } from 'vitest'
import { agbHtml } from '@/lib/cms/legal-defaults'
import { extractLegalSectionHeadings, parseLegalHtmlToBlocks } from '@/lib/betreuungsvertrag-html'

describe('betreuungsvertrag-html', () => {
  it('behält die Abschnittsreihenfolge des AGB-Standardtexts', () => {
    expect(extractLegalSectionHeadings(agbHtml)).toEqual([
      'Zusicherungen und Pflichten beider Parteien',
      'Vertraulichkeit und Sorgfalt beider Parteien',
      'Haftung beider Parteien',
      'Information',
      'Notfall',
      'Stornierung',
      'Datenschutz',
    ])
  })

  it('parst Listen und Absätze ohne Reihenfolge zu verlieren', () => {
    const blocks = parseLegalHtmlToBlocks(agbHtml)
    const firstHeading = blocks.find((b) => b.type === 'heading')
    expect(firstHeading).toEqual({
      type: 'heading',
      text: 'Zusicherungen und Pflichten beider Parteien',
    })
    const firstList = blocks.find((b) => b.type === 'list')
    expect(firstList?.type === 'list' && firstList.items.length).toBeGreaterThan(5)
    const stornierungIdx = blocks.findIndex(
      (b) => b.type === 'heading' && b.text === 'Stornierung'
    )
    const datenschutzIdx = blocks.findIndex(
      (b) => b.type === 'heading' && b.text === 'Datenschutz'
    )
    expect(stornierungIdx).toBeGreaterThan(0)
    expect(datenschutzIdx).toBeGreaterThan(stornierungIdx)
  })

  it('enthält Schulferien-Stornofristen im Standard-AGB-Text', () => {
    expect(agbHtml).toContain('Schulferien des Landes BW')
    expect(agbHtml).toContain('ACHTUNG')
    expect(agbHtml).toContain('Mail oder WhatsApp')
  })
})
