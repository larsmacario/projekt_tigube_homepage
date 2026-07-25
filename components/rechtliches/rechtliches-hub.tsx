import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getCMSContent } from '@/lib/cms'
import { getLegalContent } from '@/lib/cms/legal-defaults'
import { RECHTLICHES_LINKS } from '@/lib/rechtliches-config'
import { RechtlichesShell } from '@/components/rechtliches/rechtliches-shell'

export async function RechtlichesHub() {
  const linkItems = await Promise.all(
    RECHTLICHES_LINKS.map(async (item) => {
      const data = await getCMSContent(item.cmsKey)
      const legal = getLegalContent(data, item.cmsKey)
      return {
        href: item.href,
        label: legal.title || item.label,
      }
    })
  )

  return (
    <RechtlichesShell variant="hub">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-white shadow-md mb-4">
          <Image
            src="/images/tigube_logo_hund.jpg"
            alt="tierisch gut betreut"
            fill
            className="object-cover"
            sizes="96px"
            priority
          />
        </div>
        <h1 className="text-xl font-raleway font-black text-sage-900">tierisch gut betreut</h1>
        <p className="mt-2 text-sm text-sage-600">Rechtliche Informationen</p>
      </div>

      <nav className="flex flex-col gap-3 w-full" aria-label="Rechtliche Seiten">
        {linkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-sage-200 bg-white px-5 py-4 text-left font-semibold text-sage-900 shadow-sm transition-colors hover:bg-sage-50 active:bg-sage-100"
          >
            <span>{item.label}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-500" aria-hidden />
          </Link>
        ))}
      </nav>

      <p className="mt-8 text-center text-xs text-sage-500">
        © {new Date().getFullYear()} tierisch gut betreut GmbH
      </p>
    </RechtlichesShell>
  )
}
