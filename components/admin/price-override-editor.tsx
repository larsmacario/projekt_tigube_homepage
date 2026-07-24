'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatDiscountLabel,
  formatEuro,
  resolvePriceOverride,
  type PriceOverrideDiscountType,
  type PriceOverrideRow,
} from '@/lib/price-override'

export type PriceOverrideFormState = {
  price: string
  discount_type: '' | PriceOverrideDiscountType
  discount_value: string
}

export const emptyPriceOverrideForm = (): PriceOverrideFormState => ({
  price: '',
  discount_type: '',
  discount_value: '',
})

export function overrideRowToForm(row: PriceOverrideRow | undefined): PriceOverrideFormState {
  if (!row) return emptyPriceOverrideForm()
  return {
    price: row.price != null ? String(row.price) : '',
    discount_type: row.discount_type ?? '',
    discount_value: row.discount_value != null ? String(row.discount_value) : '',
  }
}

export function formToOverrideRow(priceId: string, form: PriceOverrideFormState): PriceOverrideRow | null {
  const price = form.price.trim() === '' ? null : parseFloat(form.price)
  const discountType = form.discount_type === '' ? null : form.discount_type
  const discountValue =
    form.discount_value.trim() === '' ? null : parseFloat(form.discount_value)

  const hasPrice = price != null && !Number.isNaN(price)
  const hasDiscount =
    discountType != null && discountValue != null && !Number.isNaN(discountValue)

  if (!hasPrice && !hasDiscount) return null

  return {
    price_id: priceId,
    price: hasPrice ? price : null,
    discount_type: hasDiscount ? discountType : null,
    discount_value: hasDiscount ? discountValue : null,
  }
}

interface CatalogPriceLike {
  id: string
  price: number | null
  price_type: 'fixed' | 'percentage' | 'per_unit' | 'text'
  name: string
  unit: string | null
}

interface PriceOverrideEditorRowProps {
  catalogPrice: CatalogPriceLike
  categoryName?: string
  form: PriceOverrideFormState
  onChange: (next: PriceOverrideFormState) => void
  groupOverride?: PriceOverrideRow | null
}

export function PriceOverrideEditorRow({
  catalogPrice,
  categoryName,
  form,
  onChange,
  groupOverride = null,
}: PriceOverrideEditorRowProps) {
  const customerOverride = formToOverrideRow(catalogPrice.id, form)
  const resolved = resolvePriceOverride(
    catalogPrice,
    groupOverride,
    customerOverride
  )

  return (
    <div className="flex flex-col gap-3 p-3 border border-sage-100 rounded-lg">
      <div>
        <p className="font-semibold text-sage-900">{catalogPrice.name}</p>
        <p className="text-xs text-sage-500">
          {categoryName ? `Kategorie: ${categoryName} · ` : ''}
          Standard: {catalogPrice.price}€ {catalogPrice.unit}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Sonderpreis (€)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="Standard"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
            className="h-9 bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Rabatt-Typ</label>
          <Select
            value={form.discount_type || 'none'}
            onValueChange={(v) =>
              onChange({
                ...form,
                discount_type: v === 'none' ? '' : (v as PriceOverrideDiscountType),
              })
            }
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue placeholder="Kein Rabatt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Rabatt</SelectItem>
              <SelectItem value="fixed">€ Betrag</SelectItem>
              <SelectItem value="percentage">%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Rabatt</label>
          <Input
            type="number"
            step="0.01"
            placeholder="—"
            disabled={!form.discount_type}
            value={form.discount_value}
            onChange={(e) => onChange({ ...form, discount_value: e.target.value })}
            className="h-9 bg-white"
          />
        </div>
      </div>

      {resolved.base_price != null && (
        <p className="text-xs text-sage-600">
          Vorschau: Basis {formatEuro(resolved.base_price)}
          {resolved.discount_type && resolved.discount_value != null && resolved.discount_amount != null && (
            <>
              {' '}
              · Rabatt{' '}
              {formatDiscountLabel(resolved.discount_type, resolved.discount_value)} (
              {formatEuro(resolved.discount_amount)})
            </>
          )}
          {resolved.final_price != null && (
            <> · Endpreis {formatEuro(resolved.final_price)}</>
          )}
        </p>
      )}
    </div>
  )
}

interface GroupPriceOverrideEditorRowProps {
  catalogPrice: CatalogPriceLike
  form: PriceOverrideFormState
  onChange: (next: PriceOverrideFormState) => void
}

export function GroupPriceOverrideEditorRow({
  catalogPrice,
  form,
  onChange,
}: GroupPriceOverrideEditorRowProps) {
  const groupOverride = formToOverrideRow(catalogPrice.id, form)
  const resolved = resolvePriceOverride(catalogPrice, groupOverride, null)

  return (
    <div className="flex flex-col gap-3 p-3 border border-sage-100 rounded-lg">
      <div>
        <p className="font-semibold text-sage-900 text-sm">{catalogPrice.name}</p>
        <p className="text-xs text-sage-500">
          Standard: {catalogPrice.price}€ {catalogPrice.unit}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Sonderpreis (€)</label>
          <Input
            type="number"
            step="0.01"
            placeholder="Standard"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
            className="h-9 bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Rabatt-Typ</label>
          <Select
            value={form.discount_type || 'none'}
            onValueChange={(v) =>
              onChange({
                ...form,
                discount_type: v === 'none' ? '' : (v as PriceOverrideDiscountType),
              })
            }
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue placeholder="Kein Rabatt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Rabatt</SelectItem>
              <SelectItem value="fixed">€ Betrag</SelectItem>
              <SelectItem value="percentage">%</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Rabatt</label>
          <Input
            type="number"
            step="0.01"
            placeholder="—"
            disabled={!form.discount_type}
            value={form.discount_value}
            onChange={(e) => onChange({ ...form, discount_value: e.target.value })}
            className="h-9 bg-white"
          />
        </div>
      </div>

      {resolved.base_price != null && resolved.is_override && (
        <p className="text-xs text-sage-600">
          Vorschau: Basis {formatEuro(resolved.base_price)}
          {resolved.discount_type && resolved.discount_value != null && resolved.discount_amount != null && (
            <>
              {' '}
              · Rabatt{' '}
              {formatDiscountLabel(resolved.discount_type, resolved.discount_value)} (
              {formatEuro(resolved.discount_amount)})
            </>
          )}
          {resolved.final_price != null && (
            <> · Endpreis {formatEuro(resolved.final_price)}</>
          )}
        </p>
      )}
    </div>
  )
}
