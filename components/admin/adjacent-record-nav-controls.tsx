'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useAdjacentRecordNav,
  type AdjacentRecordEntityType,
} from '@/hooks/use-adjacent-record-nav'

type AdjacentRecordNavControlsProps = {
  entityType: AdjacentRecordEntityType
  currentId: string
  label: string
}

export function AdjacentRecordNavControls({
  entityType,
  currentId,
  label,
}: AdjacentRecordNavControlsProps) {
  const router = useRouter()
  const { prevId, nextId, currentIndex, total, ready } = useAdjacentRecordNav(
    entityType,
    currentId
  )

  if (!ready || total <= 1 || currentIndex === null) {
    return null
  }

  const basePath = entityType === 'customer' ? '/admin/customers' : '/admin/leads'

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={!prevId}
        aria-label={`Vorheriger ${label}`}
        onClick={() => prevId && router.push(`${basePath}/${prevId}`)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-sage-600 tabular-nums px-1">
        {label} {currentIndex} von {total}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={!nextId}
        aria-label={`Nächster ${label}`}
        onClick={() => nextId && router.push(`${basePath}/${nextId}`)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
