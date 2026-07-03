import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, MapPin, Building2, Users, FileText, Shield } from "lucide-react"
import Link from "next/link"
import { getCMSContent } from "@/lib/cms"

export default async function ImpressumPage() {
  const data = await getCMSContent('impressum')

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-sage-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-raleway font-black text-white mb-6">
            {data?.title || "Impressum"}
          </h1>
          <p className="text-xl text-sage-100 max-w-2xl mx-auto">
            Rechtliche Informationen und gesetzliche Angaben unseres Tierbetreuungsservices
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8 bg-white rounded-lg shadow-lg p-8">
          {/* Render Database Content if available, else static fallback */}
          {data?.content ? (
            <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: data.content }} />
          ) : (
            <div className="space-y-8">
              {/* Unternehmensinformationen */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sage-800">
                    <Building2 className="h-5 w-5" />
                    Unternehmensinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2">Firmenname</h3>
                    <p className="text-gray-700">
                      <strong>tierisch gut betreut Gesellschaft mit beschränkter Haftung</strong>
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      vertretungsberechtigte Geschäftsführer
                    </h3>
                    <p className="text-gray-700">
                      Tamara Pfaff & Gabriel Haaga
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Anschrift
                    </h3>
                    <p className="text-gray-700">
                      Iznangerstr. 32<br />
                      78345 Moos
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Registereintrag
                    </h3>
                    <p className="text-gray-700">
                      HRB 727466 / Amtsgericht Freiburg i. Br.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2">USt.-ID</h3>
                    <p className="text-gray-700">
                      DE355611953
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Kontaktdaten */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sage-800">
                    <Phone className="h-5 w-5" />
                    Kontaktdaten
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-sage-600" />
                    <span className="font-medium">Festnetz:</span>
                    <a href="tel:+4977329885091" className="text-sage-600 hover:text-sage-700">
                      07732-988 50 91
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-sage-600" />
                    <span className="font-medium">Mobil (T. Pfaff):</span>
                    <a href="tel:+4917672404561" className="text-sage-600 hover:text-sage-700">
                      0176-724 045 61
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-sage-600" />
                    <span className="font-medium">Mobil (G. Haaga):</span>
                    <a href="tel:+4917546859977" className="text-sage-600 hover:text-sage-700">
                      0175-468 59 77
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-sage-600" />
                    <span className="font-medium">E-Mail:</span>
                    <a href="mailto:info@tierischgutbetreut.de" className="text-sage-600 hover:text-sage-700">
                      info@tierischgutbetreut.de
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Rechtliche Hinweise */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sage-800">
                    <Shield className="h-5 w-5" />
                    Rechtliche Hinweise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2">Aufsichtsbehörden</h3>
                    <div className="text-gray-700 text-sm space-y-2">
                      <p>
                        <strong>Veterinäramt Konstanz:</strong><br />
                        Otto-Blesch-Str. 51, 78315 Radolfzell am Bodensee
                      </p>
                      <p>
                        <strong>Städtisches Finanzamt:</strong><br />
                        Alpenstraße 9, 78224 Singen a.Htwl.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2">Bildquellen</h3>
                    <div className="text-gray-700 text-sm space-y-1">
                      <p>Bildquelle Pixabay: StockSnap, PicsbyFran, pikabum</p>
                      <p>Foto von Helena Lopes: <a href="https://www.pexels.com/de-de/foto/kurzbeschichteter-tan-dog-2253275/" className="text-sage-600 hover:text-sage-700 underline" target="_blank" rel="noopener noreferrer">https://www.pexels.com/de-de/foto/kurzbeschichteter-tan-dog-2253275/</a></p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sage-800 mb-2">Copyright</h3>
                    <p className="text-gray-700 text-sm">
                      © tierisch gut betreut 2025
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
