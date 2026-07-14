import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookingModal } from "@/components/booking-modal"
import { 
  Home, 
  Clock, 
  Shield, 
  Phone,
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
  Car,
  Pill,
  Key,
  MessageCircle
} from "lucide-react"
import Image from "next/image"
import { getCMSContent } from "@/lib/cms"
import type { Metadata } from "next"

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCMSContent('katzenbetreuung')
  const title = data?.badge || "Katzenbetreuung"
  const subtitle = data?.heroSubtitle || "Deine Samtpfote in besten Händen"
  
  return {
    title: `${title} | ${subtitle} - Tierisch Gut Betreut`,
    description: "Liebevolle und professionelle mobile Katzenbetreuung in Moos und Umgebung. Füttern, Beschäftigung & Pflege in gewohnter Umgebung.",
    alternates: {
      canonical: "/katzenbetreuung",
    },
    openGraph: {
      title: `${title} | ${subtitle}`,
      description: "Liebevolle und professionelle mobile Katzenbetreuung in Moos und Umgebung. Füttern, Beschäftigung & Pflege in gewohnter Umgebung.",
      url: "/katzenbetreuung",
      images: [
        {
          url: data?.heroImageSrc || "/images/pexels-kerber-774731.jpg",
          alt: "Katzenbetreuung",
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${subtitle}`,
      description: "Liebevolle mobile Katzenbetreuung in Moos und Umgebung.",
      images: [data?.heroImageSrc || "/images/pexels-kerber-774731.jpg"],
    }
  }
}

const defaultServices = [
  "Füttern",
  "Näpfe reinigen",
  "Frisches Wasser",
  "Spielen, bürsten, beschäftigen",
  "Gesellschaft leisten",
  "Missgeschicke bereinigen"
]

const defaultPriceList = [
  {
    service: "Erstgespräch",
    price: "25€",
    duration: "ca. 30 Min vor Ort"
  },
  {
    service: "1 Besuch/Tag",
    price: "14,50€",
    duration: "ca. 30 Min je Besuch"
  },
  {
    service: "2 Besuche/Tag", 
    price: "12,50€",
    duration: "ca. 30 Min je Besuch"
  }
]

const defaultAdditionalServices = [
  { service: "Streu komplett tauschen", price: "10€", unit: "pauschal" },
  { service: "Medikamentengabe", price: "1,50€", unit: "je Gabe" },
  { service: "Schlüssel holen/bringen", price: "5€", unit: "je holen und bringen" },
  { service: "Fahrtkosten", price: "0,55€/km", unit: "An- und Abfahrt" },
  { service: "Sonn- und Feiertagszuschlag", price: "50%", unit: "auf den vereinbarten Tagespreis" }
]

const defaultCancellationPolicy = [
  { period: "15 Tage und mehr vor Betreuungsbeginn", refund: "100% Rückerstattung" },
  { period: "14-7 Tage vor Betreuungsbeginn", refund: "50% Rückerstattung" },
  { period: "6 Tage und weniger vor Betreuungsbeginn", refund: "keine Rückerstattung" }
]

const defaultImportantNotes = [
  "Alle Preise verstehen sich netto, auf der Rechnung werden 19% USt. ausgewiesen",
  "Die Steuer kann beim Finanzamt als 'haushaltsnahe Dienstleistung' abgesetzt werden",
  "Leistungen werden im Voraus beim Erstgespräch definiert und in einem Angebot zugesandt",
  "Medikamentengabe nur möglich, wenn die Katze zutraulich ist",
  "Rechnungsbetrag ist vor Betreuungsbeginn in voller Höhe zu begleichen",
  "Im Preis enthalten ist eine Haftpflichtversicherung gegen Schäden oder Schlüsselverlust"
]

const priceIcons: Record<string, any> = {
  "Erstgespräch": Calendar,
  "1 Besuch/Tag": Clock,
  "2 Besuche/Tag": Clock,
}

const addIcons: Record<string, any> = {
  "Streu komplett tauschen": Home,
  "Medikamentengabe": Pill,
  "Schlüssel holen/bringen": Key,
  "Fahrtkosten": Car,
  "Sonn- und Feiertagszuschlag": Calendar,
}

export default async function KatzenbetreuungPage() {
  const data = await getCMSContent('katzenbetreuung')

  const title = data?.title || "Katzenbetreuung"
  const badge = data?.badge || "Katzenbetreuung"
  const heroSubtitle = data?.heroSubtitle || "Deine Samtpfote in besten Händen"
  const heroIntroText = data?.heroIntroText || "Katzen lieben ihre gewohnte Umgebung. Sie in Urlaub außer Haus zu geben, bringt ihr ordentlich Stress. Die Betreuung in gewohnter Umgebung ist die beste Lösung für die Zeit Deiner Abwesenheit. Ist Deine Mieze ein Freigänger, so kann sie ihren ganz normalen Gewohnheiten nachgehen."
  const heroChecklist = data?.heroChecklist || []
  const heroPriceBadge = data?.heroPriceBadge || "ab 12,50€/Besuch"
  const heroImageSrc = data?.heroImageSrc || "/images/pexels-kerber-774731.jpg"

  const qTitle = data?.qualificationsTitle || "Unsere Katzenbetreuung beinhaltet"
  const qSubtitle = data?.qualificationsSubtitle || "Ein Besuch dauert 30 Minuten und umfasst alle wichtigen Leistungen für das Wohlbefinden Deiner Katze."
  const qList = data?.qualificationsList || defaultServices

  const actTitle = data?.activitiesTitle || "Zusätzliche Betreuungs-Hinweise"
  const actSubtitle = data?.activitiesSubtitle || "Selbstverständlich wird das Katzenkistchen gereinigt (nur Hinterlassenschaften, keine Vollreinigung) und um das Katzenkistchen gefegt."

  const pTitle = data?.priceListTitle || "Preise"
  const pSubtitle = data?.priceListSubtitle || "Transparente Preisgestaltung für alle Leistungen"
  const pList = data?.priceList || defaultPriceList

  const addTitle = data?.additionalServicesTitle || "Zusätzliche Leistungen"
  const addList = data?.additionalServices || defaultAdditionalServices

  const cancelTitle = data?.cancellationPolicyTitle || "Stornierungsbedingungen"
  const cancelList = data?.cancellationPolicy || defaultCancellationPolicy

  const warnTitle = data?.warningBoxTitle || "Wichtige Hinweise"
  const warnNotes = data?.warningBoxNotes || defaultImportantNotes
  const warnSummary = data?.warningBoxSummary || "Für einen genauen Betreuungspreis machen wir Dir ein unverbindliches Angebot. Betreuungstage werden nicht zurückerstattet bei vorzeitiger Rückkehr aus dem Urlaub. Bitte rechtzeitig absagen. Reservierte Zeit wird bei Nichterscheinen in voller Höhe in Rechnung gestellt."

  const ctaTitle = data?.contactCtaTitle || "Deine Samtpfote verdient die beste Betreuung"
  const ctaSubtitle = data?.contactCtaSubtitle || "Vereinbare jetzt ein unverbindliches Erstgespräch und lass uns gemeinsam die perfekte Betreuung für Deine Katze planen."
  const ctaWhatsApp = data?.contactCtaWhatsAppUrl || "https://wa.me/4917672404561"
  const ctaInfo = data?.contactCtaInfo || "Kontakt: 0176-724 045 61 (WhatsApp/Anruf) • info@tierischgutbetreut.de"

  return (
    <main className="pt-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-sage-50 to-sage-100 py-16 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-sage-600 text-white mb-4">{badge}</Badge>
              <h1 className="font-raleway text-4xl lg:text-5xl font-bold text-sage-900 mb-6">
                {heroSubtitle}
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {heroIntroText}
              </p>
              {heroChecklist && heroChecklist.length > 0 && (
                <ul className="space-y-3 mb-8">
                  {heroChecklist.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-sage-600 mt-1 flex-shrink-0" />
                      <span className="text-gray-600">{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <BookingModal animalType="cat">
                  <Button className="bg-sage-600 hover:bg-sage-700 text-white" size="lg">
                    Jetzt unverbindlich anfragen
                  </Button>
                </BookingModal>
              </div>
            </div>
            <div className="relative">
              <Image
                src={heroImageSrc}
                alt="Katze in gewohnter Umgebung"
                width={600}
                height={400}
                className="rounded-2xl shadow-lg border-8 border-white"
                priority
              />
              <div className="absolute top-4 right-4 bg-sage-600 text-white px-4 py-2 rounded-full font-semibold">
                {heroPriceBadge}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {qTitle}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {qSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {qList.map((service: any, index: number) => (
              <Card key={index} className="border-sage-200 hover:shadow-lg transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="h-5 w-5 text-sage-600 flex-shrink-0" />
                    <span className="text-gray-700 text-center">
                      {service.title || service}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {actSubtitle && (
            <div className="mt-12 text-center">
              <div className="bg-sage-50 p-6 rounded-lg max-w-4xl mx-auto">
                <p className="text-sage-800 font-medium">
                  {actSubtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 lg:py-24 bg-sage-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {pTitle}
            </h2>
            <p className="text-lg text-gray-600">
              {pSubtitle}
            </p>
          </div>

          {/* Main Prices */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {pList.map((item: any, index: number) => {
              const Icon = priceIcons[item.service] || Clock
              return (
                <Card key={index} className="border-sage-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-sage-600" />
                    </div>
                    <CardTitle className="text-sage-900">{item.service}</CardTitle>
                    <div className="text-3xl font-bold text-sage-600 mt-2">{item.price}</div>
                    <p className="text-sm text-gray-600">{item.duration}</p>
                  </CardHeader>
                </Card>
              )
            })}
          </div>

          {/* Additional Services */}
          <div className="mb-12">
            <h3 className="font-raleway text-2xl font-bold text-sage-900 mb-6 text-center">
              {addTitle}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {addList.map((service: any, index: number) => {
                const Icon = addIcons[service.service] || Home
                return (
                  <Card key={index} className="border-sage-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-sage-600" />
                          <span className="text-gray-700">{service.service}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sage-900">{service.price}</div>
                          <div className="text-sm text-gray-600">{service.unit}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Cancellation Policy */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {cancelTitle}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {cancelList.map((policy: any, index: number) => (
              <Card key={index} className="border-sage-200">
                <CardContent className="pt-6 text-center">
                  <div className="text-lg font-semibold text-sage-900 mb-2">
                    {policy.period}
                  </div>
                  <div className="text-sage-600">{policy.refund}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section className="py-16 lg:py-24 bg-sage-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {warnTitle}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-sage-900 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {title} Bedingungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {warnNotes.map((note: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-sage-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{note}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {warnTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-orange-800">
                <p>{warnSummary}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-16 lg:py-24 bg-sage-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-raleway text-3xl lg:text-4xl font-bold mb-6">
            {ctaTitle}
          </h2>
          <p className="text-lg text-sage-100 mb-8">
            {ctaSubtitle}
          </p>
          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="bg-green-600 text-white hover:bg-green-700"
              asChild
            >
              <a 
                href={ctaWhatsApp} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                WhatsApp schreiben
              </a>
            </Button>
          </div>
          <div className="mt-8 pt-8 border-t border-sage-500">
            <p className="text-sage-100">
              {ctaInfo}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}