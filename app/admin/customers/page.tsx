'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { Customer, PropertyDefinition } from '@/lib/types'
import { DataTable } from '@/components/admin/data-table'
import { getCustomerColumns } from '@/lib/table-columns'
import type { TableColumn } from '@/lib/table-columns'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Record<string, any>[]>([])
  const [propertyDefinitions, setPropertyDefinitions] = useState<PropertyDefinition[]>([])
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Lade Kundengruppen
      const groupsResponse = await fetch('/api/admin/customer-groups')
      const groupsData = await groupsResponse.json()
      const groups = groupsData.groups || []
      const groupsMap: Record<string, string> = {}
      groups.forEach((g: any) => {
        groupsMap[g.id] = g.name
      })

      // Lade Property Definitions
      const defResponse = await fetch('/api/admin/properties?applies_to=customer')
      const defData = await defResponse.json()
      setPropertyDefinitions(defData.definitions || [])

      // Lade Kunden
      const response = await fetch('/api/admin/customers')
      const data = await response.json()
      setCustomers(data.customers || [])

      // Aktualisiere Spalten
      setColumns(getCustomerColumns(defData.definitions || [], groupsMap))
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
        const response = await fetch('/api/admin/properties/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_definition_id: column.propertyDefinitionId,
            entity_type: 'customer',
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
        const response = await fetch(`/api/admin/customers/${rowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            [column.fieldName]: value,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Fehler beim Speichern')
        }
      }

      // Aktualisiere lokalen State
      setCustomers(prev => prev.map(customer => {
        if (String(customer.id) === String(rowId)) {
          return { ...customer, [columnId]: value }
        }
        return customer
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

  const filteredCustomers = customers.filter((customer) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      customer.nachname?.toLowerCase().includes(searchLower) ||
      customer.vorname?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.kundennummer?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-sage-900">Kunden</h1>
          <p className="mt-2 text-sage-600">Übersicht aller registrierten Kunden</p>
        </div>
        <Input
          placeholder="Suche nach Name, E-Mail oder Kundennummer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        entityType="customer"
        loading={loading}
        onCellUpdate={handleCellUpdate}
        onAddColumn={handleAddColumn}
      />
    </div>
  )
}
