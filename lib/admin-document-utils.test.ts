import { describe, expect, it } from 'vitest'
import { isImageDocument, isPdfDocument } from '@/lib/admin-document-utils'
import type { Document } from '@/lib/types'

function makeDoc(overrides: Partial<Document>): Document {
  return {
    id: '1',
    customer_id: 'c1',
    pet_id: null,
    document_type: 'vertrag',
    page_category: null,
    description: null,
    file_path: 'path/file.pdf',
    file_name: 'file.pdf',
    file_size: 100,
    mime_type: 'application/pdf',
    uploaded_at: '2026-01-01',
    created_at: '2026-01-01',
    ...overrides,
  }
}

describe('admin-document-utils', () => {
  it('detects image documents by mime type', () => {
    expect(isImageDocument(makeDoc({ mime_type: 'image/jpeg', file_name: 'photo.jpg' }))).toBe(
      true
    )
    expect(isImageDocument(makeDoc({ mime_type: 'application/pdf', file_name: 'doc.pdf' }))).toBe(
      false
    )
  })

  it('detects pdf documents by mime type or extension', () => {
    expect(isPdfDocument(makeDoc({ mime_type: 'application/pdf', file_name: 'doc.pdf' }))).toBe(
      true
    )
    expect(isPdfDocument(makeDoc({ mime_type: null, file_name: 'Vertrag.PDF' }))).toBe(true)
    expect(isPdfDocument(makeDoc({ mime_type: 'image/png', file_name: 'photo.png' }))).toBe(false)
  })
})
