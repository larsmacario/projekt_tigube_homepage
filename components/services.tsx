import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Home, MapPin, Phone, HelpCircle } from "lucide-react"
import Link from "next/link"

interface ServiceItem {
  _id: string
  title: string
  description: string
  features: string[]
  price: string
  link: string
}

interface ServicesProps {
  data?: ServiceItem[] | null
}

const iconMap: Record<string, any> = {
  "/hundepension": Home,
  "/katzenbetreuung": MapPin,
  "#kontakt": Phone,
}

const defaultServices: ServiceItem[] = [
  {
    _id: "default-1",
    title: "Hundepension",
    description: "Tages- und Urlaubsbetreuung für Deinen Hund in familiärer Atmosphäre.",
    features: ["Artgerechte Beschäftigung", "Individuelle Betreuung", "Große Auslauffläche"],
    price: "ab 31€/Tag",
    link: "/hundepension",
  },
  {
    _id: "default-2",
    title: "Mobile Katzenbetreuung",
    description: "Deine Samtpfote bleibt entspannt zuhause - wir kommen zu Dir.",
    features: ["Füttern & Spielen", "Katzenklo reinigen", "Streicheleinheiten"],
    price: "ab 12,50€/Besuch",
    link: "/katzenbetreuung",
  },
  {
    _id: "default-3",
    title: "Notfallbetreuung",
    description: "Auch kurzfristig sind wir für Dich und Dein Tier da.",
    features: ["ggf. kurzfristige Termine", "Notfall-Hotline", "Nur für Bestandskunden und nur wenn Platz ist"],
    price: "Auf Anfrage",
    link: "#kontakt",
  },
]

export function Services({ data }: ServicesProps) {
  const services = data && data.length > 0 ? data : defaultServices

  return (
    <section id="leistungen" className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">Unsere Leistungen</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Von der Hundepension bis zur mobilen Katzenbetreuung - wir bieten individuelle Lösungen, 
            die auf die Bedürfnisse Ihres Lieblings zugeschnitten sind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => {
            const Icon = iconMap[service.link] || HelpCircle
            return (
              <Card key={service._id} className="border-sage-200 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-sage-600" />
                  </div>
                  <CardTitle className="font-raleway text-xl font-bold text-sage-900">{service.title}</CardTitle>
                  <CardDescription className="text-gray-600">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  <ul className="space-y-2 flex-grow pb-4">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-sage-500 rounded-full mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t border-sage-100 mt-auto">
                    <div className="text-lg font-semibold text-sage-900 mb-3">{service.price}</div>
                    <Link href={service.link}>
                      <Button variant="outline" className="w-full border-sage-300 text-sage-700 hover:bg-sage-50">
                        Mehr erfahren
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

