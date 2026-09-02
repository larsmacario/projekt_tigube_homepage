import { describe, expect, it } from 'vitest'
import { buildDocumentMetadataUpdates } from '@/lib/document-metadata-update'

const baseDoc = {
  id: 'doc-1',
  customer_id: 'cust-1',
  document_type: 'vertrag' as const,
  pet_id: null,
  description: 'Betreuungsvertrag',
  page_category: null,
}

describe('buildDocumentMetadataUpdates', () => {
  it('allows changing description on vertrag', () => {
    const result = buildDocumentMetadataUpdates(baseDoc, {
      description: 'Aktualisierter Vertrag',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.updates.description).toBe('Aktualisierter Vertrag')
    }
  })

  it('requires pet when switching to wurmtest', () => {
    const result = buildDocumentMetadataUpdates(baseDoc, {
      document_type: 'wurmtest',
    })
    expect(result.ok).toBe(false)
  })

  it('clears pet and page category when switching to vertrag', () => {
    const result = buildDocumentMetadataUpdates(
      {
        ...baseDoc,
        document_type: 'impfpass',
        pet_id: 'pet-1',
        page_category: 'impfung',
      },
      { document_type: 'vertrag' }
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.updates.document_type).toBe('vertrag')
      expect(result.updates.pet_id).toBeNull()
      expect(result.updates.page_category).toBeNull()
    }
  })

  it('sets default page category when switching to impfpass', () => {
    const result = buildDocumentMetadataUpdates(
      { ...baseDoc, pet_id: 'pet-1' },
      { document_type: 'impfpass', pet_id: 'pet-1' }
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.updates.document_type).toBe('impfpass')
      expect(result.updates.page_category).toBe('sonstiges')
      expect(result.checkImpfpassLimitPetId).toBe('pet-1')
    }
  })
})
