'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleAdminCard } from '@/components/admin/collapsible-admin-card'

type AdminSectionProps = {
  title?: ReactNode
  headerActions?: ReactNode
  className?: string
  embedded?: boolean
  defaultExpanded?: boolean
  children: ReactNode
}

export function AdminSection({
  title,
  headerActions,
  className,
  embedded = false,
  defaultExpanded = false,
  children,
}: AdminSectionProps) {
  if (embedded) {
    return (
      <Card className={className}>
        {title || headerActions ? (
          <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
            {title ? (
              typeof title === 'string' ? <CardTitle>{title}</CardTitle> : title
            ) : (
              <div />
            )}
            {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
          </CardHeader>
        ) : null}
        <CardContent className={title || headerActions ? undefined : 'pt-6'}>{children}</CardContent>
      </Card>
    )
  }

  return (
    <CollapsibleAdminCard
      title={title ?? ''}
      headerActions={headerActions}
      className={className}
      defaultExpanded={defaultExpanded}
    >
      {children}
    </CollapsibleAdminCard>
  )
}
