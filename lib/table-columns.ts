import type { PropertyDefinition, PropertyFieldType } from './types'

export interface TableColumn {
  id: string
  label: string
  fieldType: PropertyFieldType | 'id' | 'status' | 'timestamp' | 'email_status'
  fieldName: string
  sortable: boolean
  filterable: boolean
  width?: number
  isProperty?: boolean
  propertyDefinitionId?: string
  options?: string[]
  optionsMap?: Record<string, string>
  readOnly?: boolean
}

function buildPropertyColumns(
  propertyDefinitions: PropertyDefinition[],
  appliesTo: 'lead' | 'customer'
): TableColumn[] {
  return propertyDefinitions
    .filter((def) => def.applies_to.includes(appliesTo))
    .map((def) => ({
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
}

const LEAD_STANDARD_COLUMNS: TableColumn[] = [
  {
    id: 'id',
    label: '#',
    fieldType: 'id',
    fieldName: 'id',
    sortable: false,
    filterable: false,
    width: 92,
    readOnly: true,
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
    id: 'nachname',
    label: 'Nachname',
    fieldType: 'text',
    fieldName: 'nachname',
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
    id: 'pet',
    label: 'Tier',
    fieldType: 'text',
    fieldName: 'pet',
    sortable: true,
    filterable: true,
    width: 140,
  },
  {
    id: 'message',
    label: 'Nachricht',
    fieldType: 'textarea',
    fieldName: 'message',
    sortable: false,
    filterable: false,
    width: 220,
  },
  {
    id: 'availability',
    label: 'Verfügbarkeit',
    fieldType: 'textarea',
    fieldName: 'availability',
    sortable: false,
    filterable: false,
    width: 180,
  },
  {
    id: 'datenschutz',
    label: 'Datenschutz akzeptiert',
    fieldType: 'checkbox',
    fieldName: 'datenschutz',
    sortable: true,
    filterable: true,
    width: 160,
    readOnly: true,
  },
  {
    id: 'anzahl_tiere',
    label: 'Anzahl Tiere',
    fieldType: 'text',
    fieldName: 'anzahl_tiere',
    sortable: true,
    filterable: true,
    width: 130,
  },
  {
    id: 'tiernamen',
    label: 'Tiernamen',
    fieldType: 'text',
    fieldName: 'tiernamen',
    sortable: false,
    filterable: true,
    width: 160,
  },
  {
    id: 'schulferien_bw',
    label: 'Schulferien BW',
    fieldType: 'checkbox',
    fieldName: 'schulferien_bw',
    sortable: true,
    filterable: true,
    width: 140,
  },
  {
    id: 'konkreter_urlaub',
    label: 'Konkreter Urlaub',
    fieldType: 'text',
    fieldName: 'konkreter_urlaub',
    sortable: false,
    filterable: true,
    width: 160,
  },
  {
    id: 'urlaub_von',
    label: 'Urlaub von',
    fieldType: 'date',
    fieldName: 'urlaub_von',
    sortable: true,
    filterable: true,
    width: 140,
  },
  {
    id: 'urlaub_bis',
    label: 'Urlaub bis',
    fieldType: 'date',
    fieldName: 'urlaub_bis',
    sortable: true,
    filterable: true,
    width: 140,
  },
  {
    id: 'intakt_kastriert',
    label: 'Intakt / Kastriert',
    fieldType: 'text',
    fieldName: 'intakt_kastriert',
    sortable: true,
    filterable: true,
    width: 150,
  },
  {
    id: 'alter_tier',
    label: 'Alter Tier',
    fieldType: 'text',
    fieldName: 'alter_tier',
    sortable: true,
    filterable: true,
    width: 120,
  },
  {
    id: 'timestamp',
    label: 'Anfrage-Zeitpunkt',
    fieldType: 'timestamp',
    fieldName: 'timestamp',
    sortable: true,
    filterable: true,
    width: 180,
    readOnly: true,
  },
  {
    id: 'created_at',
    label: 'Erstellt am',
    fieldType: 'timestamp',
    fieldName: 'created_at',
    sortable: true,
    filterable: true,
    width: 180,
    readOnly: true,
  },
  {
    id: 'updated_at',
    label: 'Zuletzt geändert',
    fieldType: 'timestamp',
    fieldName: 'updated_at',
    sortable: true,
    filterable: true,
    width: 180,
    readOnly: true,
  },
  {
    id: 'email_internal_status',
    label: 'Interne E-Mail Status',
    fieldType: 'email_status',
    fieldName: 'email_internal_status',
    sortable: true,
    filterable: true,
    width: 170,
    readOnly: true,
  },
  {
    id: 'email_internal_error',
    label: 'Interne E-Mail Fehler',
    fieldType: 'textarea',
    fieldName: 'email_internal_error',
    sortable: false,
    filterable: false,
    width: 200,
    readOnly: true,
  },
  {
    id: 'email_confirmation_status',
    label: 'Bestätigungs-E-Mail Status',
    fieldType: 'email_status',
    fieldName: 'email_confirmation_status',
    sortable: true,
    filterable: true,
    width: 190,
    readOnly: true,
  },
  {
    id: 'email_confirmation_error',
    label: 'Bestätigungs-E-Mail Fehler',
    fieldType: 'textarea',
    fieldName: 'email_confirmation_error',
    sortable: false,
    filterable: false,
    width: 200,
    readOnly: true,
  },
]

export function getLeadColumnCatalog(
  propertyDefinitions: PropertyDefinition[] = []
): TableColumn[] {
  return [...LEAD_STANDARD_COLUMNS, ...buildPropertyColumns(propertyDefinitions, 'lead')]
}

/** @deprecated Nutze getLeadColumnCatalog + applyTableViewConfig für konfigurierbare Views */
export function getLeadColumns(propertyDefinitions: PropertyDefinition[] = []): TableColumn[] {
  return getLeadColumnCatalog(propertyDefinitions)
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
      id: 'vorname',
      label: 'Vorname',
      fieldType: 'text',
      fieldName: 'vorname',
      sortable: true,
      filterable: true,
      width: 150,
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

  return [...standardColumns, ...buildPropertyColumns(propertyDefinitions, 'customer')]
}
