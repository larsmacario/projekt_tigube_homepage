'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Contact } from '@/lib/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    new: 0,
    contacted: 0,
    converted: 0,
    total: 0,
  })
  const [recentLeads, setRecentLeads] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Lade alle Leads für Statistiken
        const allResponse = await authenticatedFetch('/api/admin/leads', {
          credentials: 'include',
        })
        let allData: { leads?: Contact[]; error?: string } = {}
        try {
          allData = await allResponse.json()
        } catch {
          console.error('Dashboard: Antwort ist kein gültiges JSON (/api/admin/leads)')
        }

        const custResp = await authenticatedFetch('/api/admin/customers', { credentials: 'include' })
        let custData: { customers?: unknown[]; error?: string } = {}
        try {
          custData = await custResp.json()
        } catch {
          console.error('Dashboard: Antwort ist kein gültiges JSON (/api/admin/customers)')
        }

        if (!allResponse.ok && allData.error) {
          console.error('Leads API:', allResponse.status, allData.error)
        }
        if (!custResp.ok && custData.error) {
          console.error('Kunden API:', custResp.status, custData.error)
        }

        if (allData.leads) {
          const allLeads = allData.leads as Contact[]
          
          // Berechne Statistiken
          const newCount = allLeads.filter(l => l.status === 'new').length
          const contactedCount = allLeads.filter(l => l.status === 'contacted').length

          setStats({
            new: newCount,
            contacted: contactedCount,
            converted: (custData.customers || []).length,
            total: allLeads.length,
          })
        }

        const newResponse = await authenticatedFetch('/api/admin/leads?status=new', {
          credentials: 'include',
        })
        let newData: { leads?: Contact[]; error?: string } = {}
        try {
          newData = await newResponse.json()
        } catch {
          console.error('Dashboard: Antwort ist kein gültiges JSON (/api/admin/leads?status=new)')
        }
        if (!newResponse.ok && newData.error) {
          console.error('Leads API (neu):', newResponse.status, newData.error)
        }

        if (newData.leads) {
          const newLeads = newData.leads as Contact[]
          // Zeige alle neuen Leads (oder die neuesten 10)
          setRecentLeads(newLeads.slice(0, 10))
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
      </div>
    )
  }

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

      {/* Neue Anfragen */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Neue Anfragen</CardTitle>
              <CardDescription>Alle Anfragen mit Status "Neu"</CardDescription>
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
                  className="flex justify-between items-start p-4 border border-sage-200 rounded-lg hover:bg-sage-50"
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
    </div>
  )
}


