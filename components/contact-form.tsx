"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CalendarIcon, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VacationDate {
  id?: string
  period: string
  label: string
}

interface NewsBarSettings {
  title: string
  subtitle: string
  dialog_title: string
  dialog_description: string
  hint_text: string
  is_active: boolean
}

function parseVacationPeriod(periodStr: string): { start: Date; end: Date } | null {
  try {
    const cleanStr = periodStr.trim()
    const parts = cleanStr.split(/\s*(?:bis|-)\s*/i)
    if (parts.length !== 2) return null

    const startPart = parts[0].trim()
    const endPart = parts[1].trim()

    const dateRegex = /(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/
    const startMatch = startPart.match(dateRegex)
    const endMatch = endPart.match(dateRegex)

    if (!startMatch || !endMatch) return null

    const endDay = parseInt(endMatch[1], 10)
    const endMonth = parseInt(endMatch[2], 10) - 1
    let endYear = endMatch[3] ? parseInt(endMatch[3], 10) : new Date().getFullYear()
    if (endMatch[3] && endMatch[3].length === 2) endYear += 2000

    const startDay = parseInt(startMatch[1], 10)
    const startMonth = parseInt(startMatch[2], 10) - 1
    let startYear = startMatch[3] ? parseInt(startMatch[3], 10) : endYear
    if (startMatch[3] && startMatch[3].length === 2) startYear += 2000

    const startDate = new Date(startYear, startMonth, startDay, 0, 0, 0)
    const endDate = new Date(endYear, endMonth, endDay, 23, 59, 59)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null
    return { start: startDate, end: endDate }
  } catch (e) {
    return null
  }
}

const parseLocalDate = (dateString: string): Date | null => {
  if (!dateString) return null
  const parts = dateString.split("-")
  if (parts.length !== 3) {
    const d = new Date(dateString)
    return isNaN(d.getTime()) ? null : d
  }
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  return isNaN(date.getTime()) ? null : date
}

export type ContactFormProps = {
  /** Vorauswahl z. B. auf /hundepension oder /katzenbetreuung */
  defaultService?: string
  /** Eindeutige Präfixe für IDs (Modal vs. Seite) */
  idPrefix?: string
  /** Ohne äußere Card — z. B. wenn der Dialog schon einen Rahmen hat */
  bare?: boolean
  /** Im Modal: dichtere Abstände, gleiche Felder wie auf der Seite */
  variant?: "page" | "modal"
}

const emptyForm = {
  name: "",
  vorname: "",
  email: "",
  phone: "",
  pet: "",
  service: "",
  message: "",
  availability: "",
  privacy: false,
  anzahlTiere: "",
  tiernamen: "",
  schulferienBW: false,
  konkreterUrlaub: "",
  urlaubVon: "",
  urlaubBis: "",
  intaktKastriert: "",
  alter: "",
}

export function ContactForm({
  defaultService = "",
  idPrefix = "",
  bare = false,
  variant = "page",
}: ContactFormProps) {
  const m = variant === "modal"
  const [formData, setFormData] = useState(() => ({
    ...emptyForm,
    service: defaultService,
  }))

  const [vacationDates, setVacationDates] = useState<VacationDate[]>([])

  useEffect(() => {
    async function loadVacationData() {
      try {
        const response = await fetch('/api/newsbar')
        const data = await response.json()
        if (data.settings && data.vacationDates) {
          setVacationDates(data.vacationDates)
        }
      } catch (error) {
        console.error('Error loading vacation dates for contact form:', error)
      }
    }
    loadVacationData()
  }, [])

  const [availabilityDays, setAvailabilityDays] = useState<string[]>([])
  const [availabilityTimes, setAvailabilityTimes] = useState<string[]>([])
  const [customAvailability, setCustomAvailability] = useState("")
  const [showCustomAvailability, setShowCustomAvailability] = useState(false)

  useEffect(() => {
    if (showCustomAvailability) {
      setFormData(prev => ({ ...prev, availability: customAvailability }))
    } else {
      const parts = []
      if (availabilityDays.length > 0) {
        parts.push(availabilityDays.join(" & "))
      }
      if (availabilityTimes.length > 0) {
        parts.push(availabilityTimes.join(", "))
      }
      const formatted = parts.join(" - ")
      setFormData(prev => ({ ...prev, availability: formatted }))
    }
  }, [availabilityDays, availabilityTimes, showCustomAvailability, customAvailability])

  // Prüfen, ob das heutige Datum in einem Ferienzeitraum liegt
  const today = new Date()
  let currentVacationPeriod: VacationDate | null = null
  for (const date of vacationDates) {
    const parsed = parseVacationPeriod(date.period)
    if (parsed && today >= parsed.start && today <= parsed.end) {
      currentVacationPeriod = date
      break
    }
  }

  // Prüfen, ob der vom Nutzer gewählte Zeitraum mit den Ferien kollidiert
  let overlappingVacationPeriod: VacationDate | null = null
  if (
    formData.service === "hundepension" &&
    formData.konkreterUrlaub === "ja" &&
    formData.urlaubVon &&
    formData.urlaubBis
  ) {
    const vonDate = parseLocalDate(formData.urlaubVon)
    const bisDate = parseLocalDate(formData.urlaubBis)

    if (vonDate && bisDate) {
      for (const date of vacationDates) {
        const parsed = parseVacationPeriod(date.period)
        if (parsed) {
          if (vonDate <= parsed.end && bisDate >= parsed.start) {
            overlappingVacationPeriod = date
            break
          }
        }
      }
    }
  }

  const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? undefined : date
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({
    type: null,
    message: "",
  })

  const vonInputId = `${idPrefix}urlaubVon-input`
  const bisInputId = `${idPrefix}urlaubBis-input`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    if (!formData.availability.trim()) {
      setSubmitStatus({
        type: "error",
        message: "Bitte wählen Sie mindestens ein Zeitfenster für die Erreichbarkeit aus oder geben Sie eigene Zeiten an.",
      })
      setIsSubmitting(false)
      return
    }

    if (formData.service === "hundepension" && formData.konkreterUrlaub === "ja") {
      if (!formData.urlaubVon || !formData.urlaubBis) {
        setSubmitStatus({
          type: "error",
          message: "Bitte wählen Sie einen Urlaubszeitraum aus.",
        })
        setIsSubmitting(false)
        return
      }

      const vonDate = parseDateFromInput(formData.urlaubVon)
      const bisDate = parseDateFromInput(formData.urlaubBis)

      if (!vonDate || !bisDate) {
        setSubmitStatus({
          type: "error",
          message: "Bitte wählen Sie gültige Daten aus.",
        })
        setIsSubmitting(false)
        return
      }

      if (bisDate < vonDate) {
        setSubmitStatus({
          type: "error",
          message: "Das Enddatum muss nach dem Startdatum liegen.",
        })
        setIsSubmitting(false)
        return
      }
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          urlaubVon: formData.urlaubVon
            ? parseDateFromInput(formData.urlaubVon)?.toISOString()
            : undefined,
          urlaubBis: formData.urlaubBis
            ? parseDateFromInput(formData.urlaubBis)?.toISOString()
            : undefined,
          timestamp: new Date().toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Anfrage")
      }

      setSubmitStatus({
        type: "success",
        message:
          "Ihre Anfrage wurde erfolgreich gesendet! Wir melden uns schnellstmöglich bei Ihnen.",
      })

      setFormData({
        ...emptyForm,
        service: defaultService,
      })
    } catch (error) {
      console.error("Fehler beim Senden:", error)
      setSubmitStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const labelCls = m
    ? "block text-xs font-medium text-sage-900 mb-1"
    : "block text-sm font-medium text-sage-900 mb-2"
  const inputCls = cn(
    "border-sage-300 focus:border-sage-500",
    m && "h-9 text-sm"
  )
  const grid2 = cn("grid md:grid-cols-2", m ? "gap-3" : "gap-4")
  const selectCls = cn(
    "w-full rounded-md border border-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500",
    m ? "h-9 px-2.5 py-1 text-sm" : "px-3 py-2"
  )

  const formInner = (
    <form
      onSubmit={handleSubmit}
      className={cn(m ? "space-y-4" : "space-y-6")}
    >
      {/* Betriebsferien-Hinweis */}
      {(currentVacationPeriod || overlappingVacationPeriod) && (
        <div className={cn(
          "rounded-lg border p-4 flex gap-3 text-sm leading-relaxed text-left",
          overlappingVacationPeriod 
            ? "bg-red-50 border-red-200 text-red-800" 
            : "bg-amber-50 border-amber-200 text-amber-800",
          m && "p-3 text-xs"
        )}>
          <AlertTriangle className={cn("h-5 w-5 shrink-0 mt-0.5", overlappingVacationPeriod ? "text-red-600" : "text-amber-600")} />
          <div>
            {overlappingVacationPeriod ? (
              <>
                <p className="font-semibold mb-1">Kollision mit Betriebsferien</p>
                <p>
                  Ihr gewünschter Betreuungszeitraum ({parseLocalDate(formData.urlaubVon)?.toLocaleDateString('de-DE')} bis {parseLocalDate(formData.urlaubBis)?.toLocaleDateString('de-DE')}) überschneidet sich mit unseren Betriebsferien <strong>({overlappingVacationPeriod.period})</strong>. In diesem Zeitraum findet leider keine Tierbetreuung statt.
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">Aktuell Betriebsferien</p>
                <p>
                  Bitte beachten Sie, dass wir uns derzeit (vom <strong>{currentVacationPeriod!.period}</strong>) in den Betriebsferien befinden. Sie können Ihre Anfrage gerne absenden, wir werden diese jedoch erst nach unserer Rückkehr beantworten.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className={grid2}>
        <div>
          <label className={labelCls}>Vorname *</label>
          <Input
            required
            value={formData.vorname}
            onChange={(e) =>
              setFormData({ ...formData, vorname: e.target.value })
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Name *</label>
          <Input
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className={inputCls}
          />
        </div>
      </div>

      <div className={grid2}>
        <div>
          <label className={labelCls}>E-Mail Adresse *</label>
          <Input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Telefonnummer *</label>
          <Input
            required
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Gewünschte Leistung</label>
        <select
          required={m}
          value={formData.service}
          onChange={(e) =>
            setFormData({ ...formData, service: e.target.value })
          }
          className={selectCls}
        >
          <option value="">Bitte wählen</option>
          <option value="tagesbetreuung">Tagesbetreuung</option>
          <option value="hundepension">Urlaubsbetreuung</option>
          <option value="katzenbetreuung">Mobile Katzenbetreuung</option>
        </select>
      </div>

      {formData.service === "hundepension" && (
        <div
          className={cn(
            "bg-sage-100 rounded-lg border border-sage-300",
            m ? "space-y-3 p-3.5 sm:p-4" : "space-y-6 p-6"
          )}
        >
          <h3
            className={cn(
              "font-raleway font-bold text-sage-900",
              m ? "text-sm sm:text-base mb-1" : "text-lg mb-4"
            )}
          >
            Zusätzliche Informationen für die Urlaubsbetreuung
          </h3>

          <div className={grid2}>
            <div>
              <label className={labelCls}>Anzahl der Tiere *</label>
              <Input
                type="number"
                min={1}
                required
                value={formData.anzahlTiere}
                onChange={(e) =>
                  setFormData({ ...formData, anzahlTiere: e.target.value })
                }
                className={inputCls}
                placeholder="z.B. 1, 2, 3"
              />
            </div>
            <div>
              <label className={labelCls}>Tiername/n *</label>
              <Input
                required
                value={formData.tiernamen}
                onChange={(e) =>
                  setFormData({ ...formData, tiernamen: e.target.value })
                }
                className={inputCls}
                placeholder="z.B. Luna, Max, Bella"
              />
            </div>
          </div>

          <div className={grid2}>
            <div>
              <label className={labelCls}>Alter *</label>
              <Input
                type="number"
                min={0}
                required
                value={formData.alter}
                onChange={(e) =>
                  setFormData({ ...formData, alter: e.target.value })
                }
                className={inputCls}
                placeholder="Alter in Jahren"
              />
            </div>
            <div>
              <label className={labelCls}>Intakt/Kastriert *</label>
              <Select
                value={formData.intaktKastriert}
                onValueChange={(value) =>
                  setFormData({ ...formData, intaktKastriert: value })
                }
                required
              >
                <SelectTrigger
                  className={cn(
                    "border-sage-300 focus:border-sage-500",
                    m && "h-9 text-sm"
                  )}
                >
                  <SelectValue placeholder="Bitte wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intakt">Intakt</SelectItem>
                  <SelectItem value="kastriert">Kastriert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label
              className={cn(
                "block font-medium text-sage-900",
                m ? "text-xs mb-1.5" : "text-sm mb-3"
              )}
            >
              Wann sind Betreuungen/Urlaube geplant?
            </label>
            <div className="flex items-start gap-2">
              <Checkbox
                id={`${idPrefix}schulferienBW`}
                checked={formData.schulferienBW}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    schulferienBW: checked === true,
                  })
                }
                className={cn("border-sage-300 mt-0.5", m && "h-4 w-4")}
              />
              <Label
                htmlFor={`${idPrefix}schulferienBW`}
                className={cn(
                  "text-gray-700 cursor-pointer leading-snug",
                  m ? "text-xs" : "text-sm"
                )}
              >
                Klassische Schulferien Baden-Württemberg
              </Label>
            </div>
          </div>

          <div>
            <label
              className={cn(
                "block font-medium text-sage-900",
                m ? "text-xs mb-1.5" : "text-sm mb-3"
              )}
            >
              Ist schon ein konkreter Urlaub geplant? *
            </label>
            <RadioGroup
              value={formData.konkreterUrlaub}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  konkreterUrlaub: value,
                  urlaubVon: value === "nein" ? "" : formData.urlaubVon,
                  urlaubBis: value === "nein" ? "" : formData.urlaubBis,
                })
              }}
              className={cn("flex", m ? "gap-5 flex-wrap" : "gap-6")}
              required
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="ja"
                  id={`${idPrefix}urlaub-ja`}
                  className="border-sage-300"
                />
                <Label
                  htmlFor={`${idPrefix}urlaub-ja`}
                  className={cn(
                    "text-gray-700 cursor-pointer",
                    m ? "text-xs" : "text-sm"
                  )}
                >
                  Ja
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="nein"
                  id={`${idPrefix}urlaub-nein`}
                  className="border-sage-300"
                />
                <Label
                  htmlFor={`${idPrefix}urlaub-nein`}
                  className={cn(
                    "text-gray-700 cursor-pointer",
                    m ? "text-xs" : "text-sm"
                  )}
                >
                  Nein
                </Label>
              </div>
            </RadioGroup>

            {formData.konkreterUrlaub === "ja" && (
              <div className={cn(m ? "mt-2" : "mt-4")}>
                <label className={labelCls}>
                  Urlaubszeitraum *{" "}
                  <span className="text-gray-500 font-normal">(Von - Bis)</span>
                </label>
                <div className={grid2}>
                  <div>
                    <label className={labelCls}>Von *</label>
                    <div className="relative">
                      <Input
                        type="date"
                        required
                        value={formData.urlaubVon}
                        onChange={(e) => {
                          setFormData({ ...formData, urlaubVon: e.target.value })
                        }}
                        min={new Date().toISOString().split("T")[0]}
                        className={cn(
                          inputCls,
                          "pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        )}
                        id={vonInputId}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(
                            vonInputId
                          ) as HTMLInputElement
                          if (input) {
                            if (typeof input.showPicker === "function") {
                              input.showPicker()
                            } else {
                              input.click()
                            }
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-600 hover:text-sage-700 cursor-pointer"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Bis *</label>
                    <div className="relative">
                      <Input
                        type="date"
                        required
                        value={formData.urlaubBis}
                        onChange={(e) => {
                          setFormData({ ...formData, urlaubBis: e.target.value })
                        }}
                        min={
                          formData.urlaubVon ||
                          new Date().toISOString().split("T")[0]
                        }
                        className={cn(
                          inputCls,
                          "pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        )}
                        id={bisInputId}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(
                            bisInputId
                          ) as HTMLInputElement
                          if (input) {
                            if (typeof input.showPicker === "function") {
                              input.showPicker()
                            } else {
                              input.click()
                            }
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-600 hover:text-sage-700 cursor-pointer"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {formData.service !== "hundepension" && (
        <div className="space-y-2">
          <label className={labelCls}>Ihr Tier *</label>
          <RadioGroup
            value={formData.pet}
            onValueChange={(value) =>
              setFormData({ ...formData, pet: value })
            }
            className={cn("flex", m ? "gap-5 flex-wrap" : "gap-6")}
            required
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="Hund"
                id={`${idPrefix}pet-hund`}
                className="border-sage-300"
              />
              <Label
                htmlFor={`${idPrefix}pet-hund`}
                className={cn(
                  "text-gray-700 cursor-pointer",
                  m ? "text-xs" : "text-sm"
                )}
              >
                Hund
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="Katze"
                id={`${idPrefix}pet-katze`}
                className="border-sage-300"
              />
              <Label
                htmlFor={`${idPrefix}pet-katze`}
                className={cn(
                  "text-gray-700 cursor-pointer",
                  m ? "text-xs" : "text-sm"
                )}
              >
                Katze
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="Sonstiges"
                id={`${idPrefix}pet-sonstiges`}
                className="border-sage-300"
              />
              <Label
                htmlFor={`${idPrefix}pet-sonstiges`}
                className={cn(
                  "text-gray-700 cursor-pointer",
                  m ? "text-xs" : "text-sm"
                )}
              >
                Sonstiges
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div>
        <label className={labelCls}>Ihre Nachricht *</label>
        <Textarea
          rows={m ? 3 : 4}
          placeholder="Erzählen Sie uns mehr über Ihr Tier und Ihre Wünsche..."
          required
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          className={cn(
            "border-sage-300 focus:border-sage-500 min-h-0",
            m && "min-h-[72px] max-h-40 text-sm"
          )}
        />
      </div>

      <div>
        <label className={labelCls}>Beste Erreichbarkeit *</label>
        <div className="space-y-3">
          {/* Tage Auswahl */}
          <div className="space-y-1.5">
            <span className="text-xs text-sage-600 block text-left">Tage:</span>
            <div className="flex flex-wrap gap-2">
              {["Werktags (Mo-Fr)", "Wochenende"].map((day) => {
                const isSelected = availabilityDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setAvailabilityDays(availabilityDays.filter(d => d !== day))
                      } else {
                        setAvailabilityDays([...availabilityDays, day])
                      }
                      setShowCustomAvailability(false)
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "bg-sage-600 border-sage-600 text-white shadow-sm"
                        : "bg-white border-sage-200 text-sage-800 hover:border-sage-300"
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Zeiten Auswahl */}
          <div className="space-y-1.5">
            <span className="text-xs text-sage-600 block text-left">Uhrzeit:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Vormittags (8-12 Uhr)", val: "Vormittags (8-12 Uhr)" },
                { label: "Nachmittags (12-17 Uhr)", val: "Nachmittags (12-17 Uhr)" },
                { label: "Abends (17-20 Uhr)", val: "Abends (17-20 Uhr)" }
              ].map((time) => {
                const isSelected = availabilityTimes.includes(time.val)
                return (
                  <button
                    key={time.val}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setAvailabilityTimes(availabilityTimes.filter(t => t !== time.val))
                      } else {
                        setAvailabilityTimes([...availabilityTimes, time.val])
                      }
                      setShowCustomAvailability(false)
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "bg-sage-600 border-sage-600 text-white shadow-sm"
                        : "bg-white border-sage-200 text-sage-800 hover:border-sage-300"
                    )}
                  >
                    {time.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Trennlinie oder Alternative */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowCustomAvailability(!showCustomAvailability)
                if (!showCustomAvailability) {
                  setAvailabilityDays([])
                  setAvailabilityTimes([])
                }
              }}
              className={cn(
                "text-xs font-medium underline hover:no-underline transition-all cursor-pointer",
                showCustomAvailability ? "text-red-600" : "text-sage-600"
              )}
            >
              {showCustomAvailability ? "Zurück zur Schnellauswahl" : "Eigene Zeiten eingeben..."}
            </button>
          </div>

          {showCustomAvailability && (
            <div className="pt-1">
              <Input
                required={showCustomAvailability}
                placeholder="z.B. Nur dienstags ab 19 Uhr, sonst flexibel"
                value={customAvailability}
                onChange={(e) => setCustomAvailability(e.target.value)}
                className={inputCls}
              />
            </div>
          )}
        </div>
      </div>

      <div className={cn("flex items-start gap-2", m && "gap-2.5")}>
        <input
          type="checkbox"
          id={`${idPrefix}privacy`}
          required
          checked={formData.privacy}
          onChange={(e) =>
            setFormData({ ...formData, privacy: e.target.checked })
          }
          className={cn("mt-1 shrink-0", m && "h-3.5 w-3.5")}
        />
        <label
          htmlFor={`${idPrefix}privacy`}
          className={cn(
            "text-gray-600 leading-snug",
            m ? "text-xs" : "text-sm"
          )}
        >
          Ich stimme der Verarbeitung meiner Daten gemäß der{" "}
          <a href="/datenschutz" className="text-sage-600 hover:underline">
            Datenschutzerklärung
          </a>{" "}
          zu. *
        </label>
      </div>

      {submitStatus.type && (
        <div
          className={cn(
            "rounded-lg",
            m ? "p-2.5 text-xs sm:text-sm" : "p-4",
            submitStatus.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          {submitStatus.message}
        </div>
      )}

      <Button
        type="submit"
        size={m ? "default" : "lg"}
        className={cn(
          "w-full bg-sage-600 hover:bg-sage-700 text-white disabled:opacity-50 disabled:cursor-not-allowed",
          m && "h-10 text-sm"
        )}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Wird gesendet..." : "Anfrage senden"}
      </Button>
    </form>
  )

  if (bare) {
    return formInner
  }

  return (
    <Card
      className={cn(
        "border-sage-200",
        m && "border-sage-200/90 shadow-none sm:shadow-sm"
      )}
    >
      <CardHeader
        className={cn(m ? "space-y-0 p-4 pb-3 sm:p-5 sm:pb-3" : undefined)}
      >
        <CardTitle
          className={cn(
            "font-raleway font-bold text-sage-900 leading-tight",
            m ? "text-base sm:text-lg" : "text-xl"
          )}
        >
          Unverbindliche Anfrage
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(m && "p-4 pt-0 sm:p-5 sm:pt-0")}>
        {formInner}
      </CardContent>
    </Card>
  )
}
