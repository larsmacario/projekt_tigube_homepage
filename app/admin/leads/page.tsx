'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Contact, PropertyDefinition } from '@/lib/types'
import { DataTable } from '@/components/admin/data-table'
import { getLeadColumns } from '@/lib/table-columns'
import type { TableColumn } from '@/lib/table-columns'
import { authenticatedFetch } from '@/lib/authenticated-fetch'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Record<string, any>[]>([])
  const [propertyDefinitions, setPropertyDefinitions] = useState<PropertyDefinition[]>([])
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [statusFilter])

  async function loadData() {
    setLoading(true)
    try {
      // Lade Property Definitions
      const defResponse = await authenticatedFetch('/api/admin/properties?applies_to=lead')
      const defData = await defResponse.json()
      setPropertyDefinitions(defData.definitions || [])

      // Lade Leads
      const url = statusFilter === 'all' 
        ? '/api/admin/leads'
        : `/api/admin/leads?status=${statusFilter}`
      
      const response = await authenticatedFetch(url)
      const data = await response.json()
      setLeads(data.leads || [])

      // Aktualisiere Spalten
      setColumns(getLeadColumns(defData.definitions || []))
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Fehler',
        description: 'Fehler beim Laden der Daten',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCellUpdate(rowId: string | number, columnId: string, value: any) {
    try {
      const column = columns.find(c => c.id === columnId)
      if (!column) return

      if (column.isProperty && column.propertyDefinitionId) {
        // Property Value aktualisieren
        const response = await authenticatedFetch('/api/admin/properties/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_definition_id: column.propertyDefinitionId,
            entity_type: 'lead',
            entity_id: rowId.toString(),
            value,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Speichern')
        }
      } else {
        // Standard-Feld aktualisieren
        const response = await authenticatedFetch('/api/admin/leads', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rowId,
            [column.fieldName]: value,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Speichern')
        }
      }

      // Aktualisiere lokalen State
      setLeads(prev => prev.map(lead => {
        if (String(lead.id) === String(rowId)) {
          return { ...lead, [columnId]: value }
        }
        return lead
      }))

      toast({
        title: 'Erfolg',
        description: 'Wert gespeichert',
      })
    } catch (error: any) {
      throw error
    }
  }

  function handleAddColumn() {
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Leads</h1>
          <p className="mt-2 text-sage-600">Verwaltung aller Kontaktanfragen</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            Alle
          </Button>
          <Button
            variant={statusFilter === 'new' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('new')}
          >
            Neu
          </Button>
          <Button
            variant={statusFilter === 'contacted' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('contacted')}
          >
            Kontaktiert
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        entityType="lead"
        loading={loading}
        onCellUpdate={handleCellUpdate}
        onAddColumn={handleAddColumn}
      />
    </div>
  )
}
