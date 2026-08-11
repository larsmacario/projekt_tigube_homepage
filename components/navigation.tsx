"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Image from "next/image"

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.body.classList.toggle("overflow-hidden", isOpen)
    return () => {
      document.body.classList.remove("overflow-hidden")
    }
  }, [isOpen, mounted])

  return (
    <nav className="bg-white shadow-sm border-b border-sage-100 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/tigube-logo.png"
              alt="Tierisch Gut Betreut Logo"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sage-700 hover:text-sage-900 font-medium transition-colors">
              Startseite
            </Link>
            <Link href="/hundepension" className="text-sage-700 hover:text-sage-900 font-medium transition-colors">
              Hundepension
            </Link>
            <Link href="/katzenbetreuung" className="text-sage-700 hover:text-sage-900 font-medium transition-colors">
              Katzenbetreuung
            </Link>
            <Link href="/kundenstimmen" className="text-sage-700 hover:text-sage-900 font-medium transition-colors">
              Kundenstimmen
            </Link>
            <Link href="/portal" className="text-sage-700 hover:text-sage-900 font-medium transition-colors">
              Kundenportal
            </Link>
            <Link href="/#kontakt">
              <Button className="bg-sage-600 hover:bg-sage-700 text-white">Unverbindlich Anfragen</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-sage-700 hover:text-sage-900 p-2 -mr-2 min-h-11 min-w-11 flex items-center justify-center"
              aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
            >
              {mounted && isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mounted && isOpen && (
          <div className="md:hidden py-4 border-t border-sage-100 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="text-sage-700 hover:text-sage-900 font-medium py-1" onClick={() => setIsOpen(false)}>
                Startseite
              </Link>
              <Link href="/hundepension" className="text-sage-700 hover:text-sage-900 font-medium py-1" onClick={() => setIsOpen(false)}>
                Hundepension
              </Link>
              <Link href="/katzenbetreuung" className="text-sage-700 hover:text-sage-900 font-medium py-1" onClick={() => setIsOpen(false)}>
                Katzenbetreuung
              </Link>
              <Link href="/kundenstimmen" className="text-sage-700 hover:text-sage-900 font-medium py-1" onClick={() => setIsOpen(false)}>
                Kundenstimmen
              </Link>
              <Link href="/portal" className="text-sage-700 hover:text-sage-900 font-medium py-1" onClick={() => setIsOpen(false)}>
                Kundenportal
              </Link>
              <Link href="/#kontakt" onClick={() => setIsOpen(false)}>
                <Button className="bg-sage-600 hover:bg-sage-700 text-white w-full">Unverbindlich Anfragen</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
