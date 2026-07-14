'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookingCalendar } from '@/components/booking-calendar'
import { useToast } from '@/hooks/use-toast'
import type { BookingRequest, Pet, ServiceType } from '@/lib/types'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    pet_id: '',
    service_type: '' as ServiceType | '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    message: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [bookingsRes, petsRes] = await Promise.all([
        authenticatedFetch('/api/portal/bookings'),
        authenticatedFetch('/api/portal/pets'),
      ])

      const [bookingsData, petsData] = await Promise.all([
        bookingsRes.json(),
        petsRes.json(),
      ])

      setBookings(bookingsData.bookings || [])
      setPets(petsData.pets || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Daten',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!formData.pet_id || !formData.service_type || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Fehler',
        description: 'Bitte fülle alle Pflichtfelder aus',
        variant: 'destructive',
      })
      return
    }

    if (formData.end_date < formData.start_date) {
      toast({
        title: 'Fehler',
        description: 'Enddatum muss nach Startdatum liegen',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await authenticatedFetch('/api/portal/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: formData.pet_id,
          service_type: formData.service_type,
          start_date: formData.start_date.toISOString().split('T')[0],
          end_date: formData.end_date.toISOString().split('T')[0],
          message: formData.message || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Erstellen der Anfrage')
      }

      const data = await response.json()
      setBookings([data.booking, ...bookings])
      setIsDialogOpen(false)
      setFormData({
        pet_id: '',
        service_type: '' as ServiceType | '',
        start_date: undefined,
        end_date: undefined,
        message: '',
      })
      toast({
        title: 'Erfolg',
        description: 'Buchungsanfrage wurde erfolgreich erstellt',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Erstellen der Anfrage',
        variant: 'destructive',
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-sage-100 text-sage-800 border-sage-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Genehmigt'
      case 'rejected':
        return 'Abgelehnt'
      case 'pending':
        return 'Ausstehend'
      default:
        return status
    }
  }

  const getServiceLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'hundepension':
        return 'Urlaubsbetreuung'
      case 'katzenbetreuung':
        return 'Katzenbetreuung'
      case 'tagesbetreuung':
        return 'Tagesbetreuung'
      default:
        return serviceType
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const pastBookings = bookings.filter(b => new Date(b.end_date) < new Date())
  const currentBookings = bookings.filter(b => {
    const today = new Date()
    const start = new Date(b.start_date)
    const end = new Date(b.end_date)
    return start <= today && end >= today
  })
  const futureBookings = bookings.filter(b => new Date(b.start_date) > new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Meine Buchungen</h1>
          <p className="mt-2 text-sage-600">Verwalte deine Betreuungsanfragen</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sage-600 hover:bg-sage-700">
              Neue Anfrage
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neue Buchungsanfrage</DialogTitle>
              <DialogDescription>
                Stelle eine neue Anfrage für die Betreuung deines Tieres
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="pet">Tier *</Label>
                <Select
                  value={formData.pet_id}
                  onValueChange={(value) => setFormData({ ...formData, pet_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tier auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map(pet => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} ({pet.tierart || 'unbekannt'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pets.length === 0 && (
                  <p className="text-sm text-sage-600 mt-1">
                    Bitte füge zuerst ein Tier in deinem Profil hinzu.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="service_type">Service *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Service auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hundepension">Urlaubsbetreuung</SelectItem>
                    <SelectItem value="katzenbetreuung">Katzenbetreuung</SelectItem>
                    <SelectItem value="tagesbetreuung">Tagesbetreuung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Startdatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, 'PPP', { locale: de })
                        ) : (
                          <span>Datum wählen</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => setFormData({ ...formData, start_date: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Enddatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? (
                          format(formData.end_date, 'PPP', { locale: de })
                        ) : (
                          <span>Datum wählen</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => setFormData({ ...formData, end_date: date })}
                        disabled={(date) => date < (formData.start_date || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="message">Nachricht (optional)</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Zusätzliche Informationen..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSubmit} disabled={pets.length === 0}>
                  Anfrage stellen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kalender */}
      <Card>
        <CardHeader>
          <CardTitle>Kalender</CardTitle>
          <CardDescription>Übersicht deiner Buchungen</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingCalendar
            bookings={bookings}
            onSelectBooking={(booking) => setSelectedBooking(booking)}
          />
        </CardContent>
      </Card>

      {/* Buchungsliste mit Tabs */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Zukünftige Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {futureBookings.length > 0 ? (
              <div className="space-y-3">
                {futureBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="p-4 border border-sage-200 rounded-lg hover:bg-sage-50 cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sage-900">
                          {booking.pet?.name || 'Unbekannt'}
                        </p>
                        <p className="text-sm text-sage-600">
                          {getServiceLabel(booking.service_type)}
                        </p>
                        <p className="text-sm text-sage-600 mt-1">
                          {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sage-600 text-center py-4">Keine zukünftigen Buchungen</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktuelle Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {currentBookings.length > 0 ? (
              <div className="space-y-3">
                {currentBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="p-4 border border-sage-200 rounded-lg hover:bg-sage-50 cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sage-900">
                          {booking.pet?.name || 'Unbekannt'}
                        </p>
                        <p className="text-sm text-sage-600">
                          {getServiceLabel(booking.service_type)}
                        </p>
                        <p className="text-sm text-sage-600 mt-1">
                          {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sage-600 text-center py-4">Keine aktuellen Buchungen</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vergangene Buchungen</CardTitle>
          </CardHeader>
          <CardContent>
            {pastBookings.length > 0 ? (
              <div className="space-y-3">
                {pastBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="p-4 border border-sage-200 rounded-lg hover:bg-sage-50 cursor-pointer opacity-75"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sage-900">
                          {booking.pet?.name || 'Unbekannt'}
                        </p>
                        <p className="text-sm text-sage-600">
                          {getServiceLabel(booking.service_type)}
                        </p>
                        <p className="text-sm text-sage-600 mt-1">
                          {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sage-600 text-center py-4">Keine vergangenen Buchungen</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buchungsdetails</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tier</Label>
                <p className="font-medium">{selectedBooking.pet?.name || 'Unbekannt'}</p>
              </div>
              <div>
                <Label>Service</Label>
                <p className="font-medium">{getServiceLabel(selectedBooking.service_type)}</p>
              </div>
              <div>
                <Label>Zeitraum</Label>
                <p className="font-medium">
                  {new Date(selectedBooking.start_date).toLocaleDateString('de-DE')} - {new Date(selectedBooking.end_date).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(selectedBooking.status)}>
                  {getStatusLabel(selectedBooking.status)}
                </Badge>
              </div>
              {selectedBooking.message && (
                <div>
                  <Label>Nachricht</Label>
                  <p className="text-sage-600">{selectedBooking.message}</p>
                </div>
              )}
              {selectedBooking.admin_notes && (
                <div>
                  <Label>Admin Notiz</Label>
                  <p className="text-sage-600">{selectedBooking.admin_notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

