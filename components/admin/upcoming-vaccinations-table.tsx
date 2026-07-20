'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatDateDE,
  getUpcomingVaccinationStatusLabel,
  getVaccinationTypeLabel,
} from '@/lib/pet-vaccination'
import type { UpcomingVaccinationRow, UpcomingVaccinationStatus } from '@/lib/types'

function getStatusBadgeClass(status: UpcomingVaccinationStatus): string {
  switch (status) {
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'due_soon':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'upcoming':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'incomplete':
      return 'bg-sage-100 text-sage-700 border-sage-200'
  }
}

function formatDaysUntilDue(daysUntilDue: number | null): string {
  if (daysUntilDue === null) return '—'
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} Tage überfällig`
  if (daysUntilDue === 0) return 'Heute fällig'
  return `in ${daysUntilDue} Tagen`
}

type UpcomingVaccinationsTableProps = {
  rows: UpcomingVaccinationRow[]
  compact?: boolean
}

export function UpcomingVaccinationsTable({
  rows,
  compact = false,
}: UpcomingVaccinationsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sage-600 text-center py-8">
        Keine anstehenden Impfungen im gewählten Zeitraum
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tier</TableHead>
          <TableHead>Kunde</TableHead>
          {!compact && <TableHead>E-Mail</TableHead>}
          <TableHead>Impfart</TableHead>
          {!compact && <TableHead>Letzte Impfung</TableHead>}
          <TableHead>Fällig am</TableHead>
          <TableHead>Tage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.petId}-${row.vaccinationType}`}>
            <TableCell className="font-medium text-sage-900">{row.petName}</TableCell>
            <TableCell>{row.customerName || '—'}</TableCell>
            {!compact && <TableCell>{row.customerEmail || '—'}</TableCell>}
            <TableCell>{getVaccinationTypeLabel(row.vaccinationType)}</TableCell>
            {!compact && (
              <TableCell>
                {row.lastVaccinationDate ? formatDateDE(row.lastVaccinationDate) : '—'}
              </TableCell>
            )}
            <TableCell>{row.dueDate ? formatDateDE(row.dueDate) : '—'}</TableCell>
            <TableCell>{formatDaysUntilDue(row.daysUntilDue)}</TableCell>
            <TableCell>
              <Badge variant="outline" className={getStatusBadgeClass(row.status)}>
                {getUpcomingVaccinationStatusLabel(row.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/admin/customers/${row.customerId}`}>
                <Button variant="outline" size="sm">
                  Kunde
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function UpcomingVaccinationSummaryCards({
  summary,
}: {
  summary: {
    overdue: number
    dueSoon: number
    upcoming: number
    incomplete: number
  }
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">Überfällig</p>
        <p className="text-2xl font-bold text-red-900">{summary.overdue}</p>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-700">In 14 Tagen</p>
        <p className="text-2xl font-bold text-amber-900">{summary.dueSoon}</p>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">Anstehend</p>
        <p className="text-2xl font-bold text-blue-900">{summary.upcoming}</p>
      </div>
      <div className="rounded-lg border border-sage-200 bg-sage-50 p-4">
        <p className="text-sm text-sage-700">Unvollständig</p>
        <p className="text-2xl font-bold text-sage-900">{summary.incomplete}</p>
      </div>
    </div>
  )
}
