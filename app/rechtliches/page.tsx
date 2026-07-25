import type { Metadata } from 'next'
import { RechtlichesHub } from '@/components/rechtliches/rechtliches-hub'
import { RECHTLICHES_NOINDEX } from '@/lib/rechtliches-config'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Rechtliches - tierisch gut betreut',
  description:
    'Betreuungsvertrag, Datenschutzerklärung und Impressum der tierisch gut betreut GmbH.',
  ...RECHTLICHES_NOINDEX,
  openGraph: {
    title: 'Rechtliches - tierisch gut betreut',
    description:
      'Betreuungsvertrag, Datenschutzerklärung und Impressum der tierisch gut betreut GmbH.',
    url: '/rechtliches',
    images: [
      {
        url: '/images/tigube_logo_hund.jpg',
        width: 1200,
        height: 630,
        alt: 'Tierisch Gut Betreut Logo',
      },
    ],
  },
}

export default function RechtlichesPage() {
  return <RechtlichesHub />
}
