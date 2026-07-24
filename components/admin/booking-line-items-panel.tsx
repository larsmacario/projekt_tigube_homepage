'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { formatEuro } from '@/lib/price-override'
import type { BookingLineItem } from '@/lib/types'

interface BookingLineItemsPanelProps {
  bookingId: string
}

interface SiblingBooking {
  id: string
  service_type: string
  pet?: { name?: string }
}

export function BookingLineItemsPanel({ bookingId }: BookingLineItemsPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [siblings, setSiblings] = useState<SiblingBooking[]>([])
  const [lineItems, setLineItems] = useState<BookingLineItem[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [newUnitPrice, setNewUnitPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadLineItems() {
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/admin/bookings/${bookingId}/line-items`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden')
      }
      setSiblings(data.siblings || [])
      setLineItems(data.line_items || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Positionen konnten nicht geladen werden',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLineItems()
  }, [bookingId])

  async function addManualLine() {
    if (!newLabel.trim()) {
      toast({ title: 'Fehler', description: 'Bezeichnung fehlt', variant: 'destructive' })
      return
    }

    const quantity = Math.max(1, parseInt(newQuantity, 10) || 1)
    const unitPrice = newUnitPrice ? parseFloat(newUnitPrice) : null
    const lineTotal =
      unitPrice != null && !Number.isNaN(unitPrice)
        ? Math.round(unitPrice * quantity * 100) / 100
        : null

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/bookings/${bookingId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          price_type: 'fixed',
          quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      setLineItems((prev) => [...prev, data.line_item])
      setNewLabel('')
      setNewQuantity('1')
      setNewUnitPrice('')
      toast({ title: 'Gespeichert', description: 'Position hinzugefügt' })
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteLine(lineItemId: string) {
    try {
      const response = await authenticatedFetch(
        `/api/admin/bookings/${bookingId}/line-items?line_item_id=${lineItemId}`,
        { method: 'DELETE' }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Löschen fehlgeschlagen')
      setLineItems((prev) => prev.filter((l) => l.id !== lineItemId))
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Löschen fehlgeschlagen',
        variant: 'destructive',
      })
    }
  }

  function formatLineAmount(item: BookingLineItem): string {
    if (item.price_type === 'percentage' && item.unit_price != null) {
      return `+${item.unit_price}%${item.unit ? ` ${item.unit}` : ''}`
    }
    if (item.line_total != null) return formatEuro(item.line_total)
    if (item.unit_price != null) return formatEuro(item.unit_price)
    return '—'
  }

  if (loading) {
    return <p className="text-sm text-sage-600">Rechnungspositionen werden geladen…</p>
  }

  return (
    <div className="space-y-4 border-t border-sage-200 pt-4">
      {siblings.length > 1 && (
        <div>
          <Label>Gruppenanfrage – Tiere</Label>
          <ul className="mt-1 list-inside list-disc text-sm text-sage-800">
            {siblings.map((s) => (
              <li key={s.id}>
                {s.pet?.name || 'Unbekannt'} ({s.service_type})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Label className="text-base">Rechnungspositionen</Label>
        <p className="mb-2 text-xs text-sage-600">
          Für spätere Rechnungsstellung (SevDesk). Kunden-Extras sind mit „Kunde“ markiert.
        </p>
        {lineItems.length === 0 ? (
          <p className="text-sm text-sage-600">Noch keine Positionen.</p>
        ) : (
          <ul className="space-y-2">
            {lineItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-md border border-sage-200 p-2 text-sm"
              >
                <div>
                  <p className="font-medium text-sage-900">{item.label}</p>
                  <p className="text-sage-600">
                    Menge: {item.quantity}
                    {item.unit ? ` · ${item.unit}` : ''}
                  </p>
                  <p className="font-semibold text-sage-800">{formatLineAmount(item)}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.source === 'customer' ? 'Kunde' : 'Admin'}
                  </Badge>
                </div>
                {item.source === 'admin' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Position löschen"
                    onClick={() => deleteLine(item.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-sage-300 bg-sage-50/50 p-3 space-y-2">
        <Label>Admin-Position hinzufügen</Label>
        <Input
          placeholder="Bezeichnung"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Menge</Label>
            <Input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Einzelpreis (€)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={newUnitPrice}
              onChange={(e) => setNewUnitPrice(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" size="sm" disabled={saving} onClick={addManualLine}>
          Position speichern
        </Button>
      </div>
    </div>
  )
}
