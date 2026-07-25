import type { Metadata } from 'next'
import { MinimalLegalPage, getMinimalLegalMetadata } from '@/components/rechtliches/minimal-legal-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return getMinimalLegalMetadata('impressum')
}

export default function ImpressumRechtlichesPage() {
  return <MinimalLegalPage legalKey="impressum" />
}
