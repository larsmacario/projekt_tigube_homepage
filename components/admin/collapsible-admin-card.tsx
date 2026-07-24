'use client'

import { useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
type CollapsibleAdminCardProps = {
  title: ReactNode
  defaultExpanded?: boolean
  headerActions?: ReactNode
  className?: string
  children: ReactNode
}

export function CollapsibleAdminCard({
  title,
  defaultExpanded = false,
  headerActions,
  className,
  children,
}: CollapsibleAdminCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <Card className={className}>
      <CardHeader
        className="flex flex-row items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-sage-500" />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-sage-500" />
          )}
          {typeof title === 'string' ? <CardTitle>{title}</CardTitle> : title}
        </div>
        {expanded && headerActions ? (
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerActions}
          </div>
        ) : null}
      </CardHeader>
      {expanded ? <CardContent>{children}</CardContent> : null}
    </Card>
  )
}
