import type React from "react"
import type { Metadata } from "next"
import { Raleway } from "next/font/google"
import "./globals.css"
import { NewsBar } from "@/components/news-bar"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import { ConditionalLayout } from "@/components/conditional-layout"
import { SanityLive } from "@/lib/live"
import { VisualEditing } from "next-sanity"
import { draftMode } from "next/headers"


const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-raleway",
})

export const metadata: Metadata = {
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
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftModeEnabled } = await draftMode()

  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${raleway.variable} font-sans antialiased`}>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <Toaster />
        <SanityLive />
        {isDraftModeEnabled && <VisualEditing />}
      </body>
    </html>
  )
}

