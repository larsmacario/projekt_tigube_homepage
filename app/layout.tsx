import type React from "react"
import type { Metadata } from "next"
import { Raleway } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ConditionalLayout } from "@/components/conditional-layout"


const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-raleway",
})

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tierischgutbetreut.de"
const siteUrl = rawUrl.replace("https:/t", "https://t")

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Tierisch Gut Betreut - Liebevolle Tierbetreuung in Moos",
  description:
    "Professionelle Tierbetreuung für Hunde und Katzen in Moos. Hundepension, mobile Katzenbetreuung und Tagesbetreuung mit Herz und Erfahrung.",
  keywords: "Tierbetreuung Moos, Hundepension, Katzenbetreuung, Tiersitter, Hundesitter",
  generator: 'v0.dev',
  icons: {
    icon: '/images/tigube_logo_hund.jpg',
    shortcut: '/images/tigube_logo_hund.jpg',
    apple: '/images/tigube_logo_hund.jpg',
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tierisch Gut Betreut - Liebevolle Tierbetreuung in Moos",
    description: "Professionelle Tierbetreuung für Hunde und Katzen in Moos. Hundepension, mobile Katzenbetreuung und Tagesbetreuung mit Herz und Erfahrung.",
    url: "/",
    siteName: "Tierisch Gut Betreut",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/images/tigube_logo_hund.jpg",
        width: 1200,
        height: 630,
        alt: "Tierisch Gut Betreut Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tierisch Gut Betreut - Liebevolle Tierbetreuung in Moos",
    description: "Professionelle Tierbetreuung für Hunde und Katzen in Moos. Hundepension, mobile Katzenbetreuung und Tagesbetreuung mit Herz und Erfahrung.",
    images: ["/images/tigube_logo_hund.jpg"],
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${raleway.variable} font-sans antialiased`}>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <Toaster />
      </body>
    </html>
  )
}

