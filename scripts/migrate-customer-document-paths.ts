/**
 * Einmal-Migration: verschiebt Kundendokumente von
 * customer-documents/{customerId}/... nach {customerId}/...
 *
 * Ausführen: npx tsx scripts/migrate-customer-document-paths.ts
 * Benötigt: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import {
  CUSTOMER_DOCUMENTS_BUCKET,
  normalizeCustomerDocumentStoragePath,
} from '../lib/customer-documents'

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.'
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: documentsWithOldDbPath, error: oldPathError } = await supabase
    .from('documents')
    .select('id, file_path')
    .like('file_path', `${CUSTOMER_DOCUMENTS_BUCKET}/%`)

  if (oldPathError) {
    throw oldPathError
  }

  let movedCount = 0

  for (const document of documentsWithOldDbPath ?? []) {
    const oldPath = document.file_path
    const newPath = normalizeCustomerDocumentStoragePath(oldPath)

    console.log(`Verschiebe ${oldPath} -> ${newPath}`)

    const { error: moveError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .move(oldPath, newPath)

    if (moveError) {
      throw new Error(`Storage-Move fehlgeschlagen für ${document.id}: ${moveError.message}`)
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({ file_path: newPath })
      .eq('id', document.id)

    if (updateError) {
      throw new Error(`DB-Update fehlgeschlagen für ${document.id}: ${updateError.message}`)
    }

    movedCount += 1
    console.log(`OK: ${document.id}`)
  }

  const { data: allDocuments, error: allDocumentsError } = await supabase
    .from('documents')
    .select('id, file_path')

  if (allDocumentsError) {
    throw allDocumentsError
  }

  for (const document of allDocuments ?? []) {
    const newPath = normalizeCustomerDocumentStoragePath(document.file_path)
    const legacyPath = `${CUSTOMER_DOCUMENTS_BUCKET}/${newPath}`

    if (legacyPath === newPath) {
      continue
    }

    const { error: moveError } = await supabase.storage
      .from(CUSTOMER_DOCUMENTS_BUCKET)
      .move(legacyPath, newPath)

    if (moveError) {
      if (moveError.message.toLowerCase().includes('not found')) {
        continue
      }
      throw new Error(`Storage-only Move fehlgeschlagen für ${document.id}: ${moveError.message}`)
    }

    movedCount += 1
    console.log(`Storage-only OK: ${legacyPath} -> ${newPath}`)
  }

  if (movedCount === 0) {
    console.log('Keine Dokumente mit veraltetem Pfad gefunden.')
    return
  }

  console.log(`Migration abgeschlossen (${movedCount} Datei(en)).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
