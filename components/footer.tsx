import Link from "next/link"
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-sage-900 text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/images/tigube-logo.png"
                alt="Tierisch Gut Betreut Logo"
                width={180}
                height={40}
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sage-300 text-sm leading-relaxed">
              Liebevolle und professionelle Tierbetreuung in Moos und Umgebung. Dein Liebling ist bei uns in den
              besten Händen.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-raleway text-lg font-bold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-sage-300 hover:text-white transition-colors">
                  Startseite
                </Link>
              </li>
              <li>
                <Link href="/kundenstimmen" className="text-sage-300 hover:text-white transition-colors">
                  Kundenstimmen
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-raleway text-lg font-bold mb-4">Leistungen</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/hundepension" className="text-sage-300 hover:text-white transition-colors">
                  Hundepension
                </Link>
              </li>
              <li>
                <Link href="/katzenbetreuung" className="text-sage-300 hover:text-white transition-colors">
                  Katzenbetreuung
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-raleway text-lg font-bold mb-4">Kontakt</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-sage-400" />
                <span className="text-sage-300">07732-988 50 91</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-sage-400" />
                <span className="text-sage-300 break-words">info@tierischgutbetreut.de</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sage-400" />
                <span className="text-sage-300">Iznangerstr. 32, 78345 Moos</span>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex gap-4 mt-6">
              <a 
                href="https://www.facebook.com/tierischgutbetreut" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sage-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://www.instagram.com/tierisch.gut.betreut/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sage-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-sage-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-sage-400">
          <div>© 2025 tierisch gut betreut GmbH. Alle Rechte vorbehalten.</div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 md:mt-0">
            <Link href="/login" className="hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/impressum" className="hover:text-white transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors">
              Datenschutz
            </Link>
            <Link href="/agb" className="hover:text-white transition-colors">
              AGB
            </Link>
          </div>
        </div>
        
        {/* Developer Credit */}
        <div className="border-t border-sage-800 mt-8 pt-6 text-center">
          <p className="text-sage-400 text-sm">
            Erstellt mit ❤️ und modernen Low-Code Tools von{" "}
            <a 
              href="https://lars.macario.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sage-300 hover:text-white transition-colors underline"
            >
              Lars Macario
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
