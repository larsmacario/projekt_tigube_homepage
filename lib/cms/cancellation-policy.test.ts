import { describe, expect, it } from 'vitest'

import {
  defaultPensionCancellationSections,
  emptyCancellationSection,
  getCancellationSectionsForEditor,
  normalizeCancellationSections,
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
})
