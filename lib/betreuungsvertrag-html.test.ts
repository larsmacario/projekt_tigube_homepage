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
    expect(agbHtml).toContain('Kundenportal bzw. per Mail')
  })

  it('verwendet einheitlich die Bezeichnung Tierhalter statt Tierbesitzer', () => {
    expect(agbHtml).not.toContain('Tierbesitzer')
    expect(agbHtml).toContain('Der Tierhalter')
  })

  it('injiziert CMS-Stornierungsbedingungen dynamisch in den Vertrag', async () => {
    const { resolveBetreuungsvertragLegal } = await import('@/lib/betreuungsvertrag')
    const customResolved = resolveBetreuungsvertragLegal(null, {
      cancellationSections: [
        {
          title: 'Sonder-Stornofristen',
          policy: [{ period: '30 Tage vor Beginn', refund: 'kostenlos' }],
          notes: ['Individuelle Notiz'],
        },
      ],
      cancellationNotes: ['Allgemeiner Zusatzhinweis'],
    })

    expect(customResolved.content).toContain('Sonder-Stornofristen')
    expect(customResolved.content).toContain('30 Tage vor Beginn')
    expect(customResolved.content).toContain('Individuelle Notiz')
    expect(customResolved.content).toContain('Allgemeiner Zusatzhinweis')
    expect(customResolved.content).toContain('<h2>Zusicherungen und Pflichten beider Parteien</h2>')
    expect(customResolved.content).toContain('<h2>Datenschutz</h2>')
  })
})



