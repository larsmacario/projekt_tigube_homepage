import { defineQuery } from "next-sanity"

export const HOMEPAGE_QUERY = defineQuery(`
  *[_id == "homepage"][0]{
    heroTitle,
    heroSubtitle,
    heroMainImage,
    heroSecondaryImage,
    heroTrustIndicators,
    aboutTitle,
    aboutSubtitle,
    tamaraName,
    tamaraTexts,
    tamaraImage,
    gabrielName,
    gabrielTexts,
    gabrielImage,
    lunaTitle,
    lunaSubtitle,
    lunaImage,
    lunaDescription,
    aboutCtaText,
    aboutCtaSubtitle,
    statExperience,
    statExperienceLabel,
    statClients,
    statClientsLabel,
    statAnimals,
    statAnimalsLabel,
    contactTitle,
    contactSubtitle,
    contactPhone,
    contactEmail,
    contactLocation,
    contactAvailability,
    contactWhatsAppUrl
  }
`)

export const SERVICES_QUERY = defineQuery(`
  *[_type == "service"] | order(order asc) {
    _id,
    title,
    description,
    features,
    price,
    link
  }
`)
