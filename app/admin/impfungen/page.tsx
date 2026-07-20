'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  UpcomingVaccinationSummaryCards,
  UpcomingVaccinationsTable,
} from '@/components/admin/upcoming-vaccinations-table'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { UpcomingVaccinationRow, UpcomingVaccinationSummary } from '@/lib/types'

const EMPTY_SUMMARY: UpcomingVaccinationSummary = {
  overdue: 0,
  dueSoon: 0,
  upcoming: 0,
  incomplete: 0,
}

export default function AdminImpfungenPage() {
  const [rows, setRows] = useState<UpcomingVaccinationRow[]>([])
  const [summary, setSummary] = useState<UpcomingVaccinationSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('90')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days,
        status,
        type,
      })
      const response = await authenticatedFetch(
        `/api/admin/vaccinations/upcoming?${params.toString()}`,
        { credentials: 'include' }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden')
      }

      setRows(data.rows || [])
      setSummary(data.summary || EMPTY_SUMMARY)
    } catch (error) {
      console.error('Error loading upcoming vaccinations:', error)
      setRows([])
      setSummary(EMPTY_SUMMARY)
    } finally {
      setLoading(false)
    }
  }, [days, status, type])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Anstehende Impfungen</h1>
        <p className="mt-2 text-sage-600">
          Übersicht über fällige und bald fällige Hunde-Impfungen (Kombi und Zwingerhusten)
        </p>
      </div>

      <UpcomingVaccinationSummaryCards summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>Impfübersicht</CardTitle>
          <CardDescription>
            Überfällige Impfungen, anstehende Termine und unvollständige Impfdaten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-sage-600 mb-2">Zeitraum</p>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Zeitraum wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Nächste 30 Tage</SelectItem>
                  <SelectItem value="60">Nächste 60 Tage</SelectItem>
                  <SelectItem value="90">Nächste 90 Tage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm text-sage-600 mb-2">Status</p>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                  <SelectItem value="due_soon">In 14 Tagen</SelectItem>
                  <SelectItem value="upcoming">Anstehend</SelectItem>
                  <SelectItem value="incomplete">Unvollständig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm text-sage-600 mb-2">Impfart</p>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Impfart wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="kombi">Kombiimpfung</SelectItem>
                  <SelectItem value="zwingerhusten">Zwingerhusten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[240px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-600" />
            </div>
          ) : (
            <UpcomingVaccinationsTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
