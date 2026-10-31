import {
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { researchTools } from "@/config/tools";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Prefix match (true) or exact match (false) when computing the active item. */
  matchPrefix?: boolean;
  disabled?: boolean;
  badge?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Projects", href: "/projects", icon: FolderKanban, matchPrefix: true },
    ],
  },
  {
    label: "Research tools",
    items: researchTools.map((tool) => ({
      label: tool.name,
      href: `/tools/${tool.slug}`,
      icon: tool.icon,
      matchPrefix: true,
      badge: tool.status === "coming-soon" ? "Soon" : undefined,
    })),
  },
  {
    label: "Resources",
    items: [{ label: "Templates", href: "/templates", icon: LayoutTemplate }],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, matchPrefix: true },
      { label: "Billing", href: "/billing", icon: CreditCard, disabled: true, badge: "Planned" },
    ],
  },
];

export function isActive(item: NavItem, pathname: string) {
  return item.matchPrefix
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : pathname === item.href;
}
