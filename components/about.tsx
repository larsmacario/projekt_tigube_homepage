import { Card, CardContent } from "@/components/ui/card"
import { Award, Heart, Users } from "lucide-react"
import Image from "next/image"

interface AboutProps {
  data?: {
    aboutTitle?: string
    aboutSubtitle?: string
    tamaraName?: string
    tamaraTexts?: string[]
    tamaraImage?: any
    gabrielName?: string
    gabrielTexts?: string[]
    gabrielImage?: any
    lunaTitle?: string
    lunaSubtitle?: string
    lunaImage?: any
    lunaDescription?: string
    aboutCtaText?: string
    aboutCtaSubtitle?: string
    statExperience?: string
    statExperienceLabel?: string
    statClients?: string
    statClientsLabel?: string
    statAnimals?: string
    statAnimalsLabel?: string
  } | null
}

export function About({ data }: AboutProps) {
  // Main
  const title = data?.aboutTitle || "(D)ein Team für alle Felle"
  const subtitle = data?.aboutSubtitle || "Wir sind da wenn Du uns brauchst! Ganz gleich, ob Du in den Urlaub fährst, krank bist, einen Termin beim Tierarzt oder Groomer aus Zeitgründen nicht wahrnehmen kannst oder Dein eigentlicher Gassigänger/Katzensitter ausfällt - wir sind gerne für Dich und Deine Fellnase da!"
  
  // Tamara
  const tamaraName = data?.tamaraName || "Tamara Pfaff"
  const tamaraTexts = data?.tamaraTexts || [
    "Mit Hunden und Katzen habe ich seit meiner Kindheit zu tun. Ob eigenes Haustier oder auch ehrenamtliche Hundenanny im Tierheim - ohne Fellnase war mein Leben noch nie!",
    "Aktuell beglückt mich unser Boxermädchen Luna mit ihrer Anwesenheit. Tiefes Verständnis für individuelle Bedürfnisse des einzelnen Tieres eignete ich mir in fachspezifischen Kursen und Ausbildungen, aber vor allem in der Praxis an.",
    "Als stellvertretende Leitung auf einem Schweizer Hunde-Gnadenhof konnte ich unglaublich viel Erfahrung mit verhaltensoriginellen Hunden sammeln. Für mich gibt es keine schwierigen Felle sondern nur große Herausforderungen! Und ich liebe Herausforderungen."
  ]
  const tamaraImg = typeof data?.tamaraImage === 'string' ? data.tamaraImage : "/images/tigube_Tamara_Pfaff.jpg"

  // Gabriel
  const gabrielName = data?.gabrielName || "Gabriel Haaga"
  const gabrielTexts = data?.gabrielTexts || [
    "Hunde waren mir als Kind nicht ganz geheuer. Als mich ein kleiner Dackel beim Spielen abschleckte dachte ich, der frisst mich gleich. Aber dem war nicht so!",
    "Das war verrückterweise der Beginn meiner großen Liebe zu Hunden. Mit Lunchen habe ich den ersten eigenen Hund und will natürlich mein Bestes geben im Umgang und in der Erziehung.",
    "Aus diesem Grund habe ich mit Mara zusammen eine Ausbildung zum Hundetrainer und Problemhunde-Therapeuten gemacht. Das Wissen kommt hier nicht nur bei uns zu Hause zum Einsatz, sondern vor allem im Umgang mit besonderen Hunden in unserer Pension."
  ]
  const gabrielImg = typeof data?.gabrielImage === 'string' ? data.gabrielImage : "/images/tigube_Gabriel_Haaga.jpg"

  // Luna
  const lunaTitle = data?.lunaTitle || "Unsere pelzigen Kollegen"
  const lunaSubtitle = data?.lunaSubtitle || "Luna ist nicht nur unser Familienmitglied, sondern auch unsere beste Lehrmeisterin. Sie zeigt uns täglich, was es heißt, bedingungslos zu lieben, im Moment zu leben und dass ein Leckerli alle Probleme der Welt lösen kann. Außerdem ist sie unsere strengste Qualitätsprüferin - wer bei ihr punktet, hat definitiv das Zeug zum Tierflüsterer! 🐕"
  const lunaImg = typeof data?.lunaImage === 'string' ? data.lunaImage : "/images/Boxer_Hund_Luna.jpg"
  const lunaDesc = data?.lunaDescription || "Boxermädchen mit Herz und Seele. Spezialistin für Herzensangelegenheiten und Chefin der Qualitätskontrolle bei Streicheleinheiten."

  // CTA
  const ctaText = data?.aboutCtaText || "Ab hier wäre ein richtig guter Zeitpunkt, Kontakt zu uns aufzunehmen, um ein unverbindliches Erstgespräch zu vereinbaren."
  const ctaSubtitle = data?.aboutCtaSubtitle || "Lass uns in aller Ruhe herausfinden, ob die Chemie zwischen allen Beteiligten stimmt. Ist dem so und alle wichtigen Fragen sind geklärt und Du mit unserem Angebot einverstanden, dann können wir die Betreuung in dringenden Fällen auch kurzfristig übernehmen."

  // Stats
  const statExp = data?.statExperience || "15+"
  const statExpLabel = data?.statExperienceLabel || "Jahre Erfahrung"
  const statCli = data?.statClients || "400+"
  const statCliLabel = data?.statClientsLabel || "Zufriedene Kunden"
  const statAnim = data?.statAnimals || "500+"
  const statAnimLabel = data?.statAnimalsLabel || "Betreute Tiere"

  return (
    <section className="py-16 lg:py-24 bg-sage-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">{title}</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Tamara Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <h3 className="font-raleway text-2xl font-bold text-sage-900">{tamaraName}</h3>
            {tamaraTexts.map((text, index) => (
              <p key={index} className="text-gray-600 leading-relaxed">
                {text}
              </p>
            ))}
          </div>

          <div className="relative">
            <Image
              src={tamaraImg}
              alt="Tamara Pfaff - Geschäftsführerin tierisch gut betreut"
              width={250}
              height={200}
              className="rounded-2xl shadow-lg w-full max-w-sm h-auto object-cover mx-auto"
            />
          </div>
        </div>

        {/* Gabriel Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative order-2 lg:order-1">
            <Image
              src={gabrielImg}
              alt="Gabriel Haaga - Geschäftsführer tierisch gut betreut"
              width={250}
              height={200}
              className="rounded-2xl shadow-lg w-full max-w-sm h-auto object-cover mx-auto"
            />
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <h3 className="font-raleway text-2xl font-bold text-sage-900">{gabrielName}</h3>
            {gabrielTexts.map((text, index) => (
              <p key={index} className="text-gray-600 leading-relaxed">
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* Unsere Hunde Section */}
        <div className="text-center mb-16">
          <h3 className="font-raleway text-2xl font-bold text-sage-900 mb-6">{lunaTitle}</h3>
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            {lunaSubtitle}
          </p>
          
          <div className="flex justify-center gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <Image
                src={lunaImg}
                alt="Luna - Boxermädchen von Tamara"
                width={250}
                height={200}
                className="rounded-2xl shadow-lg w-full max-w-xs h-auto object-cover mx-auto mb-4"
              />
              <h4 className="font-semibold text-sage-900 mb-2">Luna</h4>
              <p className="text-sm text-gray-600">
                {lunaDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mb-16">
          <div className="bg-sage-600 text-white p-8 rounded-2xl max-w-4xl mx-auto">
            <p className="text-lg font-medium mb-4">
              {ctaText}
            </p>
            <p className="text-sage-100">
              {ctaSubtitle}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-sage-200">
            <CardContent className="pt-8 pb-6">
              <Award className="h-12 w-12 text-sage-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-sage-900 mb-2">{statExp}</div>
              <div className="text-gray-600">{statExpLabel}</div>
            </CardContent>
          </Card>

          <Card className="text-center border-sage-200">
            <CardContent className="pt-8 pb-6">
              <Users className="h-12 w-12 text-sage-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-sage-900 mb-2">{statCli}</div>
              <div className="text-gray-600">{statCliLabel}</div>
            </CardContent>
          </Card>

          <Card className="text-center border-sage-200">
            <CardContent className="pt-8 pb-6">
              <Heart className="h-12 w-12 text-sage-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-sage-900 mb-2">{statAnim}</div>
              <div className="text-gray-600">{statAnimLabel}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

