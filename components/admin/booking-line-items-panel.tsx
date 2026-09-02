'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import {
  computeLineItemSnapshot,
  getBookableExtrasForService,
  type BookingExtraCategory,
  type BookingExtraPrice,
} from '@/lib/booking-extras'
import {
  computeAdminBookingLineAmounts,
  mergeLineItemDescription,
  type AdminLineDiscountType,
} from '@/lib/admin-booking-line-pricing'
import { formatEuro } from '@/lib/price-override'
import { formatNetGrossInline } from '@/lib/vat-amount'
import { VatPriceDisplay } from '@/components/vat-price-display'
import type { AddonService, BookingLineItem, ServiceType } from '@/lib/types'

interface BookingLineItemsPanelProps {
  bookingId: string
}

interface SiblingBooking {
  id: string
  service_type: ServiceType
  pet?: { name?: string }
}

function formatExtraPrice(price: BookingExtraPrice): string {
  if (price.price_type === 'percentage') {
    return `+${price.final_price ?? price.price ?? 0}%${price.unit ? ` ${price.unit}` : ''}`
  }
  const amount = price.final_price ?? price.price
  if (amount == null) return ''
  return `${formatEuro(amount)}${price.unit ? ` ${price.unit}` : ''}`
}

export function BookingLineItemsPanel({ bookingId }: BookingLineItemsPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [siblings, setSiblings] = useState<SiblingBooking[]>([])
  const [lineItems, setLineItems] = useState<BookingLineItem[]>([])
  const [extraCategories, setExtraCategories] = useState<BookingExtraCategory[]>([])
  const [extraPrices, setExtraPrices] = useState<BookingExtraPrice[]>([])
  const [addonServices, setAddonServices] = useState<AddonService[]>([])
  const [selectedSiblingId, setSelectedSiblingId] = useState('')
  const [selectedPriceId, setSelectedPriceId] = useState('')
  const [selectedAddonId, setSelectedAddonId] = useState('')
  const [extraQuantity, setExtraQuantity] = useState('1')
  const [addonQuantity, setAddonQuantity] = useState('1')
  const [extraUnitPrice, setExtraUnitPrice] = useState('')
  const [extraDiscountType, setExtraDiscountType] = useState<AdminLineDiscountType>('none')
  const [extraDiscountValue, setExtraDiscountValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [newUnitPrice, setNewUnitPrice] = useState('')
  const [newDiscountType, setNewDiscountType] = useState<AdminLineDiscountType>('none')
  const [newDiscountValue, setNewDiscountValue] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedCatalogPrice = extraPrices.find((p) => p.id === selectedPriceId)
  const selectedAddonService = addonServices.find((service) => service.id === selectedAddonId)

  const selectedSibling = siblings.find((s) => s.id === selectedSiblingId) ?? siblings[0]

  const extrasForSelectedPet = useMemo(() => {
    if (!selectedSibling) return []
    return getBookableExtrasForService(extraPrices, extraCategories, selectedSibling.service_type)
  }, [extraPrices, extraCategories, selectedSibling])

  const duplicateCatalogEntry = useMemo(() => {
    if (!selectedPriceId || !selectedSibling) return false
    return lineItems.some(
      (item) => item.price_id === selectedPriceId && item.booking_id === selectedSibling.id
    )
  }, [lineItems, selectedPriceId, selectedSibling])

  const duplicateAddonEntry = useMemo(() => {
    if (!selectedAddonId || !selectedSibling) return false
    return lineItems.some(
      (item) =>
        item.addon_service_id === selectedAddonId && item.booking_id === selectedSibling.id
    )
  }, [lineItems, selectedAddonId, selectedSibling])

  async function loadLineItems() {
    setLoading(true)
    try {
      const response = await authenticatedFetch(`/api/admin/bookings/${bookingId}/line-items`)
      const raw = await response.text()
      let data: Record<string, unknown> = {}
      try {
        data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      } catch {
        throw new Error(
          raw.startsWith('Internal')
            ? 'Serverfehler beim Laden der Positionen'
            : raw.slice(0, 120) || `Fehler ${response.status}`
        )
      }
      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Fehler beim Laden')
      }
      const loadedSiblings: SiblingBooking[] = (data.siblings as SiblingBooking[]) || []
      setSiblings(loadedSiblings)
      setLineItems((data.line_items as BookingLineItem[]) || [])
      const catalog = data.extra_catalog as
        | { categories?: BookingExtraCategory[]; prices?: BookingExtraPrice[] }
        | undefined
      setExtraCategories(catalog?.categories || [])
      setExtraPrices(catalog?.prices || [])
      setAddonServices((data.addon_catalog as AddonService[]) || [])
      if (loadedSiblings.length > 0) {
        setSelectedSiblingId((prev) =>
          prev && loadedSiblings.some((s) => s.id === prev) ? prev : loadedSiblings[0].id
        )
      }
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

  useEffect(() => {
    setSelectedPriceId('')
    setSelectedAddonId('')
  }, [selectedSiblingId])

  useEffect(() => {
    if (!selectedCatalogPrice) {
      setExtraUnitPrice('')
      setExtraDiscountType('none')
      setExtraDiscountValue('')
      return
    }
    if (selectedCatalogPrice.price_type === 'percentage') {
      const rate = selectedCatalogPrice.final_price ?? selectedCatalogPrice.price
      setExtraUnitPrice(rate != null ? String(rate) : '')
    } else {
      const unit = selectedCatalogPrice.final_price ?? selectedCatalogPrice.price
      setExtraUnitPrice(unit != null ? String(unit) : '')
    }
    setExtraDiscountType('none')
    setExtraDiscountValue('')
  }, [selectedCatalogPrice])

  const catalogPreview = useMemo(() => {
    if (!selectedCatalogPrice) return null
    const quantity = Math.max(1, parseInt(extraQuantity, 10) || 1)
    const unitPrice = extraUnitPrice ? parseFloat(extraUnitPrice) : null
    const discountValue = extraDiscountValue ? parseFloat(extraDiscountValue) : null
    return computeAdminBookingLineAmounts(
      quantity,
      unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : null,
      selectedCatalogPrice.price_type,
      extraDiscountType,
      discountValue != null && !Number.isNaN(discountValue) ? discountValue : null
    )
  }, [
    selectedCatalogPrice,
    extraQuantity,
    extraUnitPrice,
    extraDiscountType,
    extraDiscountValue,
  ])

  const manualPreview = useMemo(() => {
    const quantity = Math.max(1, parseInt(newQuantity, 10) || 1)
    const unitPrice = newUnitPrice ? parseFloat(newUnitPrice) : null
    const discountValue = newDiscountValue ? parseFloat(newDiscountValue) : null
    return computeAdminBookingLineAmounts(
      quantity,
      unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : null,
      'fixed',
      newDiscountType,
      discountValue != null && !Number.isNaN(discountValue) ? discountValue : null
    )
  }, [newQuantity, newUnitPrice, newDiscountType, newDiscountValue])

  function parseDiscountValue(type: AdminLineDiscountType, raw: string): number | null {
    if (type === 'none' || !raw.trim()) return null
    const n = parseFloat(raw)
    return Number.isNaN(n) ? null : n
  }

  async function addCatalogExtra() {
    if (!selectedSibling || !selectedPriceId) {
      toast({
        title: 'Fehler',
        description: 'Bitte Tier und Zusatzleistung wählen',
        variant: 'destructive',
      })
      return
    }

    if (duplicateCatalogEntry) {
      toast({
        title: 'Hinweis',
        description: 'Diese Zusatzleistung ist für dieses Tier bereits vorhanden.',
        variant: 'destructive',
      })
      return
    }

    const price = extraPrices.find((p) => p.id === selectedPriceId)
    if (!price) {
      toast({ title: 'Fehler', description: 'Leistung nicht gefunden', variant: 'destructive' })
      return
    }

    const quantity = Math.max(1, parseInt(extraQuantity, 10) || 1)
    const parsedUnit = extraUnitPrice ? parseFloat(extraUnitPrice) : null
    const { unit_price, line_total, discount_note } = computeAdminBookingLineAmounts(
      quantity,
      parsedUnit != null && !Number.isNaN(parsedUnit) ? parsedUnit : null,
      price.price_type,
      extraDiscountType,
      parseDiscountValue(extraDiscountType, extraDiscountValue)
    )

    if (price.price_type !== 'percentage' && line_total == null) {
      toast({ title: 'Fehler', description: 'Bitte gültigen Einzelpreis angeben', variant: 'destructive' })
      return
    }

    const snapshot =
      price.price_type === 'percentage'
        ? computeLineItemSnapshot(price, quantity)
        : { unit_price, line_total, quantity }

    const petName = selectedSibling.pet?.name || 'Tier'
    const label = `${petName}: ${price.name}`

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/bookings/${bookingId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_id: price.id,
          label,
          description: mergeLineItemDescription(price.description, discount_note),
          price_type: price.price_type,
          unit: price.unit,
          quantity: snapshot.quantity ?? quantity,
          unit_price: snapshot.unit_price ?? unit_price,
          line_total: snapshot.line_total ?? line_total,
          booking_id: selectedSibling.id,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      setLineItems((prev) => [...prev, data.line_item])
      setSelectedPriceId('')
      setExtraQuantity('1')
      setExtraUnitPrice('')
      setExtraDiscountType('none')
      setExtraDiscountValue('')
      toast({ title: 'Gespeichert', description: 'Zusatzleistung hinzugefügt' })
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

  async function addCatalogAddon() {
    if (!selectedSibling || !selectedAddonId) {
      toast({
        title: 'Fehler',
        description: 'Bitte Tier und Zusatzleistung wählen',
        variant: 'destructive',
      })
      return
    }

    if (duplicateAddonEntry) {
      toast({
        title: 'Hinweis',
        description: 'Diese Zusatzleistung ist für dieses Tier bereits vorhanden.',
        variant: 'destructive',
      })
      return
    }

    const service = addonServices.find((entry) => entry.id === selectedAddonId)
    if (!service) {
      toast({ title: 'Fehler', description: 'Zusatzleistung nicht gefunden', variant: 'destructive' })
      return
    }

    const quantity = Math.max(1, parseInt(addonQuantity, 10) || 1)
    const unitPrice = Number(service.amount)
    const lineTotal = unitPrice * quantity
    const petName = selectedSibling.pet?.name || 'Tier'
    const label = `${petName}: ${service.title}`

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/bookings/${bookingId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addon_service_id: service.id,
          label,
          description: service.description,
          price_type: 'fixed',
          quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
          booking_id: selectedSibling.id,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      setLineItems((prev) => [...prev, data.line_item])
      setSelectedAddonId('')
      setAddonQuantity('1')
      toast({ title: 'Gespeichert', description: 'Zusatzleistung hinzugefügt' })
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

  async function addManualLine() {
    if (!newLabel.trim()) {
      toast({ title: 'Fehler', description: 'Bezeichnung fehlt', variant: 'destructive' })
      return
    }

    const quantity = Math.max(1, parseInt(newQuantity, 10) || 1)
    const parsedUnit = newUnitPrice ? parseFloat(newUnitPrice) : null
    const { unit_price, line_total, discount_note } = computeAdminBookingLineAmounts(
      quantity,
      parsedUnit != null && !Number.isNaN(parsedUnit) ? parsedUnit : null,
      'fixed',
      newDiscountType,
      parseDiscountValue(newDiscountType, newDiscountValue)
    )

    setSaving(true)
    try {
      const response = await authenticatedFetch(`/api/admin/bookings/${bookingId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          description: discount_note,
          price_type: 'fixed',
          quantity,
          unit_price,
          line_total,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Fehler beim Speichern')

      setLineItems((prev) => [...prev, data.line_item])
      setNewLabel('')
      setNewQuantity('1')
      setNewUnitPrice('')
      setNewDiscountType('none')
      setNewDiscountValue('')
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

  const siblingSelectValue = selectedSibling?.id ?? ''

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
                    {item.unit_price != null &&
                      item.price_type !== 'percentage' &&
                      ` · ${formatEuro(item.unit_price)} / Einheit`}
                  </p>
                  {item.description && (
                    <p className="text-xs text-sage-500">{item.description}</p>
                  )}
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

      {addonServices.length > 0 && (
        <div className="rounded-lg border border-sage-200 bg-white p-3 space-y-3">
          <Label>Zusatzleistung aus Katalog</Label>
          <p className="text-xs text-sage-600">
            Abrechenbare Katalog-Leistungen (auch ohne Buchungs-Freigabe). Preise netto, 19 % USt. auf
            der Rechnung.
          </p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Tier</Label>
              <Select
                value={siblingSelectValue}
                onValueChange={setSelectedSiblingId}
                disabled={siblings.length <= 1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tier wählen" />
                </SelectTrigger>
                <SelectContent>
                  {siblings.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.pet?.name || 'Unbekannt'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Zusatzleistung</Label>
              <Select value={selectedAddonId} onValueChange={setSelectedAddonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Zusatzleistung wählen" />
                </SelectTrigger>
                <SelectContent>
                  {addonServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title} ({formatNetGrossInline(Number(service.amount))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Menge</Label>
              <Input
                type="number"
                min={1}
                value={addonQuantity}
                onChange={(e) => setAddonQuantity(e.target.value)}
              />
            </div>
            {selectedAddonService && (
              <div className="text-xs text-sage-600 space-y-2">
                <div>
                  <p className="text-sage-500">Einzelpreis</p>
                  <VatPriceDisplay net={Number(selectedAddonService.amount)} />
                </div>
                <div>
                  <p className="text-sage-500">Gesamt</p>
                  <VatPriceDisplay
                    net={
                      Number(selectedAddonService.amount) *
                      Math.max(1, parseInt(addonQuantity, 10) || 1)
                    }
                  />
                </div>
              </div>
            )}
            {duplicateAddonEntry && (
              <p className="text-xs text-amber-700">
                Für dieses Tier ist diese Zusatzleistung bereits als Position hinterlegt.
              </p>
            )}
            <Button
              type="button"
              size="sm"
              disabled={saving || !selectedAddonId || duplicateAddonEntry}
              onClick={addCatalogAddon}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {extrasForSelectedPet.length > 0 && (
        <div className="rounded-lg border border-sage-200 bg-white p-3 space-y-3">
          <Label>Zusatzleistung hinzufügen</Label>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Tier</Label>
              <Select
                value={siblingSelectValue}
                onValueChange={setSelectedSiblingId}
                disabled={siblings.length <= 1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tier wählen" />
                </SelectTrigger>
                <SelectContent>
                  {siblings.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.pet?.name || 'Unbekannt'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Leistung</Label>
              <Select value={selectedPriceId} onValueChange={setSelectedPriceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Zusatzleistung wählen" />
                </SelectTrigger>
                <SelectContent>
                  {extrasForSelectedPet.map((price) => (
                    <SelectItem key={price.id} value={price.id}>
                      {price.name} ({formatExtraPrice(price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Menge</Label>
                <Input
                  type="number"
                  min={1}
                  value={extraQuantity}
                  onChange={(e) => setExtraQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">
                  {selectedCatalogPrice?.price_type === 'percentage'
                    ? 'Satz (%)'
                    : 'Einzelpreis (€)'}
                </Label>
                <Input
                  type="number"
                  step={selectedCatalogPrice?.price_type === 'percentage' ? '0.1' : '0.01'}
                  min={0}
                  value={extraUnitPrice}
                  onChange={(e) => setExtraUnitPrice(e.target.value)}
                />
              </div>
            </div>
            {selectedCatalogPrice?.price_type !== 'percentage' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Rabatt</Label>
                  <Select
                    value={extraDiscountType}
                    onValueChange={(v) => setExtraDiscountType(v as AdminLineDiscountType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Rabatt</SelectItem>
                      <SelectItem value="percentage">Prozent (%)</SelectItem>
                      <SelectItem value="fixed">Betrag (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">
                    {extraDiscountType === 'percentage'
                      ? 'Rabatt in %'
                      : extraDiscountType === 'fixed'
                        ? 'Rabatt in €'
                        : '—'}
                  </Label>
                  <Input
                    type="number"
                    step={extraDiscountType === 'percentage' ? '0.1' : '0.01'}
                    min={0}
                    disabled={extraDiscountType === 'none'}
                    value={extraDiscountValue}
                    onChange={(e) => setExtraDiscountValue(e.target.value)}
                  />
                </div>
              </div>
            )}
            {catalogPreview?.line_total != null && (
              <p className="text-xs text-sage-600">
                Vorschau Gesamt:{' '}
                <span className="font-medium text-sage-800">
                  {formatEuro(catalogPreview.line_total)}
                </span>
                {catalogPreview.discount_note ? ` (${catalogPreview.discount_note})` : ''}
              </p>
            )}
            {duplicateCatalogEntry && (
              <p className="text-xs text-amber-700">
                Für dieses Tier ist diese Leistung bereits als Position hinterlegt.
              </p>
            )}
            <Button
              type="button"
              size="sm"
              disabled={saving || !selectedPriceId || duplicateCatalogEntry}
              onClick={addCatalogExtra}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-sage-300 bg-sage-50/50 p-3 space-y-2">
        <Label>Position hinzufügen</Label>
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Rabatt</Label>
            <Select
              value={newDiscountType}
              onValueChange={(v) => setNewDiscountType(v as AdminLineDiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Rabatt</SelectItem>
                <SelectItem value="percentage">Prozent (%)</SelectItem>
                <SelectItem value="fixed">Betrag (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">
              {newDiscountType === 'percentage'
                ? 'Rabatt in %'
                : newDiscountType === 'fixed'
                  ? 'Rabatt in €'
                  : '—'}
            </Label>
            <Input
              type="number"
              step={newDiscountType === 'percentage' ? '0.1' : '0.01'}
              min={0}
              disabled={newDiscountType === 'none'}
              value={newDiscountValue}
              onChange={(e) => setNewDiscountValue(e.target.value)}
            />
          </div>
        </div>
        {manualPreview.line_total != null && (
          <p className="text-xs text-sage-600">
            Vorschau Gesamt:{' '}
            <span className="font-medium text-sage-800">{formatEuro(manualPreview.line_total)}</span>
            {manualPreview.discount_note ? ` (${manualPreview.discount_note})` : ''}
          </p>
        )}
        <Button type="button" size="sm" disabled={saving} onClick={addManualLine}>
          Position speichern
        </Button>
      </div>
    </div>
  )
}
