import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { requireAdmin } from '@/lib/admin-auth'
import {
  addCustomerToZip,
  buildSingleCustomerZipFilename,
  generateZipBuffer,
} from '@/lib/admin-bulk-export'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const zip = new JSZip()
    const usedFolderNames = new Set<string>()
    const result = await addCustomerToZip(
      zip,
      auth.client,
      params.id,
      usedFolderNames
    )

    const { data: customer } = await auth.client
      .from('contacts')
      .select('nachname, vorname')
      .eq('id', params.id)
      .eq('contact_type', 'customer')
      .maybeSingle()

    const buffer = await generateZipBuffer(zip)
    const filename = buildSingleCustomerZipFilename(
      customer ?? { nachname: result.folderName, vorname: null }
    )

    if (result.documentErrors.length > 0) {
      console.warn('Bulk export completed with document warnings:', result.documentErrors)
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    console.error('Single customer bulk export error:', error)
    const message = error instanceof Error ? error.message : 'Export fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
