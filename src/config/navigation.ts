import {
  Clock,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { researchTools, TOOL_PHASES } from "@/config/tools";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Prefix match (true) or exact match (false) when computing the active item. */
  matchPrefix?: boolean;
  disabled?: boolean;
  badge?: string;
};

export type NavSection = { label: string; items: NavItem[] };
/** `items` is always the flat list; `sections`, when present, is the same items grouped under sub-headings. */
export type NavGroup = { label: string; items: NavItem[]; sections?: NavSection[] };

const toolItem = (tool: (typeof researchTools)[number]): NavItem => ({
  label: tool.name,
  href: `/tools/${tool.slug}`,
  icon: tool.icon,
  matchPrefix: true,
  badge: tool.status === "coming-soon" ? "Soon" : undefined,
});

/** The research tools grouped the way the website groups them: Plan, Research, Understand, Prioritise. */
const toolSections: NavSection[] = TOOL_PHASES.map((phase) => ({
  label: phase,
  items: researchTools.filter((t) => t.phase === phase).map(toolItem),
})).filter((section) => section.items.length > 0);

export const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "My Projects", href: "/projects", icon: FolderKanban, matchPrefix: true },
      { label: "Recent", href: "/recent", icon: Clock },
    ],
  },
  {
    label: "Research tools",
    items: toolSections.flatMap((section) => section.items),
    sections: toolSections,
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
