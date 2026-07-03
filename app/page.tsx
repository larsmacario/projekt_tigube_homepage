import { getCMSContent } from "@/lib/cms"
import { Hero } from "@/components/hero"
import { Services } from "@/components/services"
import { Testimonials } from "@/components/testimonials"
import { About } from "@/components/about"
import { Contact } from "@/components/contact"

export default async function HomePage() {
  const homepageData = await getCMSContent('homepage')

  return (
    <main>
      <Hero data={homepageData} />
      <Services data={homepageData?.services} />
      <About data={homepageData} />
      <Testimonials />
      <Contact data={homepageData} />
    </main>
  )
}
