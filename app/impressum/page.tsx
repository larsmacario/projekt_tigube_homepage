import { FileText } from "lucide-react"
import Link from "next/link"
import { getCMSContent } from "@/lib/cms"
import { getLegalContent } from "@/lib/cms/legal-defaults"
import { LegalContent } from "@/components/legal-content"
import type { Metadata } from "next"

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCMSContent('impressum')
  const title = data?.title || "Impressum"
  
  return {
    title: `${title} - Tierisch Gut Betreut`,
    description: "Rechtliche Angaben und gesetzliche Informationen der tierisch gut betreut GmbH in Moos.",
    alternates: {
      canonical: "/impressum",
    },
    openGraph: {
      title: `${title} - Tierisch Gut Betreut`,
      description: "Rechtliche Angaben und gesetzliche Informationen der tierisch gut betreut GmbH in Moos.",
      url: "/impressum",
    }
  }
}

export default async function ImpressumPage() {
  const data = await getCMSContent('impressum')
  const legal = getLegalContent(data, 'impressum')

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100">
      <section className="py-16 lg:py-24 bg-sage-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-raleway font-black text-white mb-6">
            {legal.title}
          </h1>
          <p className="text-xl text-sage-100 max-w-2xl mx-auto">
            Rechtliche Informationen und gesetzliche Angaben unseres Tierbetreuungsservices
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 bg-white rounded-lg shadow-lg p-8">
          <LegalContent html={legal.content} />

          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/datenschutz" className="text-sage-600 hover:text-sage-700 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Datenschutz
              </Link>
              <Link href="/" className="text-sage-600 hover:text-sage-700">
                Zurück zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
