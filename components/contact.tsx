import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

interface ContactProps {
  data?: {
    contactTitle?: string
    contactSubtitle?: string
    contactPhone?: string
    contactEmail?: string
    contactLocation?: string
    contactAvailability?: string
    contactWhatsAppUrl?: string
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
  const whatsappUrl = data?.contactWhatsAppUrl || "https://wa.me/491754685977"

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

            <Card className="border-sage-200 bg-sage-600 text-white">
              <CardContent className="p-6">
                <MessageCircle className="h-8 w-8 mb-4" />
                <h3 className="font-raleway text-lg font-bold mb-2">WhatsApp Kontakt</h3>
                <p className="text-sage-100 mb-4">
                  Für schnelle Fragen erreichen Sie uns auch über WhatsApp.
                </p>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white hover:text-sage-600"
                  >
                    WhatsApp öffnen
                  </Button>
                </a>
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

