import {
  Home,
  User,
  PawPrint,
  File,
  Euro,
  Calendar,
} from "lucide-react"
import type { NavItem } from "@/lib/nav-types"

export const portalNavItems: NavItem[] = [
  { label: "Übersicht", href: "/portal", icon: Home, exact: true },
  { label: "Profil", href: "/portal/profile", icon: User },
  { label: "Tiere", href: "/portal/pets", icon: PawPrint },
  { label: "Dokumente", href: "/portal/documents", icon: File },
  { label: "Preise", href: "/portal/prices", icon: Euro },
  { label: "Buchungen", href: "/portal/bookings", icon: Calendar },
]

export const portalShellConfig = {
  title: "Mein Kundenportal",
  homeHref: "/portal",
}
