import { describe, expect, it } from 'vitest'
import {
  getCustomerDocumentUploadMimeType,
  MAX_CUSTOMER_DOCUMENT_BYTES,
  resolveCustomerDocumentMimeType,
  validateCustomerDocumentFile,
} from '@/lib/customer-documents'

function makeFile(input: { name: string; type?: string; size?: number }): File {
  const size = input.size ?? 1024
  const blob = new Blob([new Uint8Array(size)], {
    type: input.type ?? '',
  })
  return new File([blob], input.name, { type: input.type ?? '' })
}

describe('customer-documents validation', () => {
  it('accepts pdf by mime type', () => {
    const file = makeFile({
      name: 'Nala_Impfpass.pdf',
      type: 'application/pdf',
      size: 5.3 * 1024 * 1024,
    })
    expect(validateCustomerDocumentFile(file)).toBeNull()
    expect(getCustomerDocumentUploadMimeType(file)).toBe('application/pdf')
  })

  it('accepts pdf by extension when mime type is empty', () => {
    const file = makeFile({
      name: '2026-09-03_13-01_Nala_Impfpass.PDF',
      type: '',
      size: 5.3 * 1024 * 1024,
    })
    expect(resolveCustomerDocumentMimeType(file)).toBe('application/pdf')
    expect(validateCustomerDocumentFile(file)).toBeNull()
  })

  it('rejects files larger than 10 MB', () => {
    const file = makeFile({
      name: 'large.pdf',
      type: 'application/pdf',
      size: MAX_CUSTOMER_DOCUMENT_BYTES + 1,
    })
    expect(validateCustomerDocumentFile(file)).toBe('Die Datei darf maximal 10 MB groß sein.')
  })

  it('rejects unsupported file types', () => {
    const file = makeFile({
      name: 'scan.heic',
      type: 'image/heic',
      size: 1024,
    })
    expect(validateCustomerDocumentFile(file)).toBe(
      'Nur PDF-, JPEG- oder PNG-Dateien sind erlaubt.'
    )
  })
})
