"use client"

import React, { useState, useEffect, useCallback } from "react"
import { readApiResponse } from "@/lib/read-api-response"
import { Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const NEWSBAR_DIALOG_SEEN_KEY = "newsbar_vacation_dialog_seen"

interface NewsBarSettings {
  title: string
  subtitle: string
  dialog_title: string
  dialog_description: string
  hint_text: string
  is_active: boolean
  auto_open_enabled?: boolean
  auto_open_delay_seconds?: number
}

interface VacationDate {
  id?: string
  period: string
  label: string
}

function markNewsBarDialogSeen() {
  try {
    sessionStorage.setItem(NEWSBAR_DIALOG_SEEN_KEY, "1")
  } catch {
    // sessionStorage unavailable
  }
}

function hasSeenNewsBarDialog(): boolean {
  try {
    return sessionStorage.getItem(NEWSBAR_DIALOG_SEEN_KEY) === "1"
  } catch {
    return false
  }
}

function isAnotherDialogOpen(): boolean {
  if (typeof document === "undefined") return false
  return document.querySelector('[role="dialog"][data-state="open"]') !== null
}

function hasDialogContent(vacationDates: VacationDate[], hintText: string): boolean {
  return vacationDates.length > 0 || Boolean(hintText?.trim())
}

export function NewsBar() {
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<NewsBarSettings | null>(null)
  const [vacationDates, setVacationDates] = useState<VacationDate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadNewsBar()
  }, [])

  async function loadNewsBar() {
    try {
      const response = await fetch("/api/newsbar")
      const { data } = await readApiResponse<{
        settings?: NewsBarSettings | null
        vacationDates?: VacationDate[]
      }>(response)

      if (data?.settings) {
        setSettings(data.settings)
      }
      if (data?.vacationDates) {
        setVacationDates(data.vacationDates)
      }
    } catch (error) {
      console.error("Error loading newsbar:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open)
    markNewsBarDialogSeen()
  }, [])

  useEffect(() => {
    if (!mounted || loading || !settings) return
    if (!settings.auto_open_enabled) return
    if (hasSeenNewsBarDialog()) return
    if (!hasDialogContent(vacationDates, settings.hint_text)) return

    const delaySeconds = settings.auto_open_delay_seconds ?? 10
    const delayMs = Math.max(0, delaySeconds) * 1000

    const timer = window.setTimeout(() => {
      if (hasSeenNewsBarDialog()) return
      if (isAnotherDialogOpen()) return
      setDialogOpen(true)
      markNewsBarDialogSeen()
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [mounted, loading, settings, vacationDates])

  if (!mounted || loading) return null
  if (!settings || !settings.is_active) return null

  const dialogBody = (
    <>
      <DialogHeader className="px-2 sm:px-0">
        <DialogTitle className="text-xl sm:text-2xl font-bold text-sage-800 text-center tracking-wide">
          {settings.dialog_title}
        </DialogTitle>
        <DialogDescription className="text-center text-sage-600 mt-2 text-sm sm:text-base px-2 sm:px-0">
          {settings.dialog_description}
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4 sm:mt-6 px-2 sm:px-0">
        {vacationDates.length > 0 ? (
          <div className="border-t-4 border-sage-600 pt-4 sm:pt-6">
            {vacationDates.map((vacation, index) => (
              <div
                key={vacation.id || index}
                className="text-center py-3 sm:py-3 border-b border-sage-100 last:border-b-0"
              >
                <div className="font-semibold text-base sm:text-lg text-sage-800">
                  {vacation.period}
                </div>
                <div className="text-xs sm:text-sm text-sage-600 mt-1">{vacation.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 sm:py-6 text-sage-600 text-sm sm:text-base">
            <p>Keine Ferienzeiten eingetragen</p>
          </div>
        )}
        {settings.hint_text && (
          <div className="border-t-4 border-sage-600 mt-4 sm:mt-6 pt-3 sm:pt-4">
            <div className="text-center text-xs sm:text-sm text-sage-700 px-2 sm:px-0">
              <p className="font-medium">⚠️ Wichtiger Hinweis</p>
              <p className="mt-2 leading-relaxed">{settings.hint_text}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="bg-sage-600 text-white py-3 px-4 relative">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{settings.title}</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-sm max-w-[14rem] sm:max-w-none truncate sm:whitespace-normal">
              {settings.subtitle}
            </span>
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <button className="text-sm underline hover:no-underline transition-all duration-200">
                  mehr dazu
                </button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-[425px] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                {dialogBody}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  )
}
