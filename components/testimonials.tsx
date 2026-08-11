"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, ExternalLink } from "lucide-react"
import Image from "next/image"
import { getPublishedTestimonials, type Testimonial } from "@/lib/supabase"
import { ReviewModal } from "@/components/review-modal"
import type { CombinedReview, GooglePlaceDetails } from "@/lib/types"

// Google Icon als SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export function Testimonials() {
  const [localTestimonials, setLocalTestimonials] = useState<Testimonial[]>([])
  const [googleData, setGoogleData] = useState<GooglePlaceDetails | null>(null)
  const [combinedReviews, setCombinedReviews] = useState<CombinedReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const loadAllReviews = async () => {
      try {
        // Lade lokale Testimonials und Google Reviews parallel
        const [localData, googleResponse] = await Promise.all([
          getPublishedTestimonials(),
          fetch('/api/reviews/google').then(res => res.json()).catch(() => ({ success: false }))
        ])

        setLocalTestimonials(localData)

        if (googleResponse.success && googleResponse.data) {
          setGoogleData(googleResponse.data)
        }

        // Kombiniere Reviews
        const combined: CombinedReview[] = []

        // Lokale Testimonials hinzufügen
        localData.forEach((t: Testimonial) => {
          combined.push({
            id: t.id,
            name: t.name,
            pet: t.pet,
            rating: t.rating,
            text: t.text,
            date: t.date,
            source: 'local'
          })
        })

        // Google Reviews hinzufügen (falls vorhanden)
        if (googleResponse.success && googleResponse.data?.reviews) {
          googleResponse.data.reviews.forEach((review: any, index: number) => {
            combined.push({
              id: `google-${index}`,
              name: review.author_name,
              pet: null,
              rating: review.rating,
              text: review.text,
              date: new Date(review.time * 1000).toISOString().split('T')[0],
              source: 'google',
              profilePhoto: review.profile_photo_url,
              authorUrl: review.author_url
            })
          })
        }

        // Sortiere nach Datum (neueste zuerst), dann lokale vor Google
        combined.sort((a, b) => {
          // Lokale zuerst, dann nach Datum
          if (a.source !== b.source) {
            return a.source === 'local' ? -1 : 1
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })

        setCombinedReviews(combined)

      } catch (error) {
        console.error('Failed to load reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAllReviews()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Berechne Gesamt-Rating
  const totalReviews = combinedReviews.length + (googleData?.user_ratings_total || 0)
  const averageRating = 5.0

  if (!mounted || loading) {
    return (
      <section className="py-16 lg:py-24 bg-sage-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">Kundenstimmen</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Was unsere Kunden sagen
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="border-sage-200 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 lg:py-24 bg-sage-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-raleway text-3xl lg:text-4xl font-bold text-sage-900 mb-4">Kundenstimmen</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Was unsere Kunden über unseren Service sagen - über 400 zufriedene Tierbesitzer vertrauen uns bereits!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-4 text-sage-600">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <span className="font-semibold">{averageRating.toFixed(1)}/5 Sterne</span>
            <span className="text-sage-500">• {totalReviews}+ Bewertungen</span>
          </div>

          {/* Google Rating Badge */}
          {googleData && (
            <a
              href={googleData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-wrap items-center justify-center gap-2 mt-4 px-4 py-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow max-w-full"
            >
              <GoogleIcon className="h-5 w-5" />
              <span className="text-sm font-medium text-gray-700">
                {googleData.rating} Sterne auf Google ({googleData.user_ratings_total} Bewertungen)
              </span>
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </a>
          )}
        </div>

        <div className="relative px-10 sm:px-14">
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full"
        >
          <CarouselContent>
            {combinedReviews.slice(0, 12).map((review) => (
              <CarouselItem key={review.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  <Card className="border-sage-200 hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        {review.source === 'google' && (
                          <GoogleIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {review.profilePhoto && (
                          <Image
                            src={review.profilePhoto}
                            alt={review.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <CardTitle className="font-raleway text-lg font-bold text-sage-900">
                            {review.authorUrl ? (
                              <a
                                href={review.authorUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-sage-600 transition-colors"
                              >
                                {review.name}
                              </a>
                            ) : (
                              review.name
                            )}
                          </CardTitle>
                          {review.pet && (
                            <p className="text-sm text-sage-600">{review.pet}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow pt-0">
                      <p className="text-gray-600 mb-4 leading-relaxed flex-grow line-clamp-4">
                        &quot;{review.text}&quot;
                      </p>
                      <div className="border-t border-sage-100 pt-4 mt-auto">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {formatDate(review.date)}
                          </span>
                          {review.source === 'google' && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <GoogleIcon className="h-3 w-3" /> Google
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
        </div>

        <div className="text-center mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link href="/kundenstimmen" passHref>
            <Button variant="outline" className="border-sage-600 text-sage-600 hover:bg-sage-600 hover:text-white">
              Alle Bewertungen lesen
            </Button>
          </Link>

          {googleData && (
            <a href={googleData.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-100">
                <GoogleIcon className="h-4 w-4 mr-2" />
                Auf Google bewerten
              </Button>
            </a>
          )}
        </div>

        {combinedReviews.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Noch keine Kundenstimmen verfügbar.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md mx-auto">
            <h3 className="font-raleway text-xl font-bold text-sage-900 mb-4">
              Deine Erfahrung ist uns wichtig!
            </h3>
            <p className="text-gray-600 mb-6">
              Teile deine Erfahrungen und hilf anderen Tierbesitzern bei der Entscheidung.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setShowReviewModal(true)}
                className="bg-sage-600 hover:bg-sage-700 text-white"
                size="lg"
              >
                <Star className="h-4 w-4 mr-2" />
                Hier bewerten
              </Button>
              {googleData && (
                <a href={googleData.url} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="border-gray-300 hover:bg-gray-100 w-full"
                    size="lg"
                  >
                    <GoogleIcon className="h-4 w-4 mr-2" />
                    Google Bewertung
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />
    </section>
  )
}
