"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Star, Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createTestimonial } from "@/lib/supabase"

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ReviewModal({ isOpen, onClose }: ReviewModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    pet: '',
    rating: 5,
    text: '',
    email: '' // Optional für Rückfragen
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Erstelle Testimonial mit is_published: false (zur Moderation)
      await createTestimonial({
        name: formData.name,
        pet: formData.pet || null,
        rating: formData.rating,
        text: formData.text,
        date: new Date().toISOString().split('T')[0],
        is_published: false, // Zur Moderation
        display_order: 999 // Wird später sortiert
      })

      setSubmitted(true)
      // Reset form after 3 seconds and close modal
      setTimeout(() => {
        resetForm()
        onClose()
      }, 3000)
    } catch (error) {
      console.error('Error submitting review:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Senden der Bewertung. Bitte versuche es später erneut.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      pet: '',
      rating: 5,
      text: '',
      email: ''
    })
    setSubmitted(false)
    setIsSubmitting(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <Heart className="h-16 w-16 text-sage-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-sage-900 mb-2">
              Vielen Dank für deine Bewertung!
            </h3>
            <p className="text-gray-600 mb-4">
              Deine Bewertung wurde erfolgreich übermittelt und wird nach einer kurzen Prüfung auf unserer Website veröffentlicht.
            </p>
            <p className="text-sm text-sage-600">
              Dieses Fenster schließt sich automatisch...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-raleway text-xl font-bold text-sage-900">
            Bewertung abgeben
          </DialogTitle>
          <p className="text-gray-600">
            Teile deine Erfahrungen mit anderen Tierbesitzern
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sage-900 mb-2">
                Dein Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Max M."
                required
                className="border-sage-300 focus:border-sage-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Zur Anonymisierung wird nur der Vorname und Anfangsbuchstabe des Nachnamens angezeigt
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-sage-900 mb-2">
                Dein Tier
              </label>
              <Input
                value={formData.pet}
                onChange={(e) => setFormData({ ...formData, pet: e.target.value })}
                placeholder="z.B. Hund Luna, Katze Mimi"
                className="border-sage-300 focus:border-sage-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-900 mb-2">
              E-Mail (optional)
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="deine@email.de"
              className="border-sage-300 focus:border-sage-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nur für Rückfragen, wird nicht veröffentlicht
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-900 mb-3">
              Bewertung *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= formData.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {formData.rating} {formData.rating === 1 ? 'Stern' : 'Sterne'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-900 mb-2">
              Deine Erfahrung *
            </label>
            <Textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="Erzähl uns von deinen Erfahrungen mit unserem Service..."
              rows={4}
              required
              className="border-sage-300 focus:border-sage-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mindestens 20 Zeichen
            </p>
          </div>

          <div className="bg-sage-50 p-4 rounded-lg">
            <p className="text-sm text-sage-700">
              <strong>Hinweis:</strong> Deine Bewertung wird vor der Veröffentlichung geprüft.
              Wir behalten uns vor, Bewertungen zu moderieren oder abzulehnen, die nicht unseren 
              Richtlinien entsprechen.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || formData.text.length < 20}
              className="flex-1 bg-sage-600 hover:bg-sage-700 text-white"
            >
              {isSubmitting ? 'Wird gesendet...' : 'Bewertung senden'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-sage-300 text-sage-700 hover:bg-sage-50"
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 