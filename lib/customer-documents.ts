export const CUSTOMER_DOCUMENTS_BUCKET = 'customer-documents'
export const CUSTOMER_DOCUMENT_SIGNED_URL_TTL = 60

export const ALLOWED_CUSTOMER_DOCUMENT_TYPES = ['vertrag', 'impfpass', 'wurmtest'] as const

export type CustomerDocumentType = (typeof ALLOWED_CUSTOMER_DOCUMENT_TYPES)[number]

export function buildCustomerDocumentStoragePath(
  customerId: string,
  documentType: string,
  fileExt: string
): string {
  return `${customerId}/${documentType}/${Date.now()}.${fileExt}`
}

export function normalizeCustomerDocumentStoragePath(filePath: string): string {
  const prefix = `${CUSTOMER_DOCUMENTS_BUCKET}/`
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath
}
