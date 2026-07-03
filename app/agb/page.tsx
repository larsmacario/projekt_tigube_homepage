import { FileText, Scale, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-sage-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-raleway font-black text-white mb-6">
            Pflegevertrag
          </h1>
          <p className="text-xl text-sage-100 max-w-2xl mx-auto">
            Allgemeine Geschäftsbedingungen für die Hundebetreuung
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Header Info */}
          <div className="border-b border-sage-200 pb-6">
            <div className="space-y-2 text-gray-700">
              <p className="font-semibold text-sage-900">tierisch gut betreut Gesellschaft mit beschränkter Haftung</p>
              <p>Geschäftsführer: Tamara Pfaff & Gabriel Haaga</p>
              <p>Iznangerstr. 32 | 78345 Moos</p>
            </div>
          </div>

          {/* Zusicherungen und Pflichten */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Zusicherungen und Pflichten beider Parteien
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <p className="font-semibold text-sage-800 mb-2">(1) Der Tierbesitzer sichert zu, dass</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>der Hund sein Eigentum ist und über diesen frei verfügen kann</li>
                  <li>der Hund stubenrein ist, nicht inkontinent ist oder in geschlossenen Räumen markiert</li>
                  <li>
                    das Tier über eine gültige Impfung gegen Hepatitis, Parvovirose, Leptospirose, Staupe und 
                    Zwingerhusten hat. Der Impfpass wird vor jedem Aufenthalt zur Durchsicht an tierisch gut betreut Gesellschaft mit beschränkter Haftung
                    per Mail zugesandt
                  </li>
                  <li>
                    der Hund Wurm frei (Entwurmung oder negativer Kot-Test) und frei von ansteckenden Krankheiten und 
                    Ungeziefer ist, wobei die letzte Entwurmung/Kotuntersuchung nicht länger als drei Monate zurückliegt. 
                    Die jeweiligen Nachweise werden vor jedem Aufenthalt per Mail an tierisch gut betreut Gesellschaft mit beschränkter Haftung geschickt
                  </li>
                  <li>
                    Mittel zur Floh- und Zeckenprophylaxe vorher verabreicht wurden und noch Schutz besteht
                  </li>
                  <li>
                    der Hund gesund ist. Falls Krankheiten/Gebrechen bekannt sind, sind diese anzugeben
                  </li>
                  <li>
                    eine ordentliche Tierhalter-Haftpflichtversicherung besteht und die Folgeprämien bezahlt sind, 
                    sodass ein aktueller Versicherungsschutz besteht (Versicherungsnachweis ist der Betreuungsperson 
                    auf Wunsch vorzulegen)
                  </li>
                  <li>der Hund steuerlich gemeldet ist</li>
                  <li>
                    alle Angaben vollständig und wahrheitsgetreu gemacht zu haben. Der Tierhalter verpflichtet sich, 
                    etwaige nach Vertragsabschluss eintretende seine Person oder den Hund betreffende Änderungen 
                    unverzüglich mitzuteilen
                  </li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold text-sage-800 mb-2">
                  (2) Je nach Schwere der Erkrankung des Hundes ist tierisch gut betreut Gesellschaft mit beschränkter Haftung berechtigt, sowohl am
                  Abgabetag als auch bei nachträglicher Feststellung sofort vom Vertrag zurück zu treten bzw. das Tier 
                  in tierärztlicher Betreuung zu geben. Hier ist auf das Wohl des Tieres von beiden Vertragsparteien zu 
                  achten. Eventuell anfallende Mehrkosten sind vom Tierbesitzer zu tragen.
                </p>
              </div>

              <div>
                <p className="font-semibold text-sage-800 mb-2">
                  (3) Der Tierbesitzer haftet für anfallende Kosten, falls durch eine polizeiliche Kontrolle der Hund 
                  nicht oder unzureichend gekennzeichnet ist.
                </p>
              </div>

              <div>
                <p className="font-semibold text-sage-800 mb-2">
                  (4) tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, das Tier art- und verhaltensgerecht laut Tierschutzgesetz,
                  sowie dessen Nebenbestimmungen zu betreuen.
                </p>
              </div>
            </div>
          </div>

          {/* Vertraulichkeit und Sorgfalt */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Vertraulichkeit und Sorgfalt beider Parteien
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>(1)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich, über alle ihr im Rahmen ihrer Tätigkeit für
                den Tierbesitzer auf Grundlage dieses Vertrages bekannt gewordenen Informationen auch nach Ablauf der 
                Vertragsdauer Stillschweigen zu bewahren. Gleiches gilt umgekehrt.
              </p>
              <p>
                <strong>(2)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich auch, die anvertrauten Tiere nur mit größter
                Sorgfalt zu behandeln.
              </p>
              <p>
                <strong>(3)</strong> Der Tierbesitzer erklärt sich mit der Aufnahme und (elektronischen) Speicherung der 
                in diesem Vertrag und ggf. in der Zusatzvereinbarung erhobenen Daten einverstanden. Die Daten dürfen im 
                Rahmen der Vertragsabwicklung bspw. im Krankheitsfall an den Tierarzt weitergegeben werden.
              </p>
            </div>
          </div>

          {/* Haftung */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Haftung beider Parteien
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>(1)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung bestätigt, dass eine Betriebshaftpflichtversicherung besteht.
              </p>
              <p>
                <strong>(2)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet für Sachschäden und Schäden an den in Obhut gegebenen
                Hunden nur soweit, als diese Schäden auf Vorsatz oder grob fahrlässiges Handeln der Betreuungsperson oder 
                deren Erfüllungsgehilfen zurückzuführen sind.
              </p>
              <p>
                <strong>(3)</strong> tierisch gut betreut Gesellschaft mit beschränkter Haftung haftet nicht für durch die Tiere verursachte Schäden oder
                Kosten. Sie ist von sämtlichen mit dem Betreuungstier in Verbindung stehenden Ansprüchen Dritter seitens 
                des Tierbesitzers freizustellen. Trotz größter Sorgfalt kann das Risiko eines Entlaufens oder Erkrankung 
                nicht gänzlich ausgeschlossen werden. Eine Haftung seitens tierisch gut betreut Gesellschaft mit beschränkter Haftung besteht jedoch nicht.
              </p>
              <p>
                <strong>(4)</strong> Für Schäden, welche ein Hund verursacht, die nicht oder nicht ausreichend durch die 
                Hundehaftpflichtversicherung oder private Haftpflichtversicherung abgedeckt sind, haftet allein der 
                Tierbesitzer.
              </p>
            </div>
          </div>

          {/* Information */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Information
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>(1)</strong> tierisch gut betreut verpflichtet sich, bei Auftreten von schwerwiegenden Problemen 
                (plötzliche Krankheit des Tieres, auffällige Verhaltensänderung, etc.) den Tierbesitzer oder dessen 
                Kontaktperson umgehend zu benachrichtigen.
              </p>
              <p>
                <strong>(2)</strong> Der Tierbesitzer hat das Recht, sich während der Betreuungszeit bei der 
                Betreuungsperson nach dem Wohl des Tieres zu erkundigen. tierisch gut betreut Gesellschaft mit beschränkter Haftung verpflichtet sich
                wahrheitsgemäße Aussagen hierüber zu machen.
              </p>
              <p>
                <strong>(3)</strong> Der Tierbesitzer hat eine Vertrauensperson zu benennen, welche tierisch gut betreut Gesellschaft mit beschränkter Haftung 
                kontaktieren kann falls eine Situation eintritt, welche schnelles Handeln erfordert und der Tierbesitzer 
                nicht erreichbar ist.
              </p>
            </div>
          </div>

          {/* Notfall */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Notfall
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>(1)</strong> Der Tierhalter erklärt sich damit einverstanden, dass in Notfällen und bei akuten 
                Erkrankungen oder Verletzungen die erforderliche Behandlung bei einem Tierarzt erfolgt, der von tierisch 
                gut betreut Gesellschaft mit beschränkter Haftung bestimmt wird. Für diesen Fall ist tierisch gut betreut Gesellschaft mit beschränkter Haftung ausdrücklich ermächtigt, im
                Namen und auf Rechnung des Kunden eine Tierarztpraxis/-klinik mit der tierärztlichen Versorgung und 
                Behandlung des Tieres zu beauftragen. Die Kosten übernimmt der Tierhalter.
              </p>
              <p>
                <strong>(2)</strong> Die Kostenübernahme seitens des Halters gilt auch für einen nötigen Transport mit der 
                Tierrettung Südbaden e.V..
              </p>
              <p>
                <strong>(3)</strong> Im Falle einer tierärztlichen Behandlung übernimmt die entscheidungsermächtigte Person 
                die Bezahlung der Tierarztkosten, sollte dieser nicht auf Rechnung arbeiten.
              </p>
            </div>
          </div>

          {/* Stornierung */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Stornierung
            </h2>
            <div className="space-y-4 text-gray-700">
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>15 Tage und mehr vor Check-In:</strong> 100% Rückerstattung</li>
                <li><strong>14 - 7 Tage vor Check-In:</strong> 50% Rückerstattung</li>
                <li><strong>6 Tage und weniger vor Check-In:</strong> keine Rückerstattung</li>
              </ul>
              <p>
                Absagen werden jeweils bis 18h berücksichtigt - auch dann, wenn sie an einem Sonn-/Feiertag oder in unserem 
                Urlaub getätigt werden. Die Stornierung muss grundsätzlich in schriftlicher Form per Mail oder WhatsApp 
                erfolgen.
              </p>
              <p>
                Bei frühzeitiger Abholung gibt es keine Rückerstattung der gebuchten Tage. Dies gilt auch, wenn ein Hund 
                später als zum vereinbarten Datum in Betreuung gebracht wird.
              </p>
            </div>
          </div>

          {/* Datenschutz */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">
              Datenschutz
            </h2>
            <div className="space-y-4 text-gray-700">
              <p className="font-semibold text-sage-800 mb-2">
                Nutzung personenbezogener Daten, Fotos und Videos
              </p>
              <p>
                Der Tierbesitzer ist damit einverstanden,
              </p>
              <p>
                <strong>(1)</strong> dass tierisch gut betreut Gesellschaft mit beschränkter Haftung personenbezogene Daten speichern und verarbeiten darf.
                Die Daten dürfen nicht an dritte Personen weitergegeben werden, und sind auf Aufforderung unverzüglich 
                zu löschen.
              </p>
              <p>
                <strong>(2)</strong> dass Fotos und Videos von dem betreuten Tier/den betreuten Tieren in die Homepage, 
                etc. von tierisch gut betreut Gesellschaft mit beschränkter Haftung eingestellt werden dürfen. Der Tierbesitzer bleibt hierbei anonym und es
                wird ausschließlich der Name des Tieres, Tierart, Rasse sowie Datum/Zeitraum veröffentlicht.
              </p>
              <p className="text-sm text-gray-600 mt-4">
                Nähere Informationen finden Sie in unserer{" "}
                <Link href="/datenschutz" className="text-sage-600 hover:text-sage-700 underline">
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Zusatzinfo */}
          <div className="bg-sage-50 p-6 rounded-lg border-l-4 border-sage-600">
            <p className="text-gray-700">
              <strong>Wichtiger Hinweis:</strong> Der Hundehalter verpflichtet sich dazu, uns darüber zu informieren, wenn 
              sich zwischen 2 Betreuungen etwas an den o.g. Angaben ändert. Die Änderung greift ab der darauffolgenden 
              Betreuung.
            </p>
          </div>

          {/* Footer Links */}
          <div className="pt-8 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/impressum" className="text-sage-600 hover:text-sage-700 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Impressum
              </Link>
              <Link href="/datenschutz" className="text-sage-600 hover:text-sage-700 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Datenschutz
              </Link>
              <Link href="/" className="text-sage-600 hover:text-sage-700">
                Zurück zur Startseite
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t text-center text-sm text-gray-500">
            <p>© tierisch gut betreut Gesellschaft mit beschränkter Haftung 2022</p>
          </div>
        </div>
      </div>
    </div>
  )
}
