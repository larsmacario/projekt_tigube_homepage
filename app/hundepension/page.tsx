import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookingModal } from "@/components/booking-modal"
import { 
  Home, 
  Heart, 
  Clock, 
  Shield, 
  TreePine, 
  Check, 
  Star,
  Info,
  AlertCircle,
  MessageCircle
} from "lucide-react"
import Image from "next/image"
import { getCMSContent } from "@/lib/cms"

const defaultReasons = [
  "Du arbeiten gehst und Dein Hund nicht allein zu Hause bleiben soll bzw. kann",
  "Du einen Plan B für Deine aktuelle Betreuung suchst", 
  "Du in Urlaub / in Kur gehst oder ins Krankenhaus kommst",
  "Du ein Hunde freies Wochenende machen möchtest",
  "Dein Hund Zeit mit Hundefreunden verbringen soll"
]

const defaultQualifications = [
  {
    title: "Hundetrainer & Problemhunde-Therapeut",
    description: "Unsere Ausbildungen befähigen uns auch für den Umgang mit verhaltens-originellen Hunden."
  },
  {
    title: "Spezialbetreuung",
    description: "Betreuung von Schutz-, Polizei- und Zollhunden ist möglich, da wir diese von anderen Gast-Hunden separieren können."
  },
  {
    title: "Sporthunde-Trainer",
    description: "Artgerechte, körperliche Auslastung über den Tag verteilt - dem Alter und Fitnessgrad Deines Hundes angepasst."
  }
]

const defaultActivities = [
  "Kleine sportliche Einheiten",
  "Wasserspiele im Sommer", 
  "Artgerechte körperliche und geistige Auslastung",
  "Erholungs- und Ruhephasen"
]

const defaultPriceList = [
  {
    service: "Kennenlernen",
    price: "49€",
    duration: "60 Minuten",
    note: "Eine Betreuung ohne Erstgespräch ist nicht möglich. Ein Probetag für die Tagesbetreuung is sinnvoll, ein bis zwei Übernachtungen vor einem Urlaubsaufenthalt sind ein Muss."
  },
  {
    service: "Hündin/Rüde, verträglich",
    price: "31€",
    duration: "je Kalendertag"
  },
  {
    service: "Rüde, unkastriert", 
    price: "39€",
    duration: "je Kalendertag"
  },
  {
    service: "Hündin/Rüde, unverträglich/aggressiv",
    price: "55€", 
    duration: "je Kalendertag"
  }
]

const defaultAdditionalServices = [
  { service: "Übernachtung", price: "10€", unit: "je Nacht" },
  { service: "Läufige Hündin/inkontinenter Hund/Hunde bis 6 Monate", price: "8€", unit: "je angefangenem Tag" },
  { service: "Medikamentengabe/Nahrungsergänzung", price: "1,50€", unit: "je Gabe" },
  { service: "Fütterung BARF/gekocht, tiefgefroren (mitgebracht)", price: "1,50€", unit: "je Fütterung" },
  { service: "Zwischenreinigung der Box aufgrund Markierens, Durchfall, etc.", price: "25€", unit: "pauschal" },
  { service: "Sonn- und Feiertagspauschale", price: "50%", unit: "Zuschlag auf Tagespreis" },
  { service: "An- und Abreise an Sonn- und Feiertagen", price: "19€", unit: "pauschal" }
]

const defaultCancellationPolicy = [
  { period: "15 Tage und mehr vor Check-In", refund: "100% Rückerstattung" },
  { period: "14 - 7 Tage vor Check-In", refund: "50% Rückerstattung" },
  { period: "6 Tage und weniger vor Check-In", refund: "keine Rückerstattung" }
]

const defaultPickupTimes = [
  { days: "Montag - Freitag", times: "7-8h / 12-14h (nur mit festem Termin) / 17-18h" },
  { days: "Samstag - Sonn-/Feiertag", times: "9-10h / 17-18h" }
]

export default async function HundepensionPage() {
  const data = await getCMSContent('hundepension')

  const badge = data?.badge || "Hundepension"
  const heroSubtitle = data?.heroSubtitle || "Tages- und Urlaubsbetreuung für Deinen Hund"
  const heroIntroText = data?.heroIntroText || "Du suchst Unterstützung in der Betreuung, weil:"
  const heroChecklist = data?.heroChecklist || defaultReasons
  const heroPriceBadge = data?.heroPriceBadge || "ab 31€/Tag"
  const heroImageSrc = data?.heroImageSrc || "/images/pexels-thijsvdw-998251.jpg"

  const qTitle = data?.qualificationsTitle || "Unsere Qualifikationen"
  const qSubtitle = data?.qualificationsSubtitle || "Langjährige Erfahrung mit den unterschiedlichsten Rassen und Charakteren"
  const qList = data?.qualificationsList || defaultQualifications

  const actTitle = data?.activitiesTitle || "Bei uns darf Dein Hund ein Hund sein"
  const actSubtitle = data?.activitiesSubtitle || "Eine zusätzliche Ausbildung zum Sporthunde-Trainer garantiert die artgerechte, körperliche Auslastung über den Tag verteilt - dem Alter und Fitnessgrad Deines Hundes angepasst."
  const actList = data?.activitiesList || defaultActivities
  const actSummary = data?.activitiesSummary || "Artgerechte körperliche und geistige Auslastung gepaart mit Erholungs- und Ruhephasen sorgen dafür, dass Du einen zufriedenen, ausgeglichenen Hund wieder bei uns abholst."

  const pTitle = data?.priceListTitle || "Unsere Preise"
  const pSubtitle = data?.priceListSubtitle || "Transparente Preisgestaltung für alle Leistungen"
  const pList = data?.priceList || defaultPriceList

  const addTitle = data?.additionalServicesTitle || "Zusätzliche Leistungen"
  const addList = data?.additionalServices || defaultAdditionalServices

  const cancelTitle = data?.cancellationPolicyTitle || "Stornierungsbedingungen"
  const cancelList = data?.cancellationPolicy || defaultCancellationPolicy

  const pickTitle = data?.pickupTimesTitle || "Bring- und Holzeiten"
  const pickList = data?.pickupTimesList || defaultPickupTimes

  const warnTitle = data?.warningBoxTitle || "Achtung"
  const warnNotes = data?.warningBoxNotes || [
    "Individuelle Bring- und Holzeiten außerhalb der angegebenen Zeiten zzgl. 8€/Termin",
    "Urlaubsgäste, die unter der Woche vor 7h und am Wochenende/Feiertagen vor 8h gebracht werden sollten, müssen am Tag davor anreisen (abends nur für Stammgäste möglich)",
    "Hunde, die abends nicht bis spätestens 20h geholt werden können, bleiben kostenpflichtig über Nacht bei uns"
  ]
  const warnSummary = data?.warningBoxSummary || "Wir bitten um Pünktlichkeit beim Bringen und Holen, da wir ein sehr strenges Programm haben - Hundebetreuung ist viel mehr als Gassi gehen, spielen und schmusen."

  const ctaTitle = data?.contactCtaTitle || "Wenn das für Dich interessant klingt..."
  const ctaSubtitle = data?.contactCtaSubtitle || "...dann lass uns wissen, wie wir Dich in der Betreuung unterstützen können."
  const ctaWhatsApp = data?.contactCtaWhatsAppUrl || "https://wa.me/491754685977"
  const ctaInfo = data?.contactCtaInfo || "Kontakt: +49 175 4685977 (WhatsApp/Anruf) • info@tierischgutbetreut.de"

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
                      <Check className="h-5 w-5 text-sage-600 mt-1 flex-shrink-0" />
                      <span className="text-gray-600">{reason}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                <BookingModal animalType="dog">
                  <Button className="bg-sage-600 hover:bg-sage-700 text-white" size="lg">
                    Jetzt unverbindlich anfragen
                  </Button>
                </BookingModal>
              </div>
            </div>
            <div className="relative flex justify-center">
              <div className="relative">
                <Image
                  src={heroImageSrc}
                  alt="Glückliche Hunde in der Hundepension"
                  width={675}
                  height={450}
                  className="rounded-2xl shadow-lg border-8 border-white"
                  priority
                />
                <div className="absolute top-4 right-4 bg-sage-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                  {heroPriceBadge}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qualifications Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {qTitle}
            </h2>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              {qSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {qList.map((qual: any, index: number) => (
              <Card key={index} className="border-sage-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-sage-600" />
                  </div>
                  <CardTitle className="text-sage-900">{qual.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{qual.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="py-16 lg:py-24 bg-sage-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {actTitle}
            </h2>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              {actSubtitle}
            </p>
          </div>

          {actList && actList.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {actList.map((activity: string, index: number) => (
                <Card key={index} className="border-sage-200">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-center gap-3 text-center">
                      <TreePine className="h-5 w-5 text-sage-600 flex-shrink-0" />
                      <span className="font-semibold text-sage-900">{activity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {actSummary && (
            <div className="mt-16 text-center">
              <div className="bg-sage-600 text-white p-8 rounded-2xl max-w-4xl mx-auto">
                <p className="text-lg font-medium">
                  {actSummary}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 lg:py-24">
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
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {pList.map((item: any, index: number) => (
              <Card key={index} className="border-sage-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sage-900">{item.service}</CardTitle>
                      <p className="text-sm text-gray-600">{item.duration}</p>
                    </div>
                    <div className="text-2xl font-bold text-sage-600">{item.price}</div>
                  </div>
                </CardHeader>
                {item.note && (
                  <CardContent>
                    <p className="text-sm text-gray-600 bg-sage-50 p-3 rounded-lg">
                      <Info className="h-4 w-4 inline mr-2" />
                      {item.note}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Additional Services */}
          <div className="mb-12">
            <h3 className="font-raleway text-2xl font-bold text-sage-900 mb-6 text-center">
              {addTitle}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {addList.map((service: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-4 bg-sage-50 rounded-lg">
                  <span className="text-gray-700">{service.service}</span>
                  <span className="font-semibold text-sage-900">
                    {service.price} {service.unit ? `${service.unit}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="mb-12">
            <h3 className="font-raleway text-2xl font-bold text-sage-900 mb-6 text-center">
              {cancelTitle}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
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
        </div>
      </section>

      {/* Important Information */}
      <section className="py-16 lg:py-24 bg-sage-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
              {warnTitle}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {warnTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-orange-800">
                {warnNotes.map((note: string, index: number) => (
                  <p key={index}>• {note}</p>
                ))}
              </CardContent>
            </Card>

            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="text-sage-900 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {pickTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pickList.map((time: any, index: number) => (
                  <div key={index} className="border-l-4 border-sage-600 pl-4">
                    <div className="font-semibold text-sage-900">{time.days}</div>
                    <div className="text-gray-600">{time.times}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {warnSummary && (
            <div className="bg-sage-600 text-white p-6 rounded-lg text-center">
              <p className="text-lg font-medium">
                {warnSummary}
              </p>
            </div>
          )}
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