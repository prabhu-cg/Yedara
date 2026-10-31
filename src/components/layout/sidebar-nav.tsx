"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups, isActive } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const itemClasses =
  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * The current page is shown by a quiet wash and weight, never an accent tint:
 * the screen already carries the accent on its primary button.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
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
                          ? "bg-foreground/5 font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                      )}
                    >
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
