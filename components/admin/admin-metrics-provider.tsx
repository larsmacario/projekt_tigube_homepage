'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
import type { NavBadgeKey } from '@/lib/nav-types'

type AdminMetricsContextValue = {
  pendingBookingsCount: number | null
  refreshMetrics: () => Promise<void>
  navBadgeValues: Partial<Record<NavBadgeKey, number>>
}

const AdminMetricsContext = createContext<AdminMetricsContextValue | null>(null)

export function AdminMetricsProvider({ children }: { children: ReactNode }) {
  const [pendingBookingsCount, setPendingBookingsCount] = useState<number | null>(null)

  const refreshMetrics = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/admin/metrics')
      if (!response.ok) {
        return
      }
      const data = (await response.json()) as { pendingBookings?: number }
      setPendingBookingsCount(
        typeof data.pendingBookings === 'number' ? data.pendingBookings : 0
      )
    } catch {
      // Navigation bleibt nutzbar ohne Badge
    }
  }, [])

  useEffect(() => {
    void refreshMetrics()
  }, [refreshMetrics])

  const navBadgeValues = useMemo((): Partial<Record<NavBadgeKey, number>> => {
    if (pendingBookingsCount == null || pendingBookingsCount <= 0) {
      return {}
    }
    return { pendingBookings: pendingBookingsCount }
  }, [pendingBookingsCount])

  const value = useMemo(
    () => ({
      pendingBookingsCount,
      refreshMetrics,
      navBadgeValues,
    }),
    [pendingBookingsCount, refreshMetrics, navBadgeValues]
  )

  return (
    <AdminMetricsContext.Provider value={value}>{children}</AdminMetricsContext.Provider>
  )
}

export function useAdminMetrics(): AdminMetricsContextValue {
  const context = useContext(AdminMetricsContext)
  if (!context) {
    throw new Error('useAdminMetrics muss innerhalb von AdminMetricsProvider verwendet werden')
  }
  return context
}
