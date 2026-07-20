"use client"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useSidebarPersist } from "@/hooks/use-sidebar-persist"
import { AppSidebar } from "@/components/layout/app-sidebar"
import type { NavItem } from "@/lib/nav-types"

type AppShellProps = {
  title: string
  homeHref: string
  navItems: NavItem[]
  userEmail?: string | null
  onLogout: () => void
  banner?: React.ReactNode
  children: React.ReactNode
}

export function AppShell({
  title,
  homeHref,
  navItems,
  userEmail,
  onLogout,
  banner,
  children,
}: AppShellProps) {
  const { open, setOpen, ready } = useSidebarPersist()

  if (!ready) {
    return (
      <div className="min-h-screen bg-sage-50">
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AppSidebar
        title={title}
        homeHref={homeHref}
        items={navItems}
        userEmail={userEmail}
        onLogout={onLogout}
      />
      <SidebarInset className="bg-sage-50">
        {banner}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-sage-200 bg-white px-4">
          <SidebarTrigger className="text-sage-700" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-sage-800">{title}</span>
        </header>
        <div className="flex-1 overflow-x-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
