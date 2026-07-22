import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  normalizeCustomerDocumentStoragePath,
} from '@/lib/customer-documents'
import { sendContractEmail, type EmailDelivery } from '@/lib/email'

export type ContractDocument = {
  id: string
  file_path: string
  file_name: string
}

export async function findContractDocument(
  supabase: SupabaseClient,
  customerId: string,
  documentId?: string
): Promise<ContractDocument | null> {
  if (documentId) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_path, file_name')
      .eq('id', documentId)
      .eq('customer_id', customerId)
      .eq('document_type', 'vertrag')
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, file_path, file_name')
    .eq('customer_id', customerId)
    .eq('document_type', 'vertrag')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function downloadContractPdf(
  supabase: SupabaseClient,
  document: ContractDocument
): Promise<Buffer> {
  const storagePath = normalizeCustomerDocumentStoragePath(document.file_path)
  const { data, error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw new Error(error?.message || 'Vertrags-PDF konnte nicht geladen werden')
  }

  return Buffer.from(await data.arrayBuffer())
}

export async function updateContractEmailStatus(
  supabase: SupabaseClient,
  customerId: string,
  delivery: EmailDelivery
): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({
      contract_email_status: delivery.status,
      contract_email_error: delivery.error,
      contract_email_sent_at: delivery.status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', customerId)

  if (error) {
    console.error('Vertrags-Mail-Status konnte nicht gespeichert werden:', error)
  }
}

export async function sendStoredContractEmail(
  supabase: SupabaseClient,
  options: {
    customerId: string
    email: string
    name: string
    documentId?: string
  }
): Promise<EmailDelivery & { documentId?: string }> {
  const document = await findContractDocument(supabase, options.customerId, options.documentId)

  if (!document) {
    const delivery: EmailDelivery = {
      status: 'failed',
      error: 'Kein unterzeichneter Vertrag gefunden',
    }
    await updateContractEmailStatus(supabase, options.customerId, delivery)
    return delivery
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await downloadContractPdf(supabase, document)
  } catch (error) {
    const delivery: EmailDelivery = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Vertrags-PDF konnte nicht geladen werden',
    }
    await updateContractEmailStatus(supabase, options.customerId, delivery)
    return { ...delivery, documentId: document.id }
  }

  const delivery = await sendContractEmail({
    email: options.email,
    name: options.name,
    pdfBuffer,
    fileName: document.file_name || 'Pflegevertrag.pdf',
  })

  await updateContractEmailStatus(supabase, options.customerId, delivery)

  console.info('Vertrags-Mail-Versand', {
    customerId: options.customerId,
    documentId: document.id,
    email: options.email,
    status: delivery.status,
    error: delivery.error,
  })

  return { ...delivery, documentId: document.id }
}
