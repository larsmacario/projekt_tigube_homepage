'use client'

import { AppShell } from '@/components/layout/app-shell'
import { useAdminMetrics } from '@/components/admin/admin-metrics-provider'
import { adminNavItems, adminShellConfig } from '@/lib/admin-nav'

type AdminAppShellProps = {
  userEmail?: string | null
  onLogout: () => void
  children: React.ReactNode
}

export function AdminAppShell({ userEmail, onLogout, children }: AdminAppShellProps) {
  const { navBadgeValues } = useAdminMetrics()

  return (
    <AppShell
      title={adminShellConfig.title}
      homeHref={adminShellConfig.homeHref}
      navItems={adminNavItems}
      navBadgeValues={navBadgeValues}
      userEmail={userEmail}
      onLogout={onLogout}
    >
      {children}
    </AppShell>
  )
}
