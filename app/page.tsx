import { getCMSContent } from "@/lib/cms"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Testimonials } from "@/components/testimonials"
import { About } from "@/components/about"
import { Contact } from "@/components/contact"

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const homepageData = await getCMSContent('homepage')

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "tierisch gut betreut GmbH",
    "image": [
      "https://tierischgutbetreut.de/images/tigube_logo_hund.jpg"
    ],
    "@id": "https://tierischgutbetreut.de",
    "url": "https://tierischgutbetreut.de",
    "telephone": "+4977329885091",
    "email": "info@tierischgutbetreut.de",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Iznangerstr. 32",
      "addressLocality": "Moos",
      "postalCode": "78345",
      "addressCountry": "DE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 47.7247,
      "longitude": 8.9419
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday"
        ],
        "opens": "07:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Saturday",
          "Sunday"
        ],
        "opens": "09:00",
        "closes": "18:00"
      }
    ]
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero data={homepageData} />
      <Services data={homepageData?.services} />
      <About data={homepageData} />
      <Testimonials />
      <Contact data={homepageData} />
    </main>
  )
}
