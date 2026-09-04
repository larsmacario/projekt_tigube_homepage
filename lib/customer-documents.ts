export const CUSTOMER_DOCUMENTS_BUCKET = 'customer-documents'
export const CUSTOMER_DOCUMENT_SIGNED_URL_TTL = 60
export const MAX_CUSTOMER_DOCUMENT_BYTES = 10 * 1024 * 1024

export const ALLOWED_CUSTOMER_DOCUMENT_TYPES = ['vertrag', 'impfpass', 'wurmtest'] as const

export type CustomerDocumentType = (typeof ALLOWED_CUSTOMER_DOCUMENT_TYPES)[number]

export const ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export function buildCustomerDocumentStoragePath(
  customerId: string,
  documentType: string,
  fileExt: string,
  petId?: string | null
): string {
  if (documentType === 'impfpass' && petId) {
    return `${customerId}/${petId}/impfpass/${Date.now()}.${fileExt}`
  }
  return `${customerId}/${documentType}/${Date.now()}.${fileExt}`
}

export function normalizeCustomerDocumentStoragePath(filePath: string): string {
  const prefix = `${CUSTOMER_DOCUMENTS_BUCKET}/`
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath
}

export function getCustomerDocumentFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'bin'
}

export function resolveCustomerDocumentMimeType(file: Pick<File, 'name' | 'type'>): string | null {
  const normalizedType = file.type?.toLowerCase()
  if (normalizedType && ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES.has(normalizedType)) {
    return normalizedType === 'image/jpg' ? 'image/jpeg' : normalizedType
  }

  const extension = getCustomerDocumentFileExtension(file.name)
  return EXTENSION_TO_MIME[extension] ?? null
}

export function validateCustomerDocumentFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const mimeType = resolveCustomerDocumentMimeType(file)
  if (!mimeType) {
    return 'Nur PDF-, JPEG- oder PNG-Dateien sind erlaubt.'
  }
  if (file.size > MAX_CUSTOMER_DOCUMENT_BYTES) {
    return 'Die Datei darf maximal 10 MB groß sein.'
  }
  if (file.size <= 0) {
    return 'Die Datei ist leer.'
  }
  return null
}

export function getCustomerDocumentUploadMimeType(file: Pick<File, 'name' | 'type'>): string {
  return resolveCustomerDocumentMimeType(file) ?? 'application/octet-stream'
}

export function formatCustomerDocumentStorageError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('payload too large') || lower.includes('exceeded the maximum')) {
    return 'Die Datei ist zu groß. Bitte wähle eine Datei mit maximal 10 MB.'
  }
  if (lower.includes('mime type') || lower.includes('not allowed')) {
    return 'Dieser Dateityp ist nicht erlaubt. Bitte PDF, JPEG oder PNG verwenden.'
  }
  return message || 'Upload fehlgeschlagen'
}
