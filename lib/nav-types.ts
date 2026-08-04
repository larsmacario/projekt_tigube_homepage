import type { LucideIcon } from "lucide-react"

export type NavBadgeKey = "pendingBookings" | "unseenCarePlanChanges"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  badgeKey?: NavBadgeKey
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
