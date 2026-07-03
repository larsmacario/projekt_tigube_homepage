import { Button } from "@/components/ui/button"
import { Star, Heart, Shield } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface HeroProps {
  data?: {
    heroTitle?: string
    heroSubtitle?: string
    heroMainImage?: any
    heroSecondaryImage?: any
    heroTrustIndicators?: string[]
  } | null
}

export function Hero({ data }: HeroProps) {
  // Fallbacks
  const title = data?.heroTitle || "Tierbetreuung mit Herz und Verstand"
  const subtitle = data?.heroSubtitle || "Wir betreuen Ihre Lieblinge mit der Hingabe und Sorgfalt, die sie verdienen. Professionell, liebevoll und mit jahrelanger Erfahrung - damit Sie beruhigt sein können."
  const mainImageSrc = typeof data?.heroMainImage === 'string' ? data.heroMainImage : "/images/pexels-helenalopes-2253275.jpg"
  const secImageSrc = typeof data?.heroSecondaryImage === 'string' ? data.heroSecondaryImage : "/images/pexels-kirsten-buhne-682055-1521304.jpg"
  const trustIndicators = data?.heroTrustIndicators || [
    "Versichert & zertifiziert",
    "Über 400 zufriedene Kunden",
    "5/5 Sterne Bewertung"
  ]

  const trustIcons = [Shield, Heart, Star]

  return (
    <section className="bg-gradient-to-br from-sage-50 to-sage-100 py-16 lg:py-24">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="font-raleway text-4xl lg:text-5xl xl:text-6xl font-bold text-sage-900 leading-tight">
                {title}
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="#kontakt">
                <Button size="lg" className="bg-sage-600 hover:bg-sage-700 text-white px-8">
                  Unverbindlich Anfragen
                </Button>
              </Link>
              <Link href="#leistungen">
                <Button size="lg" variant="outline" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                  Mehr erfahren
                </Button>
              </Link>
            </div>
          </div>

          {/* Images */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl max-w-md mx-auto border-4 border-white">
              <Image
                src={mainImageSrc}
                alt="Frau mit Hund im Garten - liebevolle Tierbetreuung"
                width={400}
                height={320}
                className="w-full h-auto object-cover"
                priority
              />
              {/* Rating Badge */}
              <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-2 shadow-lg">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-semibold text-gray-900">5/5</span>
                </div>
              </div>
            </div>
            
            {/* Overlapping Second Image */}
            <div className="absolute -bottom-4 -right-4 w-64 h-48 rounded-xl overflow-hidden shadow-xl border-4 border-white">
              <Image
                src={secImageSrc}
                alt="Glückliche Katze - professionelle Katzenbetreuung"
                width={256}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Trust Indicators under Images */}
            <div className="flex flex-col gap-3 mt-8 text-sm text-sage-700">
              {trustIndicators.map((indicator, index) => {
                const Icon = trustIcons[index % trustIcons.length]
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-sage-600" />
                    <span>{indicator}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

