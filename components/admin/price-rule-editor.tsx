'use client'

import { Button } from '@/components/ui/button'
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
  resolveCatalogPrice,
  type PriceRuleMode,
  type PriceRuleRow,
} from '@/lib/price-resolver'
import {
  FIXED_PERCENTAGE_SURCHARGE_RATE,
  formatFixedPercentageLabel,
  isFixedPercentageCatalogPrice,
} from '@/lib/price-catalog-policy'
import { RotateCcw, Trash2 } from 'lucide-react'

export type PriceRuleFormState = {
  rule_mode: '' | PriceRuleMode
  price: string
  discount_type: '' | 'fixed' | 'percentage'
  discount_value: string
}

export const emptyPriceRuleForm = (): PriceRuleFormState => ({
  rule_mode: '',
  price: '',
  discount_type: '',
  discount_value: '',
})

export function ruleRowToForm(row: PriceRuleRow | undefined): PriceRuleFormState {
  if (!row) return emptyPriceRuleForm()
  return {
    rule_mode: row.rule_mode,
    price: row.price != null ? String(row.price) : '',
    discount_type: row.discount_type ?? '',
    discount_value: row.discount_value != null ? String(row.discount_value) : '',
  }
}

export function formToRuleRow(priceId: string, form: PriceRuleFormState): PriceRuleRow | null {
  if (form.rule_mode === 'inherit') {
    return null
  }

  if (form.rule_mode === 'not_applicable') {
    return {
      price_id: priceId,
      rule_mode: 'not_applicable',
      price: null,
      discount_type: null,
      discount_value: null,
    }
  }

  const price = form.price.trim() === '' ? null : parseFloat(form.price)
  const discountType = form.discount_type === '' ? null : form.discount_type
  const discountValue =
    form.discount_value.trim() === '' ? null : parseFloat(form.discount_value)

  const hasPrice = price != null && !Number.isNaN(price)
  const hasDiscount =
    discountType != null && discountValue != null && !Number.isNaN(discountValue)

  if (!hasPrice && !hasDiscount) {
    if (form.rule_mode === 'custom') {
      return null
    }
    return null
  }

  return {
    price_id: priceId,
    rule_mode: 'custom',
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
  usage?: string
}

function FixedPercentageInfo({ catalogPrice }: { catalogPrice: CatalogPriceLike }) {
  return (
    <div className="flex flex-col gap-2 p-3 border border-sage-100 rounded-lg bg-sage-50/40">
      <p className="font-semibold text-sage-900 text-sm">{catalogPrice.name}</p>
      <p className="text-xs text-sage-500">
        {formatFixedPercentageLabel(FIXED_PERCENTAGE_SURCHARGE_RATE)} (fest im Katalog)
      </p>
    </div>
  )
}

interface PriceRuleEditorRowProps {
  catalogPrice: CatalogPriceLike
  categoryName?: string
  form: PriceRuleFormState
  onChange: (next: PriceRuleFormState) => void
  allowPetModes?: boolean
  inheritedFinalPrice?: number | null
}

export function PriceRuleEditorRow({
  catalogPrice,
  categoryName,
  form,
  onChange,
  allowPetModes = false,
  inheritedFinalPrice = null,
}: PriceRuleEditorRowProps) {
  if (isFixedPercentageCatalogPrice(catalogPrice)) {
    return <FixedPercentageInfo catalogPrice={catalogPrice} />
  }

  const customRule = formToRuleRow(catalogPrice.id, form)
  const resolved = resolveCatalogPrice(catalogPrice, {
    petRule: customRule,
  })

  const showCustomFields = !allowPetModes || form.rule_mode === 'custom'

  return (
    <div className="flex flex-col gap-3 p-3 border border-sage-100 rounded-lg">
      <div>
        <p className="font-semibold text-sage-900 text-sm">{catalogPrice.name}</p>
        <p className="text-xs text-sage-500">
          {categoryName ? `Kategorie: ${categoryName} · ` : ''}
          Standard: {catalogPrice.price != null ? `${catalogPrice.price}€` : '—'}{' '}
          {catalogPrice.unit}
        </p>
      </div>

      {allowPetModes && (
        <div className="space-y-1">
          <label className="text-xs text-sage-600">Status für dieses Tier</label>
          <Select
            value={form.rule_mode || 'inherit'}
            onValueChange={(value) =>
              onChange({
                ...emptyPriceRuleForm(),
                rule_mode: value as PriceRuleMode,
              })
            }
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">Geerbt</SelectItem>
              <SelectItem value="custom">Eigener Preis</SelectItem>
              <SelectItem value="not_applicable">Trifft nicht zu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {form.rule_mode === 'not_applicable' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
          Diese Leistung wird für dieses Tier angezeigt, aber nicht berechnet.
        </p>
      )}

      {showCustomFields && form.rule_mode !== 'not_applicable' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-sage-600">Sonderpreis (€)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="Standard"
              value={form.price}
              onChange={(e) =>
                onChange({
                  ...form,
                  price: e.target.value,
                  rule_mode: allowPetModes ? 'custom' : form.rule_mode || 'custom',
                })
              }
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
                  discount_type: v === 'none' ? '' : (v as 'fixed' | 'percentage'),
                  rule_mode: allowPetModes ? 'custom' : form.rule_mode || 'custom',
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
              onChange={(e) =>
                onChange({
                  ...form,
                  discount_value: e.target.value,
                  rule_mode: allowPetModes ? 'custom' : form.rule_mode || 'custom',
                })
              }
              className="h-9 bg-white"
            />
          </div>
        </div>
      )}

      {form.rule_mode === 'inherit' && inheritedFinalPrice != null && (
        <p className="text-xs text-sage-600">
          Geerbter Preis: {formatEuro(inheritedFinalPrice)}
          {catalogPrice.unit ? ` ${catalogPrice.unit}` : ''}
        </p>
      )}

      {resolved.base_price != null && form.rule_mode !== 'inherit' && (
        <p className="text-xs text-sage-600">
          Vorschau: Basis {formatEuro(resolved.base_price)}
          {resolved.discount_type &&
            resolved.discount_value != null &&
            resolved.discount_amount != null && (
              <>
                {' '}
                · Rabatt {formatDiscountLabel(resolved.discount_type, resolved.discount_value)} (
                {formatEuro(resolved.discount_amount)})
              </>
            )}
          {resolved.final_price != null && <> · Endpreis {formatEuro(resolved.final_price)}</>}
        </p>
      )}
    </div>
  )
}

// Backward-compatible exports for existing customer/group editors
export type PriceOverrideFormState = PriceRuleFormState
export const emptyPriceOverrideForm = emptyPriceRuleForm
export const overrideRowToForm = (row: PriceRuleRow | undefined) => ruleRowToForm(row)
export const formToOverrideRow = formToRuleRow

export function PriceOverrideEditorRow(
  props: Omit<PriceRuleEditorRowProps, 'allowPetModes' | 'inheritedFinalPrice'> & {
    groupOverride?: PriceRuleRow | null
  }
) {
  const groupResolved = props.groupOverride
    ? resolveCatalogPrice(props.catalogPrice, {
        groupRule: props.groupOverride,
      })
    : null

  return (
    <PriceRuleEditorRow
      catalogPrice={props.catalogPrice}
      categoryName={props.categoryName}
      form={{
        ...props.form,
        rule_mode: props.form.rule_mode || 'custom',
      }}
      onChange={props.onChange}
      inheritedFinalPrice={groupResolved?.final_price ?? null}
    />
  )
}

interface GroupPriceOverrideEditorRowProps {
  catalogPrice: CatalogPriceLike
  categoryName?: string
  form: PriceRuleFormState
  onChange: (next: PriceRuleFormState) => void
}

export function GroupPriceOverrideEditorRow({
  catalogPrice,
  categoryName,
  form,
  onChange,
}: GroupPriceOverrideEditorRowProps) {
  const isRemoved = form.rule_mode === 'not_applicable'

  if (isFixedPercentageCatalogPrice(catalogPrice)) {
    return (
      <div
        className={`flex flex-col gap-2 p-3 border rounded-lg transition-colors ${
          isRemoved ? 'border-amber-200 bg-amber-50/40' : 'border-sage-100 bg-sage-50/40'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sage-900 text-sm">{catalogPrice.name}</p>
              {isRemoved && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  Für Gruppe entfernt
                </span>
              )}
            </div>
            <p className="text-xs text-sage-500 mt-0.5">
              {formatFixedPercentageLabel(FIXED_PERCENTAGE_SURCHARGE_RATE)} (fest im Katalog)
            </p>
          </div>
          {isRemoved ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(emptyPriceRuleForm())}
              className="text-xs h-8 text-sage-700 border-sage-300 hover:bg-sage-100 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Wieder aktivieren
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({
                  ...emptyPriceRuleForm(),
                  rule_mode: 'not_applicable',
                })
              }
              className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5"
              title="Diesen Preis für diese Gruppe entfernen"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Aus Gruppe entfernen
            </Button>
          )}
        </div>
        {isRemoved && (
          <p className="text-xs text-amber-800 bg-amber-100/70 border border-amber-200/80 rounded-md px-2.5 py-1.5">
            Für diese Gruppe entfernt. Im Standard-Katalog bleibt der Zuschlag unverändert vorhanden.
          </p>
        )}
      </div>
    )
  }

  const customRule = formToRuleRow(catalogPrice.id, form)
  const resolved = resolveCatalogPrice(catalogPrice, {
    groupRule: customRule,
  })

  const hasCustomOverride =
    !isRemoved &&
    (form.price !== '' || (form.discount_type !== '' && form.discount_value !== ''))

  const handleRemove = () => {
    onChange({
      ...emptyPriceRuleForm(),
      rule_mode: 'not_applicable',
    })
  }

  const handleRestore = () => {
    onChange(emptyPriceRuleForm())
  }

  const handleResetToStandard = () => {
    onChange(emptyPriceRuleForm())
  }

  return (
    <div
      className={`flex flex-col gap-3 p-3.5 border rounded-lg transition-colors ${
        isRemoved
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-sage-200 bg-white hover:border-sage-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sage-900 text-sm">{catalogPrice.name}</p>
            {isRemoved ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                Für Gruppe entfernt
              </span>
            ) : hasCustomOverride ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                Individueller Gruppenpreis
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sage-100 text-sage-700">
                Standardpreis
              </span>
            )}
          </div>
          <p className="text-xs text-sage-500 mt-0.5">
            {categoryName ? `Kategorie: ${categoryName} · ` : ''}
            Standard: {catalogPrice.price != null ? `${formatEuro(catalogPrice.price)}` : '—'}{' '}
            {catalogPrice.unit ? ` ${catalogPrice.unit}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRemoved ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestore}
              className="text-xs h-8 text-sage-700 border-sage-300 hover:bg-sage-50 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Preis wieder aktivieren
            </Button>
          ) : (
            <>
              {hasCustomOverride && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToStandard}
                  className="text-xs h-8 text-sage-600 hover:text-sage-900 hover:bg-sage-100 flex items-center gap-1"
                  title="Auf Standardpreis zurücksetzen"
                >
                  <RotateCcw className="h-3 w-3" />
                  Standard
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1.5"
                title="Diesen Preis für diese Gruppe entfernen (im Standard bleibt er vorhanden)"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Aus Gruppe entfernen
              </Button>
            </>
          )}
        </div>
      </div>

      {isRemoved ? (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2">
          <strong>Hinweis:</strong> Dieser Preis ist für die ausgewählte Kundengruppe entfernt und wird Kunden dieser Gruppe nicht angeboten oder berechnet. Im <strong>Standard-Katalog</strong> bleibt er unverändert vorhanden.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-sage-700">Sonderpreis (€)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Standard"
                value={form.price}
                onChange={(e) =>
                  onChange({
                    ...form,
                    price: e.target.value,
                    rule_mode: 'custom',
                  })
                }
                className="h-9 bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-sage-700">Rabatt-Typ</label>
              <Select
                value={form.discount_type || 'none'}
                onValueChange={(v) =>
                  onChange({
                    ...form,
                    discount_type: v === 'none' ? '' : (v as 'fixed' | 'percentage'),
                    rule_mode: 'custom',
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
              <label className="text-xs font-medium text-sage-700">Rabatt</label>
              <Input
                type="number"
                step="0.01"
                placeholder="—"
                disabled={!form.discount_type}
                value={form.discount_value}
                onChange={(e) =>
                  onChange({
                    ...form,
                    discount_value: e.target.value,
                    rule_mode: 'custom',
                  })
                }
                className="h-9 bg-white"
              />
            </div>
          </div>

          <div className="text-xs text-sage-600 pt-2 border-t border-sage-100 flex items-center justify-between">
            <div>
              {resolved.base_price != null && hasCustomOverride ? (
                <span>
                  Vorschau: Basis {formatEuro(resolved.base_price)}
                  {resolved.discount_type &&
                    resolved.discount_value != null &&
                    resolved.discount_amount != null && (
                      <>
                        {' '}
                        · Rabatt{' '}
                        {formatDiscountLabel(resolved.discount_type, resolved.discount_value)} (
                        {formatEuro(resolved.discount_amount)})
                      </>
                    )}
                  {resolved.final_price != null && (
                    <> · <strong>Endpreis {formatEuro(resolved.final_price)}</strong></>
                  )}
                </span>
              ) : (
                <span className="text-sage-500">
                  Gilt zum Standardpreis ({catalogPrice.price != null ? formatEuro(catalogPrice.price) : '—'}
                  {catalogPrice.unit ? ` ${catalogPrice.unit}` : ''})
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function PetPriceRuleEditorRow(props: Omit<PriceRuleEditorRowProps, 'allowPetModes'>) {
  return <PriceRuleEditorRow {...props} allowPetModes />
}

