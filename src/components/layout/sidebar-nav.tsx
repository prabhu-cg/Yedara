"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, isActive, type NavItem } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const itemClasses =
  "group flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Selection is butter, not grey: the current page is the accent tint with ochre text; hover is sand. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const renderItems = (items: NavItem[]) => (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        const content = (
          <>
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                {item.badge}
              </Badge>
            )}
          </>
        );

        return (
          <li key={item.href}>
            {item.disabled ? (
              <span
                aria-disabled="true"
                title={`${item.label} is not available yet`}
                className={cn(itemClasses, "cursor-not-allowed text-muted-foreground opacity-70")}
              >
                {content}
              </span>
            ) : (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  itemClasses,
                  active
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">{group.label}</p>
          {group.sections ? (
            // The research tools, grouped as the website groups them: the order a study usually follows.
            <div className="flex flex-col gap-3">
              {group.sections.map((section) => (
                <div key={section.label} role="group" aria-label={section.label}>
                  <p aria-hidden className="px-3.5 pb-1 text-[11px] font-medium text-muted-foreground/80">{section.label}</p>
                  {renderItems(section.items)}
                </div>
              ))}
            </div>
          ) : (
            renderItems(group.items)
          )}
        </div>
      ))}
    </nav>
  );
}
