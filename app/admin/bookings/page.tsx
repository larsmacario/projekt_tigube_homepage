'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingCalendar } from '@/components/booking-calendar'
import { CapacityIndicator } from '@/components/capacity-indicator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { BookingRequest, CapacitySetting, CapacityOverride } from '@/lib/types'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [capacitySettings, setCapacitySettings] = useState<CapacitySetting[]>([])
  const [capacityOverrides, setCapacityOverrides] = useState<CapacityOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [overrideForm, setOverrideForm] = useState({
    date: undefined as Date | undefined,
    service_type: '' as string | null,
    capacity: '',
    reason: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [bookingsRes, capacityRes, overridesRes] = await Promise.all([
        fetch('/api/admin/bookings'),
        fetch('/api/admin/capacity'),
        fetch('/api/admin/capacity/overrides'),
      ])

      const [bookingsData, capacityData, overridesData] = await Promise.all([
        bookingsRes.json(),
        capacityRes.json(),
        overridesRes.json(),
      ])

      setBookings(bookingsData.bookings || [])
      setCapacitySettings(capacityData.settings || [])
      setCapacityOverrides(overridesData.overrides || [])
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

  // Berechne Kapazitätsdaten für jeden Tag
  const capacityData = useMemo(() => {
    const data: Array<{
      date: string
      current: number
      max: number
      serviceType?: string | null
    }> = []

    // Gruppiere Buchungen nach Datum und Service-Typ
    const bookingsByDate: Record<string, Record<string, BookingRequest[]>> = {}

    bookings
      .filter(b => b.status === 'approved')
      .forEach(booking => {
        const start = new Date(booking.start_date)
        const end = new Date(booking.end_date)
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          if (!bookingsByDate[dateStr]) {
            bookingsByDate[dateStr] = {}
          }
          if (!bookingsByDate[dateStr][booking.service_type]) {
            bookingsByDate[dateStr][booking.service_type] = []
          }
          bookingsByDate[dateStr][booking.service_type].push(booking)
        }
      })

    // Erstelle Kapazitätsdaten
    Object.keys(bookingsByDate).forEach(dateStr => {
      Object.keys(bookingsByDate[dateStr]).forEach(serviceType => {
        const override = capacityOverrides.find(
          o => o.date === dateStr && (o.service_type === serviceType || (!o.service_type && !serviceType))
        )
        const setting = capacitySettings.find(
          s => (s.service_type === serviceType || (!s.service_type && !serviceType))
        )

        const max = override?.capacity || setting?.default_capacity || 0
        const current = bookingsByDate[dateStr][serviceType].length

        data.push({
          date: dateStr,
          current,
          max,
          serviceType: serviceType || null,
        })
      })
    })

    return data
  }, [bookings, capacitySettings, capacityOverrides])

  async function handleStatusChange(status: 'approved' | 'rejected') {
    if (!selectedBooking) return

    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Aktualisieren')
      }

      const data = await response.json()
      setBookings(bookings.map(b => b.id === selectedBooking.id ? data.booking : b))
      setIsDialogOpen(false)
      setSelectedBooking(null)
      setAdminNotes('')
      // Reload capacity data
      loadData()
      toast({
        title: 'Erfolg',
        description: `Buchung wurde ${status === 'approved' ? 'genehmigt' : 'abgelehnt'}`,
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Aktualisieren',
        variant: 'destructive',
      })
    }
  }

  async function handleSaveSettings() {
    try {
      const settingsToSave = capacitySettings.map(s => ({
        service_type: s.service_type,
        default_capacity: s.default_capacity,
      }))

      const requiredTypes = [null, 'hundepension', 'katzenbetreuung', 'tagesbetreuung']
      requiredTypes.forEach(type => {
        if (!settingsToSave.find(s => s.service_type === type)) {
          settingsToSave.push({
            service_type: type,
            default_capacity: 0,
          })
        }
      })

      const response = await fetch('/api/admin/capacity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      const data = await response.json()
      setCapacitySettings(data.settings)
      toast({
        title: 'Erfolg',
        description: 'Kapazitäten wurden gespeichert',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern',
        variant: 'destructive',
      })
    }
  }

  async function handleAddOverride() {
    if (!overrideForm.date || !overrideForm.capacity) {
      toast({
        title: 'Fehler',
        description: 'Bitte fülle alle Pflichtfelder aus',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/admin/capacity/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: overrideForm.date.toISOString().split('T')[0],
          service_type: overrideForm.service_type || null,
          capacity: parseInt(overrideForm.capacity),
          reason: overrideForm.reason || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Erstellen')
      }

      const data = await response.json()
      setCapacityOverrides([...capacityOverrides, data.override])
      setOverrideForm({
        date: undefined,
        service_type: '' as string | null,
        capacity: '',
        reason: '',
      })
      setIsOverrideDialogOpen(false)
      loadData()
      toast({
        title: 'Erfolg',
        description: 'Override wurde erstellt',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Erstellen',
        variant: 'destructive',
      })
    }
  }

  async function handleDeleteOverride(id: string) {
    try {
      const response = await fetch(`/api/admin/capacity/overrides/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Fehler beim Löschen')
      }

      setCapacityOverrides(capacityOverrides.filter(o => o.id !== id))
      loadData()
      toast({
        title: 'Erfolg',
        description: 'Override wurde gelöscht',
      })
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Löschen',
        variant: 'destructive',
      })
    }
  }

  const getCapacityServiceLabel = (serviceType: string | null) => {
    if (!serviceType) return 'Gesamt'
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

  const filteredBookings = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    if (filterService !== 'all' && b.service_type !== filterService) return false
    return true
  })

  const pendingBookings = filteredBookings.filter(b => b.status === 'pending')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const totalCapacity = capacitySettings.find(s => !s.service_type)?.default_capacity || 0
  const hundepensionCapacity = capacitySettings.find(s => s.service_type === 'hundepension')?.default_capacity || 0
  const katzenbetreuungCapacity = capacitySettings.find(s => s.service_type === 'katzenbetreuung')?.default_capacity || 0
  const tagesbetreuungCapacity = capacitySettings.find(s => s.service_type === 'tagesbetreuung')?.default_capacity || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Buchungsanfragen</h1>
          <p className="mt-2 text-sage-600">Verwalte alle Buchungsanfragen und Kapazitäten</p>
        </div>
        {pendingBookings.length > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-lg px-4 py-2">
            {pendingBookings.length} ausstehend
          </Badge>
        )}
      </div>

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bookings">Buchungen</TabsTrigger>
          <TabsTrigger value="capacity">Kapazitäten</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Service</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="hundepension">Urlaubsbetreuung</SelectItem>
                  <SelectItem value="katzenbetreuung">Katzenbetreuung</SelectItem>
                  <SelectItem value="tagesbetreuung">Tagesbetreuung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kalender */}
      <Card>
        <CardHeader>
          <CardTitle>Buchungskalender</CardTitle>
          <CardDescription>Übersicht aller Buchungen mit Kapazitätsanzeige</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingCalendar
            bookings={filteredBookings}
            capacityData={capacityData}
            isAdmin={true}
            onSelectBooking={(booking) => {
              setSelectedBooking(booking)
              setIsDialogOpen(true)
            }}
          />
        </CardContent>
      </Card>

      {/* Buchungsliste */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Buchungen ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length > 0 ? (
            <div className="space-y-3">
              {filteredBookings.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 border border-sage-200 rounded-lg hover:bg-sage-50 cursor-pointer"
                  onClick={() => {
                    setSelectedBooking(booking)
                    setIsDialogOpen(true)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sage-900">
                          {booking.pet?.name || 'Unbekannt'}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getServiceLabel(booking.service_type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-sage-600">
                        {booking.customer?.vorname} {booking.customer?.nachname}
                      </p>
                      <p className="text-sm text-sage-600 mt-1">
                        {new Date(booking.start_date).toLocaleDateString('de-DE')} - {new Date(booking.end_date).toLocaleDateString('de-DE')}
                      </p>
                      {booking.message && (
                        <p className="text-sm text-sage-500 mt-1 line-clamp-1">
                          {booking.message}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sage-600 text-center py-4">Keine Buchungen gefunden</p>
          )}
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Buchungsdetails</DialogTitle>
              <DialogDescription>
                {selectedBooking.status === 'pending' && 'Genehmige oder lehne diese Anfrage ab'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tier</Label>
                  <p className="font-medium">{selectedBooking.pet?.name || 'Unbekannt'}</p>
                </div>
                <div>
                  <Label>Service</Label>
                  <p className="font-medium">{getServiceLabel(selectedBooking.service_type)}</p>
                </div>
                <div>
                  <Label>Kunde</Label>
                  <p className="font-medium">
                    {selectedBooking.customer?.vorname} {selectedBooking.customer?.nachname}
                  </p>
                </div>
                <div>
                  <Label>Kontakt</Label>
                  <p className="font-medium">{selectedBooking.customer?.email}</p>
                  {selectedBooking.customer?.telefonnummer && (
                    <p className="text-sm text-sage-600">{selectedBooking.customer.telefonnummer}</p>
                  )}
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
              </div>

              {selectedBooking.message && (
                <div>
                  <Label>Nachricht vom Kunden</Label>
                  <p className="text-sage-600 mt-1 p-3 bg-sage-50 rounded">
                    {selectedBooking.message}
                  </p>
                </div>
              )}

              {selectedBooking.admin_notes && (
                <div>
                  <Label>Admin Notiz</Label>
                  <p className="text-sage-600 mt-1 p-3 bg-sage-50 rounded">
                    {selectedBooking.admin_notes}
                  </p>
                </div>
              )}

              {selectedBooking.status === 'pending' && (
                <div>
                  <Label>Admin Notiz (optional)</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Begründung für Genehmigung/Ablehnung..."
                    rows={3}
                  />
                </div>
              )}

              {selectedBooking.status === 'pending' && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setSelectedBooking(null)
                      setAdminNotes('')
                    }}
                  >
                    Schließen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusChange('rejected')}
                  >
                    Ablehnen
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange('approved')}
                  >
                    Genehmigen
                  </Button>
                </div>
              )}

              {selectedBooking.status !== 'pending' && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setSelectedBooking(null)
                      setAdminNotes('')
                    }}
                  >
                    Schließen
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          {/* Standard-Kapazitäten */}
          <Card>
            <CardHeader>
              <CardTitle>Standard-Kapazitäten</CardTitle>
              <CardDescription>
                Diese Kapazitäten gelten für alle Tage, außer es gibt einen Override
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Gesamtkapazität</Label>
                  <Input
                    type="number"
                    value={totalCapacity}
                    onChange={(e) => {
                      const newSettings = capacitySettings.map(s =>
                        !s.service_type
                          ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                          : s
                      )
                      if (!newSettings.find(s => !s.service_type)) {
                        newSettings.push({
                          id: '',
                          service_type: null,
                          default_capacity: parseInt(e.target.value) || 0,
                          created_at: '',
                          updated_at: '',
                        })
                      }
                      setCapacitySettings(newSettings)
                    }}
                    min="1"
                    placeholder="z.B. 10"
                  />
                </div>
                <div>
                  <Label>Urlaubsbetreuung</Label>
                  <Input
                    type="number"
                    value={hundepensionCapacity}
                    onChange={(e) => {
                      const newSettings = capacitySettings.map(s =>
                        s.service_type === 'hundepension'
                          ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                          : s
                      )
                      if (!newSettings.find(s => s.service_type === 'hundepension')) {
                        newSettings.push({
                          id: '',
                          service_type: 'hundepension',
                          default_capacity: parseInt(e.target.value) || 0,
                          created_at: '',
                          updated_at: '',
                        })
                      }
                      setCapacitySettings(newSettings)
                    }}
                    min="1"
                    placeholder="z.B. 5"
                  />
                </div>
                <div>
                  <Label>Katzenbetreuung</Label>
                  <Input
                    type="number"
                    value={katzenbetreuungCapacity}
                    onChange={(e) => {
                      const newSettings = capacitySettings.map(s =>
                        s.service_type === 'katzenbetreuung'
                          ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                          : s
                      )
                      if (!newSettings.find(s => s.service_type === 'katzenbetreuung')) {
                        newSettings.push({
                          id: '',
                          service_type: 'katzenbetreuung',
                          default_capacity: parseInt(e.target.value) || 0,
                          created_at: '',
                          updated_at: '',
                        })
                      }
                      setCapacitySettings(newSettings)
                    }}
                    min="1"
                    placeholder="z.B. 8"
                  />
                </div>
                <div>
                  <Label>Tagesbetreuung</Label>
                  <Input
                    type="number"
                    value={tagesbetreuungCapacity}
                    onChange={(e) => {
                      const newSettings = capacitySettings.map(s =>
                        s.service_type === 'tagesbetreuung'
                          ? { ...s, default_capacity: parseInt(e.target.value) || 0 }
                          : s
                      )
                      if (!newSettings.find(s => s.service_type === 'tagesbetreuung')) {
                        newSettings.push({
                          id: '',
                          service_type: 'tagesbetreuung',
                          default_capacity: parseInt(e.target.value) || 0,
                          created_at: '',
                          updated_at: '',
                        })
                      }
                      setCapacitySettings(newSettings)
                    }}
                    min="1"
                    placeholder="z.B. 6"
                  />
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-sage-600 hover:bg-sage-700">
                Kapazitäten speichern
              </Button>
            </CardContent>
          </Card>

          {/* Tages-Overrides */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tages-Overrides</CardTitle>
                  <CardDescription>
                    Überschreibe Kapazitäten für spezifische Tage (z.B. Ferien)
                  </CardDescription>
                </div>
                <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-sage-600 hover:bg-sage-700">
                      Neuer Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neuer Kapazitäts-Override</DialogTitle>
                      <DialogDescription>
                        Überschreibe die Standard-Kapazität für einen bestimmten Tag
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Datum *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {overrideForm.date ? (
                                format(overrideForm.date, 'PPP', { locale: de })
                              ) : (
                                <span>Datum wählen</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={overrideForm.date}
                              onSelect={(date) => setOverrideForm({ ...overrideForm, date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Service (optional)</Label>
                        <Select
                          value={overrideForm.service_type || 'all'}
                          onValueChange={(value) =>
                            setOverrideForm({ ...overrideForm, service_type: value === 'all' ? null : value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Gesamt</SelectItem>
                            <SelectItem value="hundepension">Urlaubsbetreuung</SelectItem>
                            <SelectItem value="katzenbetreuung">Katzenbetreuung</SelectItem>
                            <SelectItem value="tagesbetreuung">Tagesbetreuung</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Kapazität *</Label>
                        <Input
                          type="number"
                          value={overrideForm.capacity}
                          onChange={(e) => setOverrideForm({ ...overrideForm, capacity: e.target.value })}
                          min="1"
                          placeholder="z.B. 5"
                        />
                      </div>
                      <div>
                        <Label>Grund (optional)</Label>
                        <Textarea
                          value={overrideForm.reason}
                          onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                          placeholder="z.B. Ferien, Feiertag..."
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsOverrideDialogOpen(false)}>
                          Abbrechen
                        </Button>
                        <Button onClick={handleAddOverride} className="bg-sage-600 hover:bg-sage-700">
                          Erstellen
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {capacityOverrides.length > 0 ? (
                <div className="space-y-3">
                  {capacityOverrides
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(override => (
                      <div
                        key={override.id}
                        className="p-4 border border-sage-200 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-sage-900">
                            {new Date(override.date).toLocaleDateString('de-DE', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-sage-600">
                            {getCapacityServiceLabel(override.service_type)}: {override.capacity}
                          </p>
                          {override.reason && (
                            <p className="text-sm text-sage-500 mt-1">{override.reason}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOverride(override.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sage-600 text-center py-4">Keine Overrides vorhanden</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

