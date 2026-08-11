"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Quote } from "lucide-react"
import { getPublishedTestimonials, type Testimonial } from "@/lib/supabase"
import { ReviewModal } from "@/components/review-modal"
import { Button } from "@/components/ui/button"

export default function KundenstimmenPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const data = await getPublishedTestimonials()
        setTestimonials(data)
      } catch (error) {
        console.error('Failed to load testimonials:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTestimonials()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-sage-50 to-sage-100">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-raleway text-4xl lg:text-5xl font-bold text-sage-900 mb-6">
              Wir sagen DANKE für Euer Vertrauen
            </h1>
            <p className="text-xl text-sage-700 max-w-3xl mx-auto mb-8">
              Kundenstimmen werden geladen...
            </p>
          </div>
        </section>

        {/* Loading State */}
        <section className="py-16 lg:py-24">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(9)].map((_, index) => (
                <Card key={index} className="border-sage-200 animate-pulse h-full flex flex-col">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded mb-6"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-20 py-12 lg:py-24 bg-gradient-to-br from-sage-50 to-sage-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-raleway text-3xl sm:text-4xl lg:text-5xl font-bold text-sage-900 mb-6">
            Wir sagen DANKE für Euer Vertrauen
          </h1>
          <p className="text-lg sm:text-xl text-sage-700 max-w-3xl mx-auto mb-8">
            Über 400 zufriedene Tierbesitzer vertrauen bereits auf unsere Betreuung.
            Lesen Sie, was unsere Kunden über uns sagen.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sage-600">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <span className="font-semibold">5.0/5 Sterne</span>
            <span className="text-sage-500">• {testimonials.length}+ Bewertungen</span>
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="border-sage-200 hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <Quote className="h-8 w-8 text-sage-300 mb-4" />

                  <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
                    {testimonial.text}
                  </p>

                  <div className="border-t border-sage-100 pt-4 mt-auto">
                    <div className="font-semibold text-sage-900">{testimonial.name}</div>
                    {testimonial.pet && (
                      <div className="text-sm text-sage-600">{testimonial.pet}</div>
                    )}
                    <div className="text-sm text-gray-500">{formatDate(testimonial.date)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {testimonials.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Noch keine Kundenstimmen verfügbar.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-sage-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-6">
            Möchten Sie auch eine Bewertung hinterlassen?
          </h2>
          <p className="text-lg text-sage-700 mb-8">
            Ihre Erfahrungen sind uns wichtig! Teilen Sie anderen Tierbesitzern mit,
            wie wir Ihnen und Ihrem Liebling geholfen haben.
          </p>
          <div className="flex justify-center">
            <Button
              onClick={() => setShowReviewModal(true)}
              className="bg-sage-600 hover:bg-sage-700 text-white"
              size="lg"
            >
              <Star className="h-5 w-5 mr-2" />
              Bewertung abgeben
            </Button>
          </div>
        </div>
      </section>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />
    </div>
  )
} 