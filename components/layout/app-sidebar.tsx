"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { isNavActive, type NavBadgeKey, type NavItem } from "@/lib/nav-types"

type AppSidebarProps = {
  title: string
  homeHref: string
  items: NavItem[]
  navBadgeValues?: Partial<Record<NavBadgeKey, number>>
  userEmail?: string | null
  onLogout: () => void
}

export function AppSidebar({
  title,
  homeHref,
  items,
  navBadgeValues,
  userEmail,
  onLogout,
}: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const closeMobile = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={title}>
              <Link href={homeHref} onClick={closeMobile}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sage-600 text-white">
                  <span className="text-sm font-bold">{title.charAt(0)}</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sage-900">{title}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname ? isNavActive(pathname, item) : false
                const Icon = item.icon
                const badgeCount =
                  item.badgeKey != null ? navBadgeValues?.[item.badgeKey] : undefined
                const showBadge =
                  typeof badgeCount === "number" && badgeCount > 0

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href} onClick={closeMobile}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {showBadge && (
                      <SidebarMenuBadge className="bg-yellow-100 text-yellow-900">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {userEmail && (
          <p className="truncate px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {userEmail}
          </p>
        )}
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} tooltip="Abmelden">
              <LogOut />
              <span>Abmelden</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
