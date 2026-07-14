import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Kundenstimmen & Bewertungen - Tierisch Gut Betreut",
  description: "Erfahrungsberichte und Kundenstimmen über unseren Tierbetreuungsservice in Moos. Über 400 zufriedene Tierbesitzer vertrauen auf unsere Hundepension und Katzenbetreuung.",
  alternates: {
    canonical: "/kundenstimmen",
  },
  openGraph: {
    title: "Kundenstimmen & Bewertungen - Tierisch Gut Betreut",
    description: "Erfahrungsberichte und Kundenstimmen über unseren Tierbetreuungsservice in Moos. Über 400 zufriedene Tierbesitzer vertrauen auf unsere Hundepension und Katzenbetreuung.",
    url: "/kundenstimmen",
    images: [
      {
        url: "/images/tigube_logo_hund.jpg",
        alt: "Kundenstimmen und Bewertungen",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kundenstimmen & Bewertungen - Tierisch Gut Betreut",
    description: "Erfahrungsberichte und Kundenstimmen über unseren Tierbetreuungsservice in Moos.",
    images: ["/images/tigube_logo_hund.jpg"],
  }
}

export default function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
