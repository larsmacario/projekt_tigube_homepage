import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, MapPin, Clock } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

interface ContactProps {
  data?: {
    contactTitle?: string
    contactSubtitle?: string
    contactPhone?: string
    contactEmail?: string
    contactLocation?: string
    contactAvailability?: string
  } | null
}

export function Contact({ data }: ContactProps) {
  // Fallbacks
  const title = data?.contactTitle || "Kontakt aufnehmen"
  const subtitle = data?.contactSubtitle || "Haben Sie Fragen oder möchten Sie einen Termin vereinbaren? Wir freuen uns auf Ihre Nachricht!"
  const phone = data?.contactPhone || "07732-988 50 91"
  const email = data?.contactEmail || "info@tierischgutbetreut.de"
  const location = data?.contactLocation || "78345 Moos"
  const availability = data?.contactAvailability || "Mo-So: 8:00-20:00 Uhr"

  return (
    <section id="kontakt" className="py-16 lg:py-24 bg-sage-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="space-y-6">
            <Card className="border-sage-200">
              <CardHeader>
                <CardTitle className="font-raleway text-xl font-bold text-sage-900">
                  Kontaktinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-sage-600" />
                  <div>
                    <div className="font-medium text-sage-900">Telefon</div>
                    <div className="text-gray-600">{phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-sage-600" />
                  <div>
                    <div className="font-medium text-sage-900">E-Mail</div>
                    <div className="text-gray-600">{email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-sage-600" />
                  <div>
                    <div className="font-medium text-sage-900">Standort</div>
                    <div className="text-gray-600">{location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-sage-600" />
                  <div>
                    <div className="font-medium text-sage-900">Erreichbarkeit</div>
                    <div className="text-gray-600">{availability}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <ContactForm idPrefix="home-" />
          </div>
        </div>
      </div>
    </section>
  )
}
