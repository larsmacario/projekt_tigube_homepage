import { describe, expect, it } from 'vitest'

import {
  defaultPensionCancellationSections,
  emptyCancellationSection,
  getCancellationSectionsForEditor,
  injectCancellationPolicyIntoContract,
  normalizeCancellationSections,
  renderCancellationSectionsToHtml,
} from '@/lib/cms/cancellation-policy'

describe('cancellation-policy', () => {
  it('normalizeCancellationSections filtert leere Abschnitte für die Anzeige', () => {
    const result = normalizeCancellationSections(
      {
        cancellationSections: [
          {
            title: '',
            policy: [{ period: '15 Tage', refund: '100%' }],
            notes: [],
          },
          emptyCancellationSection(),
        ],
      },
      defaultPensionCancellationSections
    )

    expect(result).toHaveLength(1)
    expect(result[0].policy[0].period).toBe('15 Tage')
  })

  it('getCancellationSectionsForEditor behält neu hinzugefügte leere Abschnitte', () => {
    const existing = normalizeCancellationSections(
      { cancellationPolicy: [{ period: '14 Tage', refund: '50%' }] },
      defaultPensionCancellationSections
    )
    const withNewSection = [...existing, emptyCancellationSection()]

    const result = getCancellationSectionsForEditor(
      { cancellationSections: withNewSection },
      defaultPensionCancellationSections
    )

    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(emptyCancellationSection())
  })

  it('getCancellationSectionsForEditor nutzt Legacy-Fallback ohne cancellationSections', () => {
    const result = getCancellationSectionsForEditor(
      { cancellationPolicy: [{ period: '7 Tage', refund: '0%' }] },
      defaultPensionCancellationSections
    )

    expect(result).toHaveLength(1)
    expect(result[0].policy[0].period).toBe('7 Tage')
  })

  it('renderCancellationSectionsToHtml erzeugt gültiges semantisches HTML', () => {
    const html = renderCancellationSectionsToHtml(
      [
        {
          title: 'Staffel A',
          policy: [{ period: '14 Tage vorher', refund: 'kostenlos' }],
          notes: ['Hinweis 1'],
        },
      ],
      ['Allgemeiner Hinweis']
    )

    expect(html).toContain('<p><strong>Staffel A</strong></p>')
    expect(html).toContain('<li><strong>14 Tage vorher:</strong> kostenlos</li>')
    expect(html).toContain('<p>Hinweis 1</p>')
    expect(html).toContain('<p>Allgemeiner Hinweis</p>')
  })

  it('injectCancellationPolicyIntoContract ersetzt den Storno-Abschnitt präzise', () => {
    const contract = '<h2>Vorher</h2><p>Text</p><h2>Stornierung</h2><p>Alt</p><h2>Datenschutz</h2><p>DS</p>'
    const injected = injectCancellationPolicyIntoContract(contract, '<p>NEUER STORNO TEXT</p>')

    expect(injected).toBe('<h2>Vorher</h2><p>Text</p><h2>Stornierung</h2>\n<p>NEUER STORNO TEXT</p>\n<h2>Datenschutz</h2><p>DS</p>')
  })
})


