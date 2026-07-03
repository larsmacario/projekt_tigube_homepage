import { sanityFetch } from "@/lib/live"
import { HOMEPAGE_QUERY, SERVICES_QUERY } from "@/lib/queries"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Testimonials } from "@/components/testimonials"
import { About } from "@/components/about"
import { Contact } from "@/components/contact"

export default async function HomePage() {
  const [homepageData, servicesData] = await Promise.all([
    sanityFetch({ query: HOMEPAGE_QUERY }).then((res) => res.data),
    sanityFetch({ query: SERVICES_QUERY }).then((res) => res.data),
  ])

  return (
    <main>
      <Hero data={homepageData} />
      <Services data={servicesData} />
      <About data={homepageData} />
      <Testimonials />
      <Contact data={homepageData} />
    </main>
  )
}

