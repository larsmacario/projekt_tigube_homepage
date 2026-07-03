'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CapacityIndicator } from '@/components/capacity-indicator'
import type { BookingRequest, CalendarDay } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BookingCalendarProps {
  bookings: BookingRequest[]
  capacityData?: Array<{
    date: string
    current: number
    max: number
    serviceType?: string | null
  }>
  view?: 'month' | 'week'
  onSelectDate?: (date: Date) => void
  onSelectBooking?: (booking: BookingRequest) => void
  isAdmin?: boolean
}

export function BookingCalendar({
  bookings,
  capacityData = [],
  view: initialView = 'month',
  onSelectDate,
  onSelectBooking,
  isAdmin = false,
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>(initialView)

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

  // Berechne Kalendertage für Monatsansicht
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1)) // Montag als Start
    
    const days: CalendarDay[] = []
    const current = new Date(startDate)
    
    // 6 Wochen = 42 Tage
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0]
      const dayBookings = bookings.filter(b => {
        const start = new Date(b.start_date)
        const end = new Date(b.end_date)
        return current >= start && current <= end
      })
      
      const capacity = capacityData.find(c => c.date === dateStr)
      
      days.push({
        date: new Date(current),
        bookings: dayBookings,
        capacity: {
          current: capacity?.current || dayBookings.filter(b => b.status === 'approved').length,
          max: capacity?.max || 0,
          serviceType: capacity?.serviceType,
        },
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentDate, bookings, capacityData])

  // Berechne Wochentage für Wochenansicht
  const weekDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const date = currentDate.getDate()
    const current = new Date(year, month, date)
    
    // Finde Montag der aktuellen Woche
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(current.setDate(diff))
    
    const days: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayBookings = bookings.filter(b => {
        const start = new Date(b.start_date)
        const end = new Date(b.end_date)
        return date >= start && date <= end
      })
      
      const capacity = capacityData.find(c => c.date === dateStr)
      
      days.push({
        date: new Date(date),
        bookings: dayBookings,
        capacity: {
          current: capacity?.current || dayBookings.filter(b => b.status === 'approved').length,
          max: capacity?.max || 0,
          serviceType: capacity?.serviceType,
        },
      })
    }
    
    return days
  }, [currentDate, bookings, capacityData])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
      return newDate
    })
  }

  const weekDayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  if (view === 'week') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold text-sage-900">
              {weekDays[0].date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} -{' '}
              {weekDays[6].date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Monat
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Woche
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => (
            <Card
              key={idx}
              className={cn(
                'cursor-pointer hover:border-sage-400 transition-colors',
                day.date.toDateString() === new Date().toDateString() && 'border-sage-600 border-2'
              )}
              onClick={() => onSelectDate?.(day.date)}
            >
              <CardContent className="p-3">
                <div className="text-center mb-2">
                  <p className="text-sm font-semibold text-sage-600">{weekDayNames[idx]}</p>
                  <p className="text-lg font-bold text-sage-900">{day.date.getDate()}</p>
                </div>
                
                {isAdmin && day.capacity.max > 0 && (
                  <CapacityIndicator
                    current={day.capacity.current}
                    max={day.capacity.max}
                    serviceType={day.capacity.serviceType}
                    className="mb-2"
                    showLabel={false}
                  />
                )}
                
                <div className="space-y-1">
                  {day.bookings.slice(0, 3).map(booking => (
                    <div
                      key={booking.id}
                      className={cn(
                        'text-xs p-1 rounded border cursor-pointer',
                        getStatusColor(booking.status)
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectBooking?.(booking)
                      }}
                    >
                      <p className="font-medium truncate">
                        {isAdmin && booking.pet ? booking.pet.name : getServiceLabel(booking.service_type)}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  ))}
                  {day.bookings.length > 3 && (
                    <p className="text-xs text-sage-600 text-center">
                      +{day.bookings.length - 3} weitere
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold text-sage-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            Monat
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Woche
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-sage-600 p-2">
            {day}
          </div>
        ))}
        
        {monthDays.map((day, idx) => {
          const isCurrentMonth = day.date.getMonth() === currentDate.getMonth()
          const isToday = day.date.toDateString() === new Date().toDateString()
          
          return (
            <Card
              key={idx}
              className={cn(
                'min-h-[100px] cursor-pointer hover:border-sage-400 transition-colors',
                !isCurrentMonth && 'opacity-40',
                isToday && 'border-sage-600 border-2'
              )}
              onClick={() => onSelectDate?.(day.date)}
            >
              <CardContent className="p-2">
                <p className={cn(
                  'text-sm font-semibold mb-1',
                  isToday ? 'text-sage-900' : 'text-sage-600'
                )}>
                  {day.date.getDate()}
                </p>
                
                {isAdmin && day.capacity.max > 0 && (
                  <CapacityIndicator
                    current={day.capacity.current}
                    max={day.capacity.max}
                    serviceType={day.capacity.serviceType}
                    className="mb-2"
                    showLabel={false}
                  />
                )}
                
                <div className="space-y-1">
                  {day.bookings.slice(0, 2).map(booking => (
                    <div
                      key={booking.id}
                      className={cn(
                        'text-xs p-1 rounded border cursor-pointer truncate',
                        getStatusColor(booking.status)
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectBooking?.(booking)
                      }}
                      title={isAdmin && booking.pet ? booking.pet.name : getServiceLabel(booking.service_type)}
                    >
                      {isAdmin && booking.pet ? booking.pet.name : getServiceLabel(booking.service_type)}
                    </div>
                  ))}
                  {day.bookings.length > 2 && (
                    <p className="text-xs text-sage-600">
                      +{day.bookings.length - 2}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

