import {
  LayoutDashboard,
  UserPlus,
  Users,
  Syringe,
  Megaphone,
  List,
  Euro,
  Calendar,
  Mail,
  FileText,
  Shield,
  Settings,
} from "lucide-react"
import type { NavItem } from "@/lib/nav-types"

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Leads", href: "/admin/leads", icon: UserPlus },
  { label: "Kunden", href: "/admin/customers", icon: Users },
  { label: "Impfungen", href: "/admin/impfungen", icon: Syringe },
  { label: "NewsBar", href: "/admin/newsbar", icon: Megaphone },
  { label: "Eigenschaften", href: "/admin/properties", icon: List },
  { label: "Preise", href: "/admin/prices", icon: Euro },
  { label: "Buchungen", href: "/admin/bookings", icon: Calendar },
  { label: "E-Mails", href: "/admin/newsletter", icon: Mail },
  { label: "CMS", href: "/admin/cms", icon: FileText },
  { label: "Einstellungen", href: "/admin/einstellungen", icon: Settings },
  { label: "Admins", href: "/admin/admins", icon: Shield },
]

export const adminShellConfig = {
  title: "Admin",
  homeHref: "/admin/dashboard",
}
