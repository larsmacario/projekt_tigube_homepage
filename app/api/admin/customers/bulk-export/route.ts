import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { requireAdmin } from '@/lib/admin-auth'
import {
  addCustomerToZip,
  BULK_EXPORT_MAX_CUSTOMERS,
  buildBulkCustomersZipFilename,
  generateZipBuffer,
} from '@/lib/admin-bulk-export'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => null)
    const customerIds = Array.isArray(body?.customerIds)
      ? body.customerIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : []

    if (customerIds.length === 0) {
      return NextResponse.json(
        { error: 'Bitte mindestens einen Kunden auswählen.' },
        { status: 400 }
      )
    }

    if (customerIds.length > BULK_EXPORT_MAX_CUSTOMERS) {
      return NextResponse.json(
        {
          error: `Maximal ${BULK_EXPORT_MAX_CUSTOMERS} Kunden pro Export.`,
        },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    const usedFolderNames = new Set<string>()
    const failures: Array<{ customerId: string; reason: string }> = []
    const warnings: string[] = []

    for (const customerId of customerIds) {
      try {
        const result = await addCustomerToZip(zip, auth.client, customerId, usedFolderNames)
        if (result.documentErrors.length > 0) {
          warnings.push(
            ...result.documentErrors.map(
              (message) => `${result.folderName}/${message}`
            )
          )
        }
      } catch (error) {
        failures.push({
          customerId,
          reason: error instanceof Error ? error.message : 'Export fehlgeschlagen',
        })
      }
    }

    if (failures.length === customerIds.length) {
      return NextResponse.json(
        {
          error: 'Export für alle ausgewählten Kunden fehlgeschlagen.',
          failures,
        },
        { status: 500 }
      )
    }

    const buffer = await generateZipBuffer(zip)
    const filename = buildBulkCustomersZipFilename()

    if (failures.length > 0 || warnings.length > 0) {
      console.warn('Bulk export completed with issues:', { failures, warnings })
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(failures.length > 0
          ? { 'X-Export-Failures': String(failures.length) }
          : {}),
      },
    })
  } catch (error: unknown) {
    console.error('Bulk customer export error:', error)
    const message = error instanceof Error ? error.message : 'Export fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
