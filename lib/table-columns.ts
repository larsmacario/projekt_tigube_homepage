import type { PropertyDefinition, PropertyFieldType } from './types'

export interface TableColumn {
  id: string
  label: string
  fieldType: PropertyFieldType | 'id' | 'status' | 'timestamp'
  fieldName: string // Name des Feldes in der DB
  sortable: boolean
  filterable: boolean
  width?: number
  isProperty?: boolean // true wenn dynamische Eigenschaft
  propertyDefinitionId?: string
  options?: string[] // Für select-Felder
  optionsMap?: Record<string, string> // Für Mappings von IDs auf Labels
}

export function getLeadColumns(propertyDefinitions: PropertyDefinition[] = []): TableColumn[] {
  const standardColumns: TableColumn[] = [
    {
      id: 'id',
      label: '#',
      fieldType: 'id',
      fieldName: 'id',
      sortable: false,
      filterable: false,
      width: 92,
    },
    {
      id: 'nachname',
      label: 'Nachname',
      fieldType: 'text',
      fieldName: 'nachname',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'vorname',
      label: 'Vorname',
      fieldType: 'text',
      fieldName: 'vorname',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'email',
      label: 'E-Mail',
      fieldType: 'text',
      fieldName: 'email',
      sortable: true,
      filterable: true,
      width: 200,
    },
    {
      id: 'telefonnummer',
      label: 'Telefon',
      fieldType: 'text',
      fieldName: 'telefonnummer',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'service',
      label: 'Service',
      fieldType: 'text',
      fieldName: 'service',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'status',
      label: 'Status',
      fieldType: 'status',
      fieldName: 'status',
      sortable: true,
      filterable: true,
      width: 120,
    },
    {
      id: 'created_at',
      label: 'Created time',
      fieldType: 'timestamp',
      fieldName: 'created_at',
      sortable: true,
      filterable: true,
      width: 180,
    },
    {
      id: 'updated_at',
      label: 'Last modified time',
      fieldType: 'timestamp',
      fieldName: 'updated_at',
      sortable: true,
      filterable: true,
      width: 180,
    },
  ]

  // Füge Property-Spalten hinzu
  const propertyColumns: TableColumn[] = propertyDefinitions
    .filter(def => def.applies_to.includes('lead'))
    .map(def => ({
      id: `property_${def.id}`,
      label: def.label,
      fieldType: def.field_type,
      fieldName: `property_${def.id}`,
      sortable: false,
      filterable: true,
      width: 150,
      isProperty: true,
      propertyDefinitionId: def.id,
      options: def.options,
    }))

  return [...standardColumns, ...propertyColumns]
}

export function getCustomerColumns(
  propertyDefinitions: PropertyDefinition[] = [],
  groupOptionsMap: Record<string, string> = {}
): TableColumn[] {
  const standardColumns: TableColumn[] = [
    {
      id: 'id',
      label: '#',
      fieldType: 'id',
      fieldName: 'id',
      sortable: false,
      filterable: false,
      width: 92,
    },
    {
      id: 'customer_group_id',
      label: 'Kundengruppe',
      fieldType: 'select',
      fieldName: 'customer_group_id',
      sortable: true,
      filterable: true,
      width: 180,
      optionsMap: groupOptionsMap,
    },
    {
      id: 'nachname',
      label: 'Nachname',
      fieldType: 'text',
      fieldName: 'nachname',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'vorname',
      label: 'Vorname',
      fieldType: 'text',
      fieldName: 'vorname',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'kundennummer',
      label: 'Kundennummer',
      fieldType: 'text',
      fieldName: 'kundennummer',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'email',
      label: 'E-Mail',
      fieldType: 'text',
      fieldName: 'email',
      sortable: true,
      filterable: true,
      width: 200,
    },
    {
      id: 'telefonnummer',
      label: 'Telefon',
      fieldType: 'text',
      fieldName: 'telefonnummer',
      sortable: true,
      filterable: true,
      width: 150,
    },
    {
      id: 'created_at',
      label: 'Created time',
      fieldType: 'timestamp',
      fieldName: 'created_at',
      sortable: true,
      filterable: true,
      width: 180,
    },
    {
      id: 'updated_at',
      label: 'Last modified time',
      fieldType: 'timestamp',
      fieldName: 'updated_at',
      sortable: true,
      filterable: true,
      width: 180,
    },
  ]

  // Füge Property-Spalten hinzu
  const propertyColumns: TableColumn[] = propertyDefinitions
    .filter(def => def.applies_to.includes('customer'))
    .map(def => ({
      id: `property_${def.id}`,
      label: def.label,
      fieldType: def.field_type,
      fieldName: `property_${def.id}`,
      sortable: false,
      filterable: true,
      width: 150,
      isProperty: true,
      propertyDefinitionId: def.id,
      options: def.options,
    }))

  return [...standardColumns, ...propertyColumns]
}

