import { RECHTLICHES_CANONICAL, RECHTLICHES_NOINDEX } from '@/lib/rechtliches-config'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCMSContent } from '@/lib/cms'
import { getLegalContent, type LegalPageKey } from '@/lib/cms/legal-defaults'
import { getBetreuungsvertragLegal } from '@/lib/betreuungsvertrag'
import { LegalContent } from '@/components/legal-content'
import { RechtlichesShell } from '@/components/rechtliches/rechtliches-shell'

type MinimalLegalPageProps = {
  legalKey: LegalPageKey
}

async function loadPageLegal(legalKey: LegalPageKey) {
  if (legalKey === 'agb') {
    return getBetreuungsvertragLegal()
  }
  const data = await getCMSContent(legalKey)
  return getLegalContent(data, legalKey)
}

export async function MinimalLegalPage({ legalKey }: MinimalLegalPageProps) {
  const legal = await loadPageLegal(legalKey)

  return (
    <RechtlichesShell variant="document">
      <Link
        href="/rechtliches"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sage-700 hover:text-sage-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Zurück zur Übersicht
      </Link>

      <article className="rounded-xl border border-sage-200 bg-white shadow-sm overflow-hidden">
        <header className="border-b border-sage-100 bg-sage-50/80 px-5 py-4">
          <h1 className="text-lg font-raleway font-bold text-sage-900">{legal.title}</h1>
        </header>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-5">
          <LegalContent html={legal.content} className="text-sm" />
        </div>
      </article>
    </RechtlichesShell>
  )
}

export async function getMinimalLegalMetadata(legalKey: LegalPageKey) {
  const legal = await loadPageLegal(legalKey)

  return {
    title: `${legal.title} - tierisch gut betreut`,
    description: legal.title,
    alternates: {
      canonical: RECHTLICHES_CANONICAL[legalKey],
    },
    ...RECHTLICHES_NOINDEX,
  }
}
