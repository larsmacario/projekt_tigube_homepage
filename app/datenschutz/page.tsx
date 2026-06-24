import { Shield, FileText, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-sage-100">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-sage-600">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-raleway font-black text-white mb-6">
            Datenschutzerklärung
          </h1>
          <p className="text-xl text-sage-100 max-w-2xl mx-auto">
            Transparenz und Sicherheit im Umgang mit Ihren Daten
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Einleitung */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              1. Datenschutz auf einen Blick
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-sage-800 mb-2">Allgemeine Hinweise</h3>
                <p>
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten 
                  passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie 
                  persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen 
                  Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-sage-800 mb-2">Datenerfassung auf dieser Website</h3>
                <p className="mb-2">
                  <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
                </p>
                <p>
                  Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten 
                  können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung 
                  entnehmen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sage-800 mb-2">Wie erfassen wir Ihre Daten?</h3>
                <p>
                  Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich 
                  z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch 
                  oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor 
                  allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die 
                  Erfassung dieser Daten erfolgt automatisch, sobald Sie diese Website betreten.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sage-800 mb-2">Wofür nutzen wir Ihre Daten?</h3>
                <p>
                  Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. 
                  Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sage-800 mb-2">Welche Rechte haben Sie bezüglich Ihrer Daten?</h3>
                <p>
                  Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer 
                  gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung 
                  oder Löschung dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt 
                  haben, können Sie diese Einwilligung jederzeit für die Zukunft widerrufen. Außerdem haben Sie das 
                  Recht, unter bestimmten Umständen die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten 
                  zu verlangen. Des Weiteren steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
                </p>
              </div>
            </div>
          </div>

          {/* Verantwortliche Stelle */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">2. Verantwortliche Stelle</h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
              </p>
              <div className="bg-sage-50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-sage-900">tierisch gut betreut GmbH</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sage-600" />
                  <span>Iznangerstr. 32, 78345 Moos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-sage-600" />
                  <span>07732-988 50 91</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-sage-600" />
                  <a href="mailto:info@tierischgutbetreut.de" className="text-sage-600 hover:text-sage-700">
                    info@tierischgutbetreut.de
                  </a>
                </div>
              </div>
              <p>
                Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder gemeinsam mit 
                anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten (z. B. Namen, 
                E-Mail-Adressen o. Ä.) entscheidet.
              </p>
            </div>
          </div>

          {/* Speicherdauer */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">3. Speicherdauer</h2>
            <p className="text-gray-700">
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben 
              Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein 
              berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden 
              Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer 
              personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten 
              Fall erfolgt die Löschung nach Fortfall dieser Gründe.
            </p>
          </div>

          {/* Allgemeine Hinweise zu Pflichtangaben */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">4. Allgemeine Hinweise zu Pflichtangaben</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Die Bereitstellung Ihrer personenbezogenen Daten erfolgt teilweise freiwillig, teilweise zur Erfüllung 
                eines Vertrags oder zur Durchführung vorvertraglicher Maßnahmen. Welche Daten erforderlich sind, erkennen 
                Sie daran, dass die Eingabefelder als Pflichtfelder markiert sind. Ohne die Bereitstellung der 
                erforderlichen Daten können wir unsere Leistungen nicht erbringen.
              </p>
            </div>
          </div>

          {/* Kontaktformular */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">5. Kontaktformular</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular 
                inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall 
                von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
              </p>
              <p>
                Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage 
                mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen erforderlich 
                ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven 
                Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf Ihrer Einwilligung 
                (Art. 6 Abs. 1 lit. a DSGVO), sofern diese abgefragt wurde.
              </p>
              <p>
                Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, 
                Ihre Einwilligung zur Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach 
                abgeschlossener Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen – insbesondere 
                Aufbewahrungsfristen – bleiben unberührt.
              </p>
            </div>
          </div>

          {/* Hosting */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">6. Hosting</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Diese Website wird bei Vercel Inc. gehostet. Anbieter ist Vercel Inc., 340 S Lemon Ave #4133, Walnut, 
                CA 91789, USA (nachfolgend „Vercel").
              </p>
              <p>
                Wenn Sie diese Website besuchen, erfasst Vercel verschiedene Logfiles inklusive Ihrer IP-Adressen. 
                Details entnehmen Sie der Datenschutzerklärung von Vercel:{" "}
                <a 
                  href="https://vercel.com/legal/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sage-600 hover:text-sage-700 underline"
                >
                  https://vercel.com/legal/privacy-policy
                </a>
              </p>
              <p>
                Die Verwendung von Vercel erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes 
                Interesse an einer möglichst zuverlässigen Darstellung unserer Website. Sofern eine entsprechende 
                Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. 
                a DSGVO und § 25 Abs. 1 TTDSG, soweit die Einwilligung die Speicherung von Cookies oder den Zugriff auf 
                Informationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des TTDSG umfasst. Die 
                Einwilligung ist jederzeit widerrufbar.
              </p>
            </div>
          </div>

          {/* Ihre Rechte */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">7. Ihre Rechte</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Sie haben folgende Rechte:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Recht auf Auskunft</strong> gemäß Art. 15 DSGVO über Ihre von uns verarbeiteten personenbezogenen Daten
                </li>
                <li>
                  <strong>Recht auf Berichtigung</strong> gemäß Art. 16 DSGVO unrichtiger oder unvollständiger Daten
                </li>
                <li>
                  <strong>Recht auf Löschung</strong> gemäß Art. 17 DSGVO Ihrer bei uns gespeicherten Daten
                </li>
                <li>
                  <strong>Recht auf Einschränkung der Verarbeitung</strong> gemäß Art. 18 DSGVO
                </li>
                <li>
                  <strong>Recht auf Datenübertragbarkeit</strong> gemäß Art. 20 DSGVO
                </li>
                <li>
                  <strong>Widerspruchsrecht</strong> gemäß Art. 21 DSGVO
                </li>
                <li>
                  <strong>Widerrufsrecht</strong> einer einmal erteilten Einwilligung gemäß Art. 7 Abs. 3 DSGVO
                </li>
                <li>
                  <strong>Beschwerderecht</strong> bei einer Aufsichtsbehörde gemäß Art. 77 DSGVO
                </li>
              </ul>
              <p>
                Bei Fragen zum Datenschutz können Sie sich jederzeit an uns wenden.
              </p>
            </div>
          </div>

          {/* Änderungen */}
          <div>
            <h2 className="text-2xl font-bold text-sage-900 mb-4">8. Änderungen dieser Datenschutzerklärung</h2>
            <p className="text-gray-700">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen 
              Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen. 
              Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
            </p>
          </div>

          {/* Footer Links */}
          <div className="pt-8 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/impressum" className="text-sage-600 hover:text-sage-700 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Impressum
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
