'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Contact, UpcomingVaccinationRow, UpcomingVaccinationSummary } from '@/lib/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import { readApiResponse } from '@/lib/read-api-response'
import {
  UpcomingVaccinationSummaryCards,
  UpcomingVaccinationsTable,
} from '@/components/admin/upcoming-vaccinations-table'

const EMPTY_VACCINATION_SUMMARY: UpcomingVaccinationSummary = {
  overdue: 0,
  dueSoon: 0,
  upcoming: 0,
  incomplete: 0,
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    new: 0,
    contacted: 0,
    converted: 0,
    total: 0,
  })
  const [recentLeads, setRecentLeads] = useState<Contact[]>([])
  const [vaccinationRows, setVaccinationRows] = useState<UpcomingVaccinationRow[]>([])
  const [vaccinationSummary, setVaccinationSummary] = useState<UpcomingVaccinationSummary>(
    EMPTY_VACCINATION_SUMMARY
  )
  const [springerSummary, setSpringerSummary] = useState({ openOffers: 0, pendingBookings: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const allResponse = await authenticatedFetch('/api/admin/leads')
        const { data: allData, error: allError } = await readApiResponse<{ leads?: Contact[]; error?: string }>(
          allResponse
        )
        if (allError) {
          console.error('Dashboard: Leads konnten nicht geladen werden:', allError)
        }

        const custResp = await authenticatedFetch('/api/admin/customers')
        const { data: custData, error: custError } = await readApiResponse<{ customers?: unknown[]; error?: string }>(
          custResp
        )
        if (custError) {
          console.error('Dashboard: Kunden konnten nicht geladen werden:', custError)
        }

        if (allData?.leads) {
          const allLeads = allData.leads

          setStats({
            new: allLeads.filter((l) => l.status === 'new').length,
            contacted: allLeads.filter((l) => l.status === 'contacted').length,
            converted: (custData?.customers || []).length,
            total: allLeads.length,
          })
        }

        const newResponse = await authenticatedFetch('/api/admin/leads?status=new')
        const { data: newData, error: newError } = await readApiResponse<{ leads?: Contact[]; error?: string }>(
          newResponse
        )
        if (newError) {
          console.error('Dashboard: Neue Leads konnten nicht geladen werden:', newError)
        }

        if (newData?.leads) {
          setRecentLeads(newData.leads.slice(0, 10))
        }

        const vaccinationResponse = await authenticatedFetch(
          '/api/admin/vaccinations/upcoming?days=90&status=all&type=all'
        )
        const { data: vaccinationData } = await readApiResponse<{
          rows?: UpcomingVaccinationRow[]
          summary?: UpcomingVaccinationSummary
        }>(vaccinationResponse)
        if (vaccinationData) {
          setVaccinationRows(vaccinationData.rows || [])
          setVaccinationSummary(vaccinationData.summary || EMPTY_VACCINATION_SUMMARY)
        }

        const springerResponse = await authenticatedFetch('/api/admin/springer/summary')
        const { data: springerData } = await readApiResponse<{
          openOffers?: number
          pendingBookings?: number
        }>(springerResponse)
        if (springerData && !cancelled) {
          setSpringerSummary({
            openOffers: springerData.openOffers || 0,
            pendingBookings: springerData.pendingBookings || 0,
          })
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

  const previewVaccinationRows = vaccinationRows
    .filter((row) => row.status === 'overdue' || row.status === 'due_soon')
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-sage-900">Dashboard</h1>
        <p className="mt-2 text-sage-600">Übersicht über Ihre Leads und Kunden</p>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sage-600">Neue Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sage-900">{stats.new}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sage-600">Kontaktiert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sage-900">{stats.contacted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sage-600">Konvertiert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sage-900">{stats.converted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-sage-600">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sage-900">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Springerliste</CardTitle>
              <CardDescription>
                Offene Angebote und ausstehende Springer-Buchungen
              </CardDescription>
            </div>
            <Link href="/admin/bookings?tab=springer">
              <Button variant="outline" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                Zur Springerliste
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-sage-200 bg-sage-50 px-4 py-3">
              <p className="text-sm text-sage-600">Offene Angebote</p>
              <p className="text-2xl font-bold text-sage-900">{springerSummary.openOffers}</p>
            </div>
            <div className="rounded-lg border border-sage-200 bg-sage-50 px-4 py-3">
              <p className="text-sm text-sage-600">Ausstehende Springer-Buchungen</p>
              <p className="text-2xl font-bold text-sage-900">{springerSummary.pendingBookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Neue Anfragen */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Neue Anfragen</CardTitle>
              <CardDescription>Alle Anfragen mit Status &quot;Neu&quot;</CardDescription>
            </div>
            <Link href="/admin/leads">
              <Button variant="outline" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                Alle anzeigen
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sage-600 text-center py-8">Keine Anfragen vorhanden</p>
          ) : (
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-4 border border-sage-200 rounded-lg hover:bg-sage-50"
                >
                  <div>
                    <h3 className="font-semibold text-sage-900">
                      {lead.vorname} {lead.nachname}
                    </h3>
                    <p className="text-sm text-sage-600">{lead.email}</p>
                    <p className="text-sm text-sage-600">{lead.telefonnummer}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {lead.status === 'new' ? 'Neu' :
                       lead.status === 'contacted' ? 'Kontaktiert' :
                       String(lead.status)}
                    </span>
                  </div>
                  <Link href={`/admin/leads/${lead.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Anstehende Impfungen</CardTitle>
              <CardDescription>
                Überfällige und in Kürze fällige Hunde-Impfungen
              </CardDescription>
            </div>
            <Link href="/admin/impfungen">
              <Button variant="outline" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                Alle anzeigen
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <UpcomingVaccinationSummaryCards summary={vaccinationSummary} />
          {previewVaccinationRows.length === 0 ? (
            <p className="text-sage-600 text-center py-6">
              Keine überfälligen oder in 14 Tagen fälligen Impfungen
            </p>
          ) : (
            <UpcomingVaccinationsTable rows={previewVaccinationRows} compact />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
